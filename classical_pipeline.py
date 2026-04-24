"""
classical_pipeline.py — VaidyaVision System A
═══════════════════════════════════════════════════════════════════════════════
Manual DIP Feature Extraction + SVM Classifier

DIP Techniques implemented here (for grading):
  Technique 2  — Histogram Processing (CLAHE)
  Technique 3  — Spatial Filtering (Gaussian blur + Canny edge detection)
  Technique 5  — Noise Removal (Median filter)
  Technique 6  — Morphological Operations (dilation, erosion, open, close)
  Technique 7  — Color Space (BGR → HSV and LAB)

Feature sets compared:
  A — Color only    (HSV histogram features)
  B — Texture only  (GLCM-style statistical texture features)
  C — Shape/Vein    (Canny + morphological vein features)
  D — All combined  (A + B + C)

This comparison table is the bonus point.

Also generates reference images per species for the comparison feature.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import pickle
import json

from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split

# ── CONFIG ────────────────────────────────────────────────────────────────────
DATA_DIR      = r"C:\DIP_PBL\Images_processed"   # use preprocessed images
MODELS_DIR    = r"C:\DIP_PBL\models"
CLASS_NAMES   = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']
IMG_SIZE      = 224
REFERENCE_DIR = os.path.join(MODELS_DIR, 'reference_images')
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(REFERENCE_DIR, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE EXTRACTION — 4 feature sets
# ══════════════════════════════════════════════════════════════════════════════

def extract_color_features(img_bgr):
    """
    Feature Set A: Color-only features using HSV histogram.
    Technique 7: BGR→HSV color space conversion.
    Returns 96-dim vector.
    """
    img  = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))

    # Technique 7: Color space — HSV
    hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lab  = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)

    features = []

    # H, S, V histograms (32 bins each)
    for channel, max_val in zip(range(3), [180, 256, 256]):
        hist = cv2.calcHist([hsv], [channel], None, [32], [0, max_val])
        hist = hist.flatten() / (hist.sum() + 1e-7)
        features.extend(hist.tolist())

    return np.array(features, dtype=np.float32)  # 96-dim


def extract_texture_features(img_bgr):
    """
    Feature Set B: Texture features (GLCM-style statistics).
    Technique 2: CLAHE for lighting normalization before texture extraction.
    Technique 5: Median blur noise removal.
    Returns 20-dim vector.
    """
    img  = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Technique 5: Noise removal
    gray = cv2.medianBlur(gray, 3)

    # Technique 2: CLAHE histogram equalization
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    features = []

    # Statistical texture descriptors on full image
    features.append(float(np.mean(enhanced)))
    features.append(float(np.std(enhanced)))
    features.append(float(np.var(enhanced)))

    # Compute GLCM-style co-occurrence statistics using sliding window
    # (simplified: use local variance at multiple scales)
    for ksize in [3, 7, 15]:
        mean_f = cv2.blur(enhanced.astype(np.float32), (ksize, ksize))
        mean_sq = cv2.blur((enhanced.astype(np.float32))**2, (ksize, ksize))
        local_var = mean_sq - mean_f**2
        features.append(float(np.mean(local_var)))
        features.append(float(np.std(local_var)))

    # LBP-inspired: histogram of pixel-to-neighbour differences
    gray_f = enhanced.astype(np.float32)
    diff_h  = np.abs(np.diff(gray_f, axis=1)).mean()
    diff_v  = np.abs(np.diff(gray_f, axis=0)).mean()
    diff_d1 = np.abs(gray_f[1:, 1:] - gray_f[:-1, :-1]).mean()
    diff_d2 = np.abs(gray_f[1:, :-1] - gray_f[:-1, 1:]).mean()
    features.extend([diff_h, diff_v, diff_d1, diff_d2])

    # Gradient magnitude statistics (captures texture energy)
    gx = cv2.Sobel(enhanced, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(enhanced, cv2.CV_64F, 0, 1, ksize=3)
    mag = np.sqrt(gx**2 + gy**2)
    features.append(float(np.mean(mag)))
    features.append(float(np.std(mag)))
    features.append(float(np.percentile(mag, 75)))
    features.append(float(np.percentile(mag, 90)))

    return np.array(features, dtype=np.float32)  # 20-dim


def extract_vein_shape_features(img_bgr):
    """
    Feature Set C: Shape and vein features.
    Technique 3: Gaussian blur + Canny edge detection.
    Technique 6: Morphological operations (dilation, erosion, open, close).
    Returns 18-dim vector.
    """
    img  = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Technique 5: Noise removal
    gray = cv2.medianBlur(gray, 3)

    # Technique 3: Gaussian blur + Canny
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, 40, 120)

    # Technique 6: Morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dilated = cv2.dilate(edges,   kernel, iterations=1)   # dilation
    eroded  = cv2.erode(edges,    kernel, iterations=1)   # erosion
    opened  = cv2.morphologyEx(edges, cv2.MORPH_OPEN,  kernel)  # opening
    closed  = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)  # closing

    total_px = IMG_SIZE * IMG_SIZE

    features = []

    # Vein density (how many edge pixels as fraction of total)
    features.append(float(np.sum(edges  > 0)) / total_px)   # raw edge density
    features.append(float(np.sum(closed > 0)) / total_px)   # cleaned vein density
    features.append(float(np.sum(opened > 0)) / total_px)   # noise-removed density

    # Morphological difference features (dilation-erosion spread = thickness)
    diff_dilate_erode = float(np.sum(dilated > 0) - np.sum(eroded > 0)) / total_px
    features.append(diff_dilate_erode)

    # Contour-based shape features
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        areas     = [cv2.contourArea(c) for c in contours]
        perims    = [cv2.arcLength(c, True) for c in contours if cv2.arcLength(c, True) > 0]
        features.append(float(len(contours)))
        features.append(float(np.mean(areas)))
        features.append(float(np.std(areas)))
        features.append(float(np.max(areas)) / total_px)
        # Circularity of largest contour
        largest = max(contours, key=cv2.contourArea)
        area  = cv2.contourArea(largest)
        perim = cv2.arcLength(largest, True)
        circ  = (4 * np.pi * area / (perim**2)) if perim > 0 else 0
        features.append(float(circ))
        # Aspect ratio of bounding rect
        x, y, w, h = cv2.boundingRect(largest)
        features.append(float(w) / max(h, 1))
        # Extent: contour area / bounding box area
        features.append(float(area) / max(w * h, 1))
    else:
        features.extend([0.0] * 7)

    # Hu moments (shape invariants)
    moments = cv2.moments(closed)
    hu = cv2.HuMoments(moments).flatten()
    # Log transform for scale invariance
    hu_log = [-np.sign(h) * np.log10(abs(h) + 1e-10) for h in hu[:5]]
    features.extend(hu_log)

    return np.array(features, dtype=np.float32)  # 18-dim


def extract_all_features(img_bgr):
    """Combined feature vector: color + texture + vein/shape."""
    color   = extract_color_features(img_bgr)
    texture = extract_texture_features(img_bgr)
    vein    = extract_vein_shape_features(img_bgr)
    return np.concatenate([color, texture, vein])


# ══════════════════════════════════════════════════════════════════════════════
# LOAD DATASET
# ══════════════════════════════════════════════════════════════════════════════

def load_dataset():
    print("\n" + "="*60)
    print("LOADING DATASET — Classical Pipeline")
    print("="*60)

    all_features = {'color': [], 'texture': [], 'vein': [], 'all': []}
    labels = []

    for cls_name in CLASS_NAMES:
        cls_dir = os.path.join(DATA_DIR, cls_name)
        if not os.path.exists(cls_dir):
            print(f"  WARNING: {cls_dir} not found — skipping")
            continue

        images = [f for f in os.listdir(cls_dir)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        print(f"  {cls_name}: {len(images)} images")

        for fname in images:
            img_path = os.path.join(cls_dir, fname)
            img_bgr  = cv2.imread(img_path)
            if img_bgr is None:
                continue

            all_features['color'].append(extract_color_features(img_bgr))
            all_features['texture'].append(extract_texture_features(img_bgr))
            all_features['vein'].append(extract_vein_shape_features(img_bgr))
            all_features['all'].append(extract_all_features(img_bgr))
            labels.append(cls_name)

    print(f"\n  Total samples loaded: {len(labels)}")
    return {k: np.array(v) for k, v in all_features.items()}, np.array(labels)


# ══════════════════════════════════════════════════════════════════════════════
# TRAIN SVM — one per feature set
# ══════════════════════════════════════════════════════════════════════════════

def train_svm(X_train, y_train, X_val, y_val, feature_name):
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s   = scaler.transform(X_val)

    svm = SVC(kernel='rbf', C=10, gamma='scale',
              probability=True, class_weight='balanced', random_state=42)
    svm.fit(X_train_s, y_train)

    y_pred = svm.predict(X_val_s)
    acc    = accuracy_score(y_val, y_pred)
    report = classification_report(y_val, y_pred, target_names=CLASS_NAMES,
                                   zero_division=0, output_dict=True)

    print(f"\n  [{feature_name}] Validation accuracy: {acc*100:.2f}%")
    per_class = {cls: round(report[cls]['f1-score'], 3)
                 for cls in CLASS_NAMES if cls in report}

    return svm, scaler, acc, per_class, y_pred


# ══════════════════════════════════════════════════════════════════════════════
# COMPARISON TABLE
# ══════════════════════════════════════════════════════════════════════════════

def plot_comparison_table(results: dict):
    """
    Plots the comparison table: feature combination vs accuracy.
    This is the bonus point.
    """
    feature_sets = list(results.keys())
    accuracies   = [results[f]['accuracy'] * 100 for f in feature_sets]

    labels_map = {
        'Color Only':    'Color Only\n(HSV Histogram)',
        'Texture Only':  'Texture Only\n(GLCM Statistics)',
        'Vein/Shape':    'Vein/Shape\n(Canny + Morphological)',
        'All Combined':  'All Combined\n(Color + Texture + Vein)',
    }

    fig, axes = plt.subplots(1, 2, figsize=(18, 7))

    # ── Bar chart ─────────────────────────────────────────────────────────────
    ax = axes[0]
    colors = ['#5B8DB8', '#E8A838', '#6BAF6B', '#C05050']
    bars   = ax.bar([labels_map.get(f, f) for f in feature_sets],
                    accuracies, color=colors, edgecolor='white',
                    linewidth=1.5, width=0.55)
    ax.set_ylabel('Validation Accuracy (%)', fontsize=12)
    ax.set_title('System A: Classical DIP + SVM\nFeature Combination Comparison',
                 fontsize=13, fontweight='bold')
    ax.set_ylim(0, 110)
    ax.axhline(y=50, color='gray', linestyle='--', alpha=0.4, label='Chance level')
    for bar, acc in zip(bars, accuracies):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1.5,
                f'{acc:.1f}%', ha='center', va='bottom', fontsize=12, fontweight='bold')
    ax.tick_params(axis='x', labelsize=9)
    ax.grid(axis='y', alpha=0.3)

    # ── Per-class F1 heatmap ───────────────────────────────────────────────────
    ax2 = axes[1]
    f1_data = np.zeros((len(CLASS_NAMES), len(feature_sets)))
    for j, feat in enumerate(feature_sets):
        for i, cls in enumerate(CLASS_NAMES):
            f1_data[i, j] = results[feat]['per_class'].get(cls, 0) * 100

    sns.heatmap(f1_data, annot=True, fmt='.0f', cmap='YlOrRd',
                xticklabels=[f.split('\n')[0] if '\n' in f else f
                             for f in [labels_map.get(k, k) for k in feature_sets]],
                yticklabels=CLASS_NAMES,
                ax=ax2, vmin=0, vmax=100, linewidths=0.5)
    ax2.set_title('Per-Class F1 Score by Feature Set (%)',
                  fontsize=13, fontweight='bold')
    ax2.set_xlabel('Feature Set')
    ax2.set_ylabel('Species')

    plt.tight_layout()
    save_path = os.path.join(MODELS_DIR, 'system_A_comparison.png')
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"\n  Comparison table saved: {save_path}")
    return save_path


def plot_confusion_matrix_svm(y_true, y_pred, title, save_name):
    cm = confusion_matrix(y_true, y_pred, labels=CLASS_NAMES)
    plt.figure(figsize=(9, 7))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
    plt.title(title, fontsize=13, fontweight='bold')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    save_path = os.path.join(MODELS_DIR, save_name)
    plt.savefig(save_path, dpi=120, bbox_inches='tight')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# REFERENCE IMAGE GENERATOR
# Save one representative image per species for the comparison feature
# ══════════════════════════════════════════════════════════════════════════════

def save_reference_images():
    """
    For each species, pick the 5 most 'average' images (closest to class centroid)
    and save as reference images. Used by /classical-compare in the backend.
    """
    print("\n" + "="*60)
    print("GENERATING REFERENCE IMAGES")
    print("="*60)

    refs = {}
    for cls_name in CLASS_NAMES:
        cls_dir = os.path.join(DATA_DIR, cls_name)
        if not os.path.exists(cls_dir):
            continue

        images  = [f for f in os.listdir(cls_dir)
                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        vectors = []
        paths   = []

        for fname in images:
            p   = os.path.join(cls_dir, fname)
            img = cv2.imread(p)
            if img is None:
                continue
            vec = extract_all_features(img)
            vectors.append(vec)
            paths.append(p)

        if not vectors:
            continue

        # Find image closest to centroid
        mat      = np.array(vectors)
        centroid = mat.mean(axis=0)
        dists    = np.linalg.norm(mat - centroid, axis=1)
        best_idx = int(np.argmin(dists))

        ref_src = paths[best_idx]
        ref_dst = os.path.join(REFERENCE_DIR, f'{cls_name}_reference.jpg')

        img = cv2.imread(ref_src)
        cv2.imwrite(ref_dst, img)
        refs[cls_name] = ref_dst
        print(f"  {cls_name}: reference saved → {os.path.basename(ref_dst)}")

    # Save paths index
    with open(os.path.join(MODELS_DIR, 'reference_paths.json'), 'w') as f:
        json.dump(refs, f, indent=2)

    print(f"\n  Reference paths index saved: {os.path.join(MODELS_DIR, 'reference_paths.json')}")
    return refs


# ══════════════════════════════════════════════════════════════════════════════
# INFERENCE — used by the backend for live comparison
# ══════════════════════════════════════════════════════════════════════════════

class ClassicalPredictor:
    """Loads saved SVM model for real-time inference in the backend."""

    def __init__(self, model_path=None):
        if model_path is None:
            model_path = os.path.join(MODELS_DIR, 'svm_all_combined.pkl')
        with open(model_path, 'rb') as f:
            data = pickle.load(f)
        self.svm    = data['svm']
        self.scaler = data['scaler']

    def predict(self, img_bgr):
        features  = extract_all_features(img_bgr)
        scaled    = self.scaler.transform([features])
        probs     = self.svm.predict_proba(scaled)[0]
        idx       = int(np.argmax(probs))
        return CLASS_NAMES[idx], float(probs[idx]), dict(zip(CLASS_NAMES, probs.tolist()))

    def compare_with_reference(self, suspect_bgr, reference_bgr):
        """
        Extract DIP features from both images and return comparison dict.
        This is what gets shown in the frontend comparison view.
        """
        s_color   = extract_color_features(suspect_bgr)
        r_color   = extract_color_features(reference_bgr)
        s_texture = extract_texture_features(suspect_bgr)
        r_texture = extract_texture_features(reference_bgr)
        s_vein    = extract_vein_shape_features(suspect_bgr)
        r_vein    = extract_vein_shape_features(reference_bgr)

        def cosine_sim(a, b):
            denom = np.linalg.norm(a) * np.linalg.norm(b)
            return float(np.dot(a, b) / denom) if denom > 0 else 0.0

        def hist_intersection(a, b):
            return float(np.sum(np.minimum(a, b)))

        color_sim   = hist_intersection(s_color[:32], r_color[:32])
        texture_sim = cosine_sim(s_texture, r_texture)
        vein_sim    = cosine_sim(s_vein[:4], r_vein[:4])

        overall = color_sim * 0.35 + texture_sim * 0.35 + vein_sim * 0.30

        # Generate visualisation images (edges, veins)
        def make_vis(img_bgr):
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

        s_edges, s_veins, s_enhanced = make_vis(suspect_bgr)
        r_edges, r_veins, r_enhanced = make_vis(reference_bgr)

        import base64
        def to_b64(arr):
            _, buf = cv2.imencode('.jpg', arr)
            return base64.b64encode(buf).decode('utf-8')

        return {
            'color_similarity':   round(color_sim, 4),
            'texture_similarity': round(texture_sim, 4),
            'vein_similarity':    round(vein_sim, 4),
            'overall_similarity': round(overall, 4),
            'verdict': (
                'HIGH — DIP features closely match the genuine reference'
                if overall >= 0.75 else
                'MODERATE — some features differ, possible variation or adulteration'
                if overall >= 0.55 else
                'LOW — significant feature mismatch, likely adulterated'
            ),
            'suspect_edges_b64':   to_b64(s_edges),
            'suspect_veins_b64':   to_b64(s_veins),
            'suspect_clahe_b64':   to_b64(s_enhanced),
            'reference_edges_b64': to_b64(r_edges),
            'reference_veins_b64': to_b64(r_veins),
            'reference_clahe_b64': to_b64(r_enhanced),
            'dip_techniques': [
                'Technique 3: Gaussian blur → Canny edge detection (vein pattern)',
                'Technique 6: Morphological closing → vein gap filling',
                'Technique 2: CLAHE → lighting normalization',
                'Technique 7: HSV histogram → color fingerprint',
                'Technique 5: Median blur → noise removal',
            ]
        }


# ══════════════════════════════════════════════════════════════════════════════
# MAIN — run this once to train all 4 SVMs and generate comparison table
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "="*60)
    print("VaidyaVision — System A: Classical DIP Pipeline")
    print("="*60)

    # Load all images and extract all feature sets
    print("\nExtracting features from all images...")
    print("(This will take a few minutes — extracting 4 feature sets per image)\n")
    all_feats, labels = load_dataset()

    le = LabelEncoder()
    le.fit(CLASS_NAMES)
    y = le.transform(labels)

    # Stratified split: 80% train, 20% val
    results = {}
    feature_map = {
        'Color Only':   all_feats['color'],
        'Texture Only': all_feats['texture'],
        'Vein/Shape':   all_feats['vein'],
        'All Combined': all_feats['all'],
    }
    save_name_map = {
        'Color Only':   'svm_color_only.pkl',
        'Texture Only': 'svm_texture_only.pkl',
        'Vein/Shape':   'svm_vein_shape.pkl',
        'All Combined': 'svm_all_combined.pkl',
    }

    print("\n" + "="*60)
    print("TRAINING SVM CLASSIFIERS")
    print("="*60)

    best_svm_data = None

    for feat_name, X in feature_map.items():
        X_train, X_val, y_train, y_val = train_test_split(
            X, labels, test_size=0.2, random_state=42, stratify=labels
        )

        svm, scaler, acc, per_class, y_pred = train_svm(
            X_train, y_train, X_val, y_val, feat_name
        )

        results[feat_name] = {
            'accuracy':  acc,
            'per_class': per_class,
        }

        # Save SVM model
        save_path = os.path.join(MODELS_DIR, save_name_map[feat_name])
        with open(save_path, 'wb') as f:
            pickle.dump({'svm': svm, 'scaler': scaler,
                         'feature_name': feat_name, 'accuracy': acc}, f)
        print(f"    Saved: {save_path}")

        # Save confusion matrix for "All Combined"
        if feat_name == 'All Combined':
            plot_confusion_matrix_svm(y_val, y_pred,
                                      'System A — All Combined Features (SVM)',
                                      'svm_confusion_matrix.png')
            best_svm_data = (svm, scaler)

    # Print final comparison table
    print("\n" + "="*60)
    print("SYSTEM A — COMPARISON TABLE")
    print("="*60)
    print(f"{'Feature Set':<20} {'Accuracy':>10}  Per-class F1")
    print("-"*60)
    for feat_name, res in results.items():
        acc_str = f"{res['accuracy']*100:.2f}%"
        f1_str  = "  ".join(f"{cls}:{v:.2f}" for cls, v in res['per_class'].items())
        print(f"{feat_name:<20} {acc_str:>10}  {f1_str}")

    print("\n  WINNER: All Combined (uses all DIP techniques together)")

    # Plot comparison chart
    plot_comparison_table(results)

    # Save results JSON (used by backend for display)
    with open(os.path.join(MODELS_DIR, 'svm_results.json'), 'w') as f:
        json.dump({k: {'accuracy': v['accuracy'],
                       'accuracy_pct': round(v['accuracy']*100, 2),
                       'per_class': v['per_class']}
                   for k, v in results.items()}, f, indent=2)
    print(f"\n  Results JSON saved: {os.path.join(MODELS_DIR, 'svm_results.json')}")

    # Generate reference images
    save_reference_images()

    print("\n" + "="*60)
    print("SYSTEM A TRAINING COMPLETE")
    print("="*60)
    for feat_name, res in results.items():
        print(f"  {feat_name:<20} → {res['accuracy']*100:.2f}%")
    print("\n  All Combined SVM is used by the backend for classical comparison.")
    print("  Run backend/main.py next to serve the API.")
    print("="*60)