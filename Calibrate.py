"""
calibrate.py — Temperature Scaling for VaidyaVision
═══════════════════════════════════════════════════════════════════════════════
Run this ONCE after training is complete.

What it does:
  EfficientNetB0 tends to output over-confident softmax probabilities.
  Temperature scaling divides the log-probabilities by a value T before
  re-normalising. T > 1 spreads the distribution (more honest confidence).
  T = 1 is the original model output (unchanged).
  T < 1 sharpens it — we never allow this because it makes overconfidence worse.

  This script finds the best T by minimising Negative Log-Likelihood on a
  small held-out slice of your validation images. It then enforces a floor
  of T=1.2 so the model can only become MORE honest, never less.

Output:
  C:\\DIP_PBL\\models\\temperature.json  ← backend reads this automatically

Usage:
  python calibrate.py

Tip:
  If you have a folder of genuinely unseen test images, point
  EXTRA_TEST_DIR at it for the most accurate calibration result.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import numpy as np
import cv2
import tensorflow as tf
from scipy.optimize import minimize_scalar

# ══════════════════════════════════════════════════════════════════════════════
# CONFIG — edit these paths if your layout differs
# ══════════════════════════════════════════════════════════════════════════════
MODEL_PATH    = r"C:\DIP_PBL\models\vaidyavision_v2.keras"
PROCESSED_DIR = r"C:\DIP_PBL\Images_processed"   # used for validation images
MODELS_DIR    = r"C:\DIP_PBL\models"

# Optional: point this at a folder of UNSEEN images for better calibration.
# Structure: same as PROCESSED_DIR (subfolders named after each species).
# Leave as None to skip and fall back to the processed folder.
EXTRA_TEST_DIR = None

CLASS_NAMES  = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']
IMG_SIZE     = 224
VAL_FRACTION = 0.20    # fraction of processed images used as validation
SAMPLE_LIMIT = 50      # max images per class (keeps runtime fast)

# Temperature constraints — NEVER go below T_MIN.
# A T below 1.0 would sharpen already-overconfident predictions.
T_MIN = 1.2
T_MAX = 5.0

# ══════════════════════════════════════════════════════════════════════════════
# PREPROCESSING — must match train.py exactly
# ══════════════════════════════════════════════════════════════════════════════

def preprocess(img_bgr):
    img = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    img = cv2.medianBlur(img, 3)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge([l, a, b])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img.astype(np.uint8)


def load_images_from_dir(root_dir, fraction, sample_limit, label="val"):
    """
    Load images from a processed-style folder tree.
    Takes the LAST `fraction` of sorted files per class as the held-out set.
    """
    images, labels = [], []
    for class_idx, class_name in enumerate(CLASS_NAMES):
        folder = os.path.join(root_dir, class_name)
        if not os.path.exists(folder):
            print(f"  WARNING: {folder} not found — skipping {class_name}")
            continue

        files = sorted([
            f for f in os.listdir(folder)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))
        ])

        if fraction < 1.0:
            n_take = max(1, int(len(files) * fraction))
            files  = files[-n_take:]          # last N% — least likely to be in train set
        files = files[:sample_limit]

        loaded = 0
        for fname in files:
            img = cv2.imread(os.path.join(folder, fname))
            if img is None:
                continue
            images.append(preprocess(img))
            labels.append(class_idx)
            loaded += 1

        print(f"  {class_name:15s}: {loaded} {label} images")

    return np.array(images, dtype=np.uint8), np.array(labels, dtype=np.int32)


# ══════════════════════════════════════════════════════════════════════════════
# CALIBRATION MATH
# ══════════════════════════════════════════════════════════════════════════════

def apply_temperature(probs: np.ndarray, T: float) -> np.ndarray:
    """
    Scale probabilities by temperature T.
    Works on a 2-D array (N × C) or 1-D array (C,).
    """
    log_p  = np.log(probs + 1e-10)
    scaled = log_p / T
    scaled -= scaled.max(axis=-1, keepdims=True)   # numerical stability
    exp_s  = np.exp(scaled)
    return exp_s / exp_s.sum(axis=-1, keepdims=True)


def nll(T: float, probs: np.ndarray, labels: np.ndarray) -> float:
    """Negative log-likelihood — the loss we minimise."""
    scaled = apply_temperature(probs, T)
    return float(-np.mean(np.log(scaled[np.arange(len(labels)), labels] + 1e-10)))


def ece(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
    """Expected Calibration Error — lower is better calibrated."""
    confs = probs.max(axis=1)
    preds = probs.argmax(axis=1)
    ok    = (preds == labels).astype(float)
    error = 0.0
    for i in range(n_bins):
        lo, hi = i / n_bins, (i + 1) / n_bins
        mask = (confs > lo) & (confs <= hi)
        if mask.sum() > 0:
            error += mask.sum() * abs(ok[mask].mean() - confs[mask].mean()) / len(labels)
    return float(error)


def find_temperature(probs: np.ndarray, labels: np.ndarray) -> float:
    """
    Find optimal T in [T_MIN, T_MAX].
    The search is bounded from below at T_MIN so we can NEVER make the
    model more confident than it already is.
    """
    result = minimize_scalar(
        lambda T: nll(T, probs, labels),
        bounds=(T_MIN, T_MAX),
        method='bounded',
    )
    return float(result.x)


# ══════════════════════════════════════════════════════════════════════════════
# REPORTING
# ══════════════════════════════════════════════════════════════════════════════

def print_stats(label: str, probs: np.ndarray, labels: np.ndarray):
    acc  = (probs.argmax(axis=1) == labels).mean()
    conf = probs.max(axis=1).mean()
    e    = ece(probs, labels)
    gap  = conf - acc   # positive = overconfident
    print(f"  Accuracy        : {acc*100:.1f}%")
    print(f"  Avg confidence  : {conf*100:.1f}%")
    print(f"  Confidence gap  : {gap*100:+.1f}%  "
          f"({'overconfident — T scaling will help' if gap > 0.02 else 'well aligned'})")
    print(f"  ECE             : {e:.4f}  (lower = better)")


def per_class_report(probs: np.ndarray, labels: np.ndarray):
    print("\n  Per-class confidence after calibration:")
    for i, name in enumerate(CLASS_NAMES):
        mask = labels == i
        if mask.sum() == 0:
            continue
        cls_probs = probs[mask]
        cls_acc   = (cls_probs.argmax(axis=1) == i).mean()
        cls_conf  = cls_probs.max(axis=1).mean()
        flag      = " ← check" if abs(cls_conf - cls_acc) > 0.12 else ""
        print(f"    {name:15s}  acc={cls_acc*100:.0f}%  conf={cls_conf*100:.0f}%{flag}")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    SEP = "=" * 62
    print(SEP)
    print("  VaidyaVision — Temperature Scaling Calibration")
    print(SEP)

    # ── Load model ────────────────────────────────────────────────────────────
    print(f"\nLoading model from:\n  {MODEL_PATH}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}\n"
            "Run train.py first, or update MODEL_PATH in this script."
        )
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded OK.\n")

    # ── Load images ───────────────────────────────────────────────────────────
    if EXTRA_TEST_DIR and os.path.exists(EXTRA_TEST_DIR):
        print(f"Loading UNSEEN test images from:\n  {EXTRA_TEST_DIR}")
        images, labels = load_images_from_dir(EXTRA_TEST_DIR, fraction=1.0,
                                               sample_limit=SAMPLE_LIMIT * 2,
                                               label="test")
        source_note = "unseen test images (best calibration quality)"
    else:
        print(f"Loading validation images from:\n  {PROCESSED_DIR}")
        print(f"  (last {int(VAL_FRACTION*100)}% of each class, max {SAMPLE_LIMIT}/class)")
        print()
        images, labels = load_images_from_dir(PROCESSED_DIR, fraction=VAL_FRACTION,
                                               sample_limit=SAMPLE_LIMIT,
                                               label="val")
        source_note = "validation slice of processed images"

    if len(images) == 0:
        raise RuntimeError(
            "No images loaded. Check that Images_processed exists and has "
            "subfolders named after each species."
        )

    print(f"\nTotal images loaded: {len(images)}  (source: {source_note})")

    # ── Run predictions ───────────────────────────────────────────────────────
    print("\nRunning inference...")
    raw_probs = model.predict(
        images.astype(np.float32), batch_size=16, verbose=1
    )

    # ── Before stats ─────────────────────────────────────────────────────────
    print(f"\n{'─'*40}")
    print("BEFORE calibration  (T = 1.0 — raw model output):")
    print_stats("before", raw_probs, labels)

    # ── Find optimal T (constrained to [T_MIN, T_MAX]) ────────────────────────
    print(f"\nSearching for optimal T in [{T_MIN}, {T_MAX}]...")
    optimal_T   = find_temperature(raw_probs, labels)
    cal_probs   = apply_temperature(raw_probs, optimal_T)

    print(f"\n{'─'*40}")
    print(f"AFTER  calibration  (T = {optimal_T:.3f}):")
    print_stats("after", cal_probs, labels)
    per_class_report(cal_probs, labels)

    # ── Accuracy safety check ─────────────────────────────────────────────────
    orig_acc = (raw_probs.argmax(axis=1) == labels).mean()
    cal_acc  = (cal_probs.argmax(axis=1) == labels).mean()
    acc_drop = orig_acc - cal_acc

    if acc_drop > 0.02:
        # Temperature moved predictions enough to flip some borderline cases.
        # Cap at T_MIN to be safe.
        print(f"\n  Accuracy dropped {acc_drop*100:.1f}% after scaling.")
        print(f"  Capping T at T_MIN = {T_MIN} to protect accuracy.")
        optimal_T = T_MIN
        cal_probs = apply_temperature(raw_probs, optimal_T)
    else:
        print(f"\n  Accuracy unchanged ({orig_acc*100:.1f}% → {cal_acc*100:.1f}%) — T is safe.")

    # ── Write output ─────────────────────────────────────────────────────────
    orig_conf = float(raw_probs.max(axis=1).mean())
    cal_conf  = float(apply_temperature(raw_probs, optimal_T).max(axis=1).mean())

    out_path = os.path.join(MODELS_DIR, 'temperature.json')
    with open(out_path, 'w') as f:
        json.dump({
            'temperature':         float(optimal_T),
            'avg_conf_before_pct': float(round(orig_conf * 100, 1)),
            'avg_conf_after_pct':  float(round(cal_conf  * 100, 1)),
            'accuracy_before':     float(round(orig_acc,  4)),
            'accuracy_after':      float(round(cal_acc,   4)),
            'ece_before':          float(round(ece(raw_probs, labels), 4)),
            'ece_after':           float(round(ece(cal_probs, labels), 4)),
            'source':              source_note,
            'n_samples':           int(len(images)),
        }, f, indent=2)

    print(f"\n{'─'*40}")
    print(f"Saved → {out_path}")
    print(f"\nSUMMARY")
    print(f"  Temperature     : {optimal_T:.3f}")
    print(f"  Avg confidence  : {orig_conf*100:.0f}%  →  {cal_conf*100:.0f}%")
    print(f"  Accuracy        : {orig_acc*100:.1f}%  →  {cal_acc*100:.1f}%  (should be the same)")
    print(f"\nRestart your backend — it loads temperature.json automatically.")
    print(SEP)