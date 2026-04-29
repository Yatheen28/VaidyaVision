"""
VaidyaVision Backend — main.py  (Final Production Version)
═══════════════════════════════════════════════════════════════════════════════
Changes from previous versions:
  - ClassicalPredictor + all DIP feature extractors are COPIED DIRECTLY here
    → no sys.path hacks, no import failures, no NaN from broken imports
  - /predict runs DL + classical together, returns ONE fused_score everywhere
  - fuse_verdict() is the single source of truth for all scores
  - Entropy penalty reduces overconfidence on unseen leaves
  - 5 verdict states: AUTHENTIC / ADULTERATED / SUSPICIOUS / VERIFY / UNKNOWN
  - Authenticate.jsx response shape documented at the bottom
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import base64
import json
import pickle
import numpy as np
import cv2
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR  = os.path.join(BASE_DIR, '..', 'models')
MODEL_PATH  = os.path.join(MODELS_DIR, 'vaidyavision_v2.keras')
SVM_PATH    = os.path.join(MODELS_DIR, 'svm_all_combined.pkl')
REFS_PATH   = os.path.join(MODELS_DIR, 'reference_paths.json')
SVM_RES_PATH = os.path.join(MODELS_DIR, 'svm_results.json')

CLASS_NAMES = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']
IMG_SIZE    = 224

# Thresholds — conservative to reduce overconfidence on unseen leaves
DL_HIGH    = 0.82   # DL confidence above this = high confidence
DL_LOW     = 0.60   # DL confidence below this = uncertain
FUSED_AUTH = 0.72   # fused score above this = AUTHENTIC
FUSED_UNKN = 0.45   # fused score below this = UNKNOWN

SPECIES_INFO = {
    'Amla':        {'uses': 'Rich in Vitamin C, immunity booster, hair and digestion health',
                    'adulterants': 'Tamarind leaves (similar pinnate structure)',
                    'ayush': 'Core ingredient in Chyawanprash and Triphala'},
    'Ashwagandha': {'uses': 'Stress relief, energy, anti-inflammatory, testosterone support',
                    'adulterants': 'Withania coagulans (nearly identical leaf shape)',
                    'ayush': 'Most important adaptogen in Ayurvedic medicine'},
    'Bhrami':      {'uses': 'Memory, anxiety relief, cognitive function, sleep aid',
                    'adulterants': 'Gotu Kola / Mandukaparni (commonly substituted)',
                    'ayush': 'Primary herb in Ayurvedic brain tonics'},
    'Curry':       {'uses': 'Digestive aid, blood sugar, hair growth, antioxidant',
                    'adulterants': 'Neem leaves (very similar pinnate leaflets)',
                    'ayush': 'South Indian traditional medicine staple'},
    'Neem':        {'uses': 'Antibacterial, antifungal, blood purifier, dental health',
                    'adulterants': 'Curry leaf (frequently sold as neem)',
                    'ayush': "Called 'village pharmacy' in Ayurveda"},
    'Tulsi':       {'uses': 'Immunity, respiratory health, stress, sacred plant',
                    'adulterants': 'Other Ocimum varieties (identical appearance)',
                    'ayush': 'Sacred plant and cornerstone of Ayurvedic medicine'},
}

# ══════════════════════════════════════════════════════════════════════════════
# CLASSICAL DIP FEATURE EXTRACTORS — copied directly from classical_pipeline.py
# (No import needed — avoids all path/dependency issues)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_color_features(img_bgr):
    """Feature Set A: HSV histogram. Technique 7. Returns 96-dim vector."""
    img = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    features = []
    for channel, max_val in zip(range(3), [180, 256, 256]):
        hist = cv2.calcHist([hsv], [channel], None, [32], [0, max_val])
        hist = hist.flatten() / (hist.sum() + 1e-7)
        features.extend(hist.tolist())
    return np.array(features, dtype=np.float32)  # 96-dim


def _extract_texture_features(img_bgr):
    """Feature Set B: GLCM-style texture. Techniques 2, 5. Returns 20-dim vector."""
    img  = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 3)                        # T5: noise removal
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)                           # T2: CLAHE
    features = []
    features.append(float(np.mean(enhanced)))
    features.append(float(np.std(enhanced)))
    features.append(float(np.var(enhanced)))
    for ksize in [3, 7, 15]:
        mean_f  = cv2.blur(enhanced.astype(np.float32), (ksize, ksize))
        mean_sq = cv2.blur((enhanced.astype(np.float32))**2, (ksize, ksize))
        local_var = mean_sq - mean_f**2
        features.append(float(np.mean(local_var)))
        features.append(float(np.std(local_var)))
    gray_f = enhanced.astype(np.float32)
    features.extend([
        np.abs(np.diff(gray_f, axis=1)).mean(),
        np.abs(np.diff(gray_f, axis=0)).mean(),
        np.abs(gray_f[1:, 1:] - gray_f[:-1, :-1]).mean(),
        np.abs(gray_f[1:, :-1] - gray_f[:-1, 1:]).mean(),
    ])
    gx = cv2.Sobel(enhanced, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(enhanced, cv2.CV_64F, 0, 1, ksize=3)
    mag = np.sqrt(gx**2 + gy**2)
    features.extend([float(np.mean(mag)), float(np.std(mag)),
                     float(np.percentile(mag, 75)), float(np.percentile(mag, 90))])
    return np.array(features, dtype=np.float32)  # 20-dim


def _extract_vein_shape_features(img_bgr):
    """Feature Set C: Shape/vein. Techniques 3, 5, 6. Returns 18-dim vector."""
    img  = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 3)                            # T5
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)              # T3
    edges   = cv2.Canny(blurred, 40, 120)                    # T3
    kernel  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dilated = cv2.dilate(edges,   kernel, iterations=1)      # T6
    eroded  = cv2.erode(edges,    kernel, iterations=1)      # T6
    opened  = cv2.morphologyEx(edges, cv2.MORPH_OPEN,  kernel)  # T6
    closed  = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)  # T6
    total_px = IMG_SIZE * IMG_SIZE
    features = []
    features.append(float(np.sum(edges  > 0)) / total_px)
    features.append(float(np.sum(closed > 0)) / total_px)
    features.append(float(np.sum(opened > 0)) / total_px)
    features.append(float(np.sum(dilated > 0) - np.sum(eroded > 0)) / total_px)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        areas  = [cv2.contourArea(c) for c in contours]
        features.append(float(len(contours)))
        features.append(float(np.mean(areas)))
        features.append(float(np.std(areas)))
        features.append(float(np.max(areas)) / total_px)
        largest = max(contours, key=cv2.contourArea)
        area  = cv2.contourArea(largest)
        perim = cv2.arcLength(largest, True)
        circ  = (4 * np.pi * area / (perim**2)) if perim > 0 else 0
        features.append(float(circ))
        x, y, w, h = cv2.boundingRect(largest)
        features.append(float(w) / max(h, 1))
        features.append(float(area) / max(w * h, 1))
    else:
        features.extend([0.0] * 7)
    moments = cv2.moments(closed)
    hu = cv2.HuMoments(moments).flatten()
    hu_log = [-np.sign(hv) * np.log10(abs(hv) + 1e-10) for hv in hu[:5]]
    features.extend(hu_log)
    return np.array(features, dtype=np.float32)  # 18-dim


def _extract_all_features(img_bgr):
    return np.concatenate([
        _extract_color_features(img_bgr),
        _extract_texture_features(img_bgr),
        _extract_vein_shape_features(img_bgr),
    ])


def _make_vis(img_bgr):
    """Generate edge/vein/clahe visualisation images."""
    img  = cv2.resize(img_bgr, (224, 224))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 3)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, 40, 120)
    kernel  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed  = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    clahe   = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return edges, closed, enhanced


# ══════════════════════════════════════════════════════════════════════════════
# LOAD MODELS AT STARTUP
# ══════════════════════════════════════════════════════════════════════════════

print(f"[VaidyaVision] Loading DL model: {os.path.abspath(MODEL_PATH)}")
dl_model = tf.keras.models.load_model(MODEL_PATH)
print("[VaidyaVision] EfficientNetB0 loaded OK")

# Load SVM (optional — classical comparison disabled if not found)
_svm_bundle = None
if os.path.exists(SVM_PATH):
    with open(SVM_PATH, 'rb') as f:
        _svm_bundle = pickle.load(f)   # dict with keys: svm, scaler
    print("[VaidyaVision] Classical SVM loaded OK")
else:
    print("[VaidyaVision] WARNING: svm_all_combined.pkl not found — run classical_pipeline.py")

# Load reference image paths
reference_paths = {}
if os.path.exists(REFS_PATH):
    with open(REFS_PATH) as f:
        reference_paths = json.load(f)
    print(f"[VaidyaVision] Reference images: {list(reference_paths.keys())}")
else:
    print("[VaidyaVision] WARNING: reference_paths.json not found — run classical_pipeline.py")

# Load SVM comparison table results
svm_results = {}
if os.path.exists(SVM_RES_PATH):
    with open(SVM_RES_PATH) as f:
        svm_results = json.load(f)

# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="VaidyaVision API", version="4.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def decode_image(file_bytes: bytes):
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Cannot decode image — check file format")
    return img


def img_to_b64(img) -> str:
    _, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return base64.b64encode(buf).decode('utf-8')


def remove_background_grabcut(img_bgr):
    """
    GrabCut background removal.
    Faculty suggestion: remove red/marble backgrounds before classification.
    """
    mask     = np.zeros(img_bgr.shape[:2], np.uint8)
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    h, w     = img_bgr.shape[:2]
    rect     = (int(w*0.05), int(h*0.05), int(w*0.90), int(h*0.90))
    try:
        cv2.grabCut(img_bgr, mask, rect, bg_model, fg_model, 7, cv2.GC_INIT_WITH_RECT)
        fg_mask = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        kernel  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        result  = img_bgr.copy()
        result[fg_mask == 0] = [255, 255, 255]
        return result
    except Exception:
        return img_bgr   # graceful fallback — never crash on grabcut failure


def dip_preprocess(img_bgr, remove_bg=False):
    """
    Matches train.py pipeline exactly.
    T5: Median blur | T7: BGR→LAB | T2: CLAHE on L channel
    EfficientNet's preprocess_input is inside the model — do NOT rescale here.
    """
    if remove_bg:
        img_bgr = remove_background_grabcut(img_bgr)
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


def run_dl_model(img_rgb_uint8):
    """Returns (species_str, confidence_float, all_probs_dict)."""
    batch = np.expand_dims(img_rgb_uint8.astype(np.float32), axis=0)
    probs = dl_model.predict(batch, verbose=0)[0]
    idx   = int(np.argmax(probs))
    return (
        CLASS_NAMES[idx],
        float(probs[idx]),
        {n: round(float(probs[i]), 4) for i, n in enumerate(CLASS_NAMES)},
    )


def run_classical_compare(suspect_bgr, reference_bgr) -> Optional[dict]:
    """
    Extract DIP features from both images and return comparison dict.
    Returns None if SVM not loaded.
    """
    if _svm_bundle is None:
        return None

    s_color   = _extract_color_features(suspect_bgr)
    r_color   = _extract_color_features(reference_bgr)
    s_texture = _extract_texture_features(suspect_bgr)
    r_texture = _extract_texture_features(reference_bgr)
    s_vein    = _extract_vein_shape_features(suspect_bgr)
    r_vein    = _extract_vein_shape_features(reference_bgr)

    def cosine_sim(a, b):
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 0 else 0.0

    def hist_intersection(a, b):
        return float(np.sum(np.minimum(a, b)))

    color_sim   = hist_intersection(s_color[:32], r_color[:32])
    texture_sim = cosine_sim(s_texture, r_texture)
    vein_sim    = cosine_sim(s_vein[:4], r_vein[:4])
    overall     = color_sim * 0.35 + texture_sim * 0.35 + vein_sim * 0.30

    # Visualisation images
    s_edges, s_veins, s_enhanced = _make_vis(suspect_bgr)
    r_edges, r_veins, r_enhanced = _make_vis(reference_bgr)

    def to_b64(arr):
        _, buf = cv2.imencode('.jpg', arr)
        return base64.b64encode(buf).decode('utf-8')

    if overall >= 0.75:
        verdict_text = "High similarity — DIP features closely match the genuine reference."
    elif overall >= 0.55:
        verdict_text = "Moderate similarity — some features differ. Possible variation or adulteration."
    else:
        verdict_text = "Low similarity — significant feature mismatch. Adulteration likely."

    return {
        'color_similarity':   round(color_sim,   4),
        'texture_similarity': round(texture_sim, 4),
        'vein_similarity':    round(vein_sim,    4),
        'overall_similarity': round(overall,     4),
        'color_similarity_pct':   round(color_sim   * 100, 1),
        'texture_similarity_pct': round(texture_sim * 100, 1),
        'vein_similarity_pct':    round(vein_sim    * 100, 1),
        'overall_similarity_pct': round(overall     * 100, 1),
        'verdict': verdict_text,
        'suspect_edges_b64':    to_b64(s_edges),
        'suspect_veins_b64':    to_b64(s_veins),
        'suspect_clahe_b64':    to_b64(s_enhanced),
        'reference_edges_b64':  to_b64(r_edges),
        'reference_veins_b64':  to_b64(r_veins),
        'reference_clahe_b64':  to_b64(r_enhanced),
    }


def compute_entropy(all_probs: dict) -> float:
    """Shannon entropy — high = uncertain across many classes."""
    probs = np.array(list(all_probs.values())) + 1e-10
    return float(-np.sum(probs * np.log(probs)))


def fuse_verdict(
    dl_species:   str,
    dl_conf:      float,
    dl_probs:     dict,
    selected:     Optional[str],
    classical_sim: Optional[float],
) -> dict:
    """
    SINGLE SOURCE OF TRUTH for the authentication decision.
    The fused_score returned here is the ONLY score the UI should display.

    Logic:
      - If selected species is given, we check whether the leaf IS that species
      - Entropy penalty reduces the score when the model is spread across classes
      - Classical similarity (if available) is fused in at 40% weight
    """
    target      = selected if selected else dl_species
    target_conf = dl_probs.get(target, 0.0)

    # Entropy penalty — punishes spread-out probability distributions
    entropy         = compute_entropy(dl_probs)
    entropy_penalty = min(entropy / 1.79, 1.0)   # max entropy for 6 classes ≈ ln(6)
    dl_score        = target_conf * (1.0 - 0.20 * entropy_penalty)

    # Fuse with classical similarity if available
    if classical_sim is not None:
        fused_score = round(dl_score * 0.60 + classical_sim * 0.40, 4)
    else:
        fused_score = round(dl_score, 4)

    dl_matches_target = (dl_species == target)

    # ── Decision logic ──────────────────────────────────────────────────────
    if fused_score >= FUSED_AUTH and dl_matches_target:
        status     = "AUTHENTIC"
        short_msg  = f"Genuine {target} leaf confirmed"
        detail_msg = (
            f"The AI model identified this as {dl_species} with "
            f"{dl_conf*100:.1f}% confidence"
            + (f", supported by {classical_sim*100:.0f}% classical DIP similarity to the reference leaf."
               if classical_sim is not None else ".")
        )
        color = "green"

    elif fused_score >= FUSED_AUTH and not dl_matches_target and selected:
        # High confidence — but it's the WRONG species
        status     = "ADULTERATED"
        short_msg  = f"Not a genuine {target} leaf"
        detail_msg = (
            f"The leaf appears to be {dl_species} ({dl_conf*100:.1f}% confidence), "
            f"not {target}. This indicates possible substitution or adulteration."
        )
        color = "red"

    elif fused_score < FUSED_UNKN:
        status     = "UNKNOWN"
        short_msg  = "Cannot identify this leaf"
        detail_msg = (
            "The system cannot confidently identify this leaf. "
            "The image may be unclear, the leaf may be damaged, "
            "or it may not belong to any of the six supported species."
        )
        color = "gray"

    elif classical_sim is not None and abs(dl_score - classical_sim) > 0.25:
        # AI and classical disagree significantly — flag for manual review
        status     = "VERIFY"
        short_msg  = "Manual verification recommended"
        detail_msg = (
            f"The AI model and classical DIP analysis give inconsistent results. "
            f"AI confidence: {dl_conf*100:.1f}%, "
            f"Classical similarity: {classical_sim*100:.0f}%. "
            "Expert verification is recommended before use."
        )
        color = "yellow"

    else:
        status     = "SUSPICIOUS"
        short_msg  = "Low confidence — proceed with caution"
        detail_msg = (
            f"The system tentatively identifies this as {dl_species} "
            f"({dl_conf*100:.1f}% confidence), but the score is below the authentication threshold. "
            "Use a clearer, well-lit image or consult an expert."
        )
        color = "orange"

    return {
        "status":          status,
        "short_msg":       short_msg,
        "detail_msg":      detail_msg,
        "color":           color,
        "fused_score":     fused_score,
        "fused_score_pct": round(fused_score * 100, 1),
        "is_authentic":    status == "AUTHENTIC",
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: MAIN AUTHENTICATION  ← primary endpoint
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/predict")
async def predict(
    image:            UploadFile = File(...),
    selected_species: Optional[str] = Form(None),
    remove_bg:        bool = Form(False),
):
    """
    Main authentication endpoint.

    Response shape (Authenticate.jsx uses these fields):
    {
      "verdict": {
        "status":          "AUTHENTIC" | "ADULTERATED" | "SUSPICIOUS" | "VERIFY" | "UNKNOWN",
        "short_msg":       str,
        "detail_msg":      str,
        "color":           "green" | "red" | "orange" | "yellow" | "gray",
        "fused_score":     float (0-1),
        "fused_score_pct": float (0-100),
        "is_authentic":    bool,
      },
      "dl": {
        "species":         str,
        "confidence":      float,
        "confidence_pct":  float,
        "all_probs":       { "Amla": float, ... },
      },
      "classical": {            ← null if SVM not available or no reference image
        "color_similarity_pct":   float,
        "texture_similarity_pct": float,
        "vein_similarity_pct":    float,
        "overall_similarity_pct": float,
        "verdict":                str,
        "suspect_edges_b64":      str,
        "suspect_veins_b64":      str,
        "suspect_clahe_b64":      str,
        "reference_edges_b64":    str,
        "reference_veins_b64":    str,
        "reference_clahe_b64":    str,
      } | null,
      "selected_species":  str | null,
      "target_species":    str,
      "species_info":      { "uses": str, "adulterants": str, "ayush": str },
    }
    """
    try:
        contents = await image.read()
        img_bgr  = decode_image(contents)
    except Exception as e:
        raise HTTPException(400, detail=f"Invalid image: {e}")

    if selected_species and selected_species not in CLASS_NAMES:
        raise HTTPException(400, detail=f"Unknown species. Choose from: {CLASS_NAMES}")

    # ── Step 1: DL prediction ─────────────────────────────────────────────────
    preprocessed               = dip_preprocess(img_bgr, remove_bg=remove_bg)
    dl_species, dl_conf, all_probs = run_dl_model(preprocessed)

    # ── Step 2: Classical comparison (if SVM + reference available) ───────────
    classical_result = None
    classical_sim    = None
    target_species   = selected_species or dl_species

    if _svm_bundle is not None and target_species in reference_paths:
        ref_path = reference_paths[target_species]
        if os.path.exists(ref_path):
            ref_bgr = cv2.imread(ref_path)
            if ref_bgr is not None:
                # Always remove background from suspect before classical compare
                upl_clean        = remove_background_grabcut(img_bgr)
                classical_result = run_classical_compare(upl_clean, ref_bgr)
                if classical_result:
                    classical_sim = classical_result['overall_similarity']

    # ── Step 3: Fuse into single verdict ──────────────────────────────────────
    verdict = fuse_verdict(dl_species, dl_conf, all_probs, selected_species, classical_sim)

    return {
        "verdict":          verdict,
        "dl": {
            "species":        dl_species,
            "confidence":     round(dl_conf, 4),
            "confidence_pct": round(dl_conf * 100, 1),
            "all_probs":      all_probs,
        },
        "classical":        classical_result,
        "selected_species": selected_species,
        "target_species":   target_species,
        "species_info":     SPECIES_INFO.get(target_species, {}),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: BACKGROUND REMOVAL PREVIEW
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/remove-background")
async def remove_bg_preview(image: UploadFile = File(...)):
    """Preview GrabCut background removal before full analysis."""
    try:
        contents = await image.read()
        img_bgr  = decode_image(contents)
    except Exception as e:
        raise HTTPException(400, detail=str(e))
    removed = remove_background_grabcut(img_bgr)
    return {
        "original_b64":   img_to_b64(img_bgr),
        "bg_removed_b64": img_to_b64(removed),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: SYSTEM A vs SYSTEM B COMPARISON TABLE
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/comparison-results")
async def comparison_results():
    """
    Returns System A (SVM) vs System B (DL) comparison table.
    Used by the frontend presentation slide.
    """
    if not svm_results:
        return {
            "available": False,
            "message":   "Run classical_pipeline.py first to generate SVM results.",
        }
    system_a = [
        {
            "name":         f"System A — {k}",
            "accuracy_pct": round(v["accuracy_pct"], 1),
            "description":  "Classical DIP feature extraction + SVM",
        }
        for k, v in svm_results.items()
    ]
    return {
        "available":  True,
        "system_a":   system_a,
        "system_b": {
            "name":         "System B — Deep Learning (EfficientNetB0)",
            "accuracy_pct": 87.2,
            "description":  "Transfer learning on ImageNet pretrained weights",
        },
        "winner":     "System B",
        "conclusion": (
            "Deep learning with transfer learning outperforms classical DIP+SVM, "
            "but classical features provide interpretable verification as a second layer."
        ),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: BULK DETECTION — DIP-based leaf localisation (no YOLO)
# ══════════════════════════════════════════════════════════════════════════════

def _detect_leaves_dip(img_bgr):
    """
    Find individual leaves using:
    T7: HSV masking | T3: Gaussian blur | T6: Morphological ops | Distance transform
    """
    h, w = img_bgr.shape[:2]
    hsv  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([20, 25, 25]), np.array([95, 255, 255]))
    mask = cv2.GaussianBlur(mask, (9, 9), 0)
    _, mask = cv2.threshold(mask, 50, 255, cv2.THRESH_BINARY)
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    k_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (12, 12))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k_close)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k_open)
    dist      = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    dist_norm = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, sure_fg = cv2.threshold(dist_norm, 0.4 * dist_norm.max(), 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(sure_fg.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bboxes = []
    for c in contours:
        if cv2.contourArea(c) < (h * w * 0.008):
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        pad = 20
        bboxes.append((max(0, x-pad), max(0, y-pad), min(w, x+bw+pad), min(h, y+bh+pad)))
    return bboxes if bboxes else [(0, 0, w, h)]


@app.post("/bulk-predict")
async def bulk_predict(image: UploadFile = File(...)):
    """
    Detect and classify individual leaves in a multi-leaf image.
    Uses DIP-based detection — no YOLO required.
    """
    try:
        contents = await image.read()
        img_bgr  = decode_image(contents)
    except Exception as e:
        raise HTTPException(400, detail=str(e))

    bboxes     = _detect_leaves_dip(img_bgr)
    detections = []

    for i, (x1, y1, x2, y2) in enumerate(bboxes):
        crop = img_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        preprocessed              = dip_preprocess(crop, remove_bg=True)
        dl_species, dl_conf, all_probs = run_dl_model(preprocessed)
        # Simple threshold for bulk mode — no classical per leaf (too slow)
        verdict = fuse_verdict(dl_species, dl_conf, all_probs, None, None)
        detections.append({
            "id":              i + 1,
            "bbox":            [int(x1), int(y1), int(x2), int(y2)],
            "species":         dl_species,
            "confidence_pct":  round(dl_conf * 100, 1),
            "fused_score_pct": verdict["fused_score_pct"],
            "status":          verdict["status"],
            "is_authentic":    verdict["is_authentic"],
            "short_msg":       verdict["short_msg"],
        })

    img_draw = img_bgr.copy()
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = (0, 200, 0) if det["is_authentic"] else (0, 50, 255)
        cv2.rectangle(img_draw, (x1, y1), (x2, y2), color, 3)
        label = f"{det['species']} {det['fused_score_pct']}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
        cv2.rectangle(img_draw, (x1, y1-th-12), (x1+tw+10, y1), color, -1)
        cv2.putText(img_draw, label, (x1+5, y1-6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    auth_count = sum(1 for d in detections if d["is_authentic"])
    return {
        "detections":          detections,
        "annotated_image_b64": img_to_b64(img_draw),
        "summary": {
            "total":       len(detections),
            "authenticated": auth_count,
            "suspicious":  len(detections) - auth_count,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status":                "ok",
        "version":               "4.0.0",
        "dl_model":              "vaidyavision_v2.keras (EfficientNetB0, 87.2% acc)",
        "classical_available":   _svm_bundle is not None,
        "references_available":  bool(reference_paths),
        "species":               CLASS_NAMES,
        "endpoints": [
            "POST /predict          — main authentication (DL + classical fused)",
            "POST /remove-background — GrabCut preview",
            "GET  /comparison-results — System A vs B table",
            "POST /bulk-predict     — multi-leaf detection",
            "GET  /health",
        ],
    }


# ══════════════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)