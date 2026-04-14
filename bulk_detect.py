import cv2
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

# ── LOAD MODELS ──────────────────────────────────────────────────────────────
print("Loading VaidyaVision model...")
# FIXED: was loading vaidyavision_final.keras — retrained model is v2
leaf_model = tf.keras.models.load_model(r'C:\DIP_PBL\models\vaidyavision_v2.keras')

CLASS_NAMES = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']
CONFIDENCE_THRESHOLD = 0.55  # Lowered slightly from 0.65 to be more inclusive

# ── DIP PREPROCESSING (identical to train.py pipeline) ───────────────────────
def preprocess_single(img_bgr):
    """
    Apply same DIP pipeline as training.
    Technique 5: Noise Removal (median blur)
    Technique 7 + Bonus: Color Space BGR→LAB
    Technique 2: Histogram Processing (CLAHE on L channel)
    NOTE: No rescale=1./255 — EfficientNet handles its own normalization.
    """
    img = cv2.resize(img_bgr, (224, 224))
    img = cv2.medianBlur(img, 3)                           # Noise removal
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)             # Color space
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)                                      # Histogram processing
    lab = cv2.merge([l, a, b])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img.astype(np.uint8)

# ── CLASSIFY SINGLE CROP ──────────────────────────────────────────────────────
def classify_leaf(crop_bgr):
    preprocessed = preprocess_single(crop_bgr)
    img_array = np.expand_dims(preprocessed, axis=0).astype(np.float32)
    predictions = leaf_model.predict(img_array, verbose=0)
    confidence = float(np.max(predictions))
    species_idx = int(np.argmax(predictions))
    species = CLASS_NAMES[species_idx]
    return species, confidence, predictions[0]

# ── GRID DETECTION ────────────────────────────────────────────────────────────
def detect_grid_layout(img_bgr):
    """
    Detects if the image is a collage/grid layout by looking for
    strong horizontal and vertical dividing lines (white or dark borders).
    Returns list of (x1, y1, x2, y2) cell bounding boxes, or empty list.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Project pixel averages across rows and columns
    row_means = np.mean(gray, axis=1)  # shape: (h,)
    col_means = np.mean(gray, axis=0)  # shape: (w,)

    def find_dividers(means, size, min_gap=30):
        """
        Find indices where a line of pixels is significantly brighter or darker
        than its neighbors — these are the grid dividers.
        """
        dividers = [0]
        smoothed = np.convolve(means, np.ones(5)/5, mode='same')
        grad = np.abs(np.diff(smoothed))
        threshold = np.percentile(grad, 92)

        i = 0
        while i < len(grad):
            if grad[i] > threshold:
                # Found a potential divider — take the center of the spike region
                j = i
                while j < len(grad) and grad[j] > threshold:
                    j += 1
                center = (i + j) // 2
                if center - dividers[-1] > min_gap:
                    dividers.append(center)
                i = j
            else:
                i += 1

        if size - dividers[-1] > min_gap:
            dividers.append(size)
        return dividers

    row_divs = find_dividers(row_means, h, min_gap=h//8)
    col_divs = find_dividers(col_means, w, min_gap=w//8)

    # Need at least 2 rows and 2 columns to be a grid
    if len(row_divs) < 3 or len(col_divs) < 3:
        return []

    cells = []
    for i in range(len(row_divs) - 1):
        for j in range(len(col_divs) - 1):
            y1, y2 = row_divs[i], row_divs[i+1]
            x1, x2 = col_divs[j], col_divs[j+1]
            # Add small inset to avoid border artifacts
            pad = 8
            y1c = min(y1 + pad, y2 - pad)
            y2c = max(y2 - pad, y1 + pad)
            x1c = min(x1 + pad, x2 - pad)
            x2c = max(x2 - pad, x1 + pad)
            if (y2c - y1c) > 40 and (x2c - x1c) > 40:
                cells.append((x1c, y1c, x2c, y2c))

    print(f"Grid detection: found {len(row_divs)-1} rows × {len(col_divs)-1} cols = {len(cells)} cells")
    return cells

# ── CONTOUR-BASED DETECTION (Techniques 3 & 6) ───────────────────────────────
def contour_based_detection(img_bgr):
    """
    Fallback for organic/scattered leaf arrangements.
    Technique 3: Spatial Filtering — Gaussian blur
    Technique 6: Morphological Operations — close + open
    """
    detections = []
    h, w = img_bgr.shape[:2]

    # HSV green mask
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_green = np.array([20, 25, 25])
    upper_green = np.array([95, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)

    # Technique 3: Spatial filtering
    mask = cv2.GaussianBlur(mask, (9, 9), 0)
    _, mask = cv2.threshold(mask, 50, 255, cv2.THRESH_BINARY)

    # Technique 6: Morphological operations
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    kernel_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (12, 12))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel_open)

    # Distance transform to separate touching leaves
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    dist_norm = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, sure_fg = cv2.threshold(dist_norm, 0.4 * dist_norm.max(), 255, cv2.THRESH_BINARY)
    sure_fg = sure_fg.astype(np.uint8)

    contours, _ = cv2.findContours(sure_fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (h * w) * 0.008
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue
        x, y, bw, bh = cv2.boundingRect(contour)
        pad = 15
        x1 = max(0, x - pad);  y1 = max(0, y - pad)
        x2 = min(w, x + bw + pad); y2 = min(h, y + bh + pad)
        crop = img_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        species, confidence, probs = classify_leaf(crop)
        detections.append({
            'bbox': (x1, y1, x2, y2),
            'species': species,
            'confidence': confidence,
            'probs': probs,
            'authentic': confidence >= CONFIDENCE_THRESHOLD
        })

    return detections

# ── MAIN BULK DETECTION PIPELINE ─────────────────────────────────────────────
def detect_and_classify_bulk(image_path, output_path=None):
    """
    3-stage detection pipeline:
    Stage 1 — Grid detection: handles collage/tray-style arranged images
    Stage 2 — Contour detection: handles organic scattered leaf arrangements
    Stage 3 — Full-image fallback: classifies the whole image as one leaf
    """
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        print(f"Error: Could not load image from {image_path}")
        return []

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_bgr.shape[:2]
    print(f"Image size: {w}×{h}")

    detections = []

    # ── Stage 1: Grid detection ───────────────────────────────────────────────
    grid_cells = detect_grid_layout(img_bgr)
    if grid_cells:
        print(f"Using grid detection — {len(grid_cells)} cells found")
        for (x1, y1, x2, y2) in grid_cells:
            crop = img_bgr[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            species, confidence, probs = classify_leaf(crop)
            detections.append({
                'bbox': (x1, y1, x2, y2),
                'species': species,
                'confidence': confidence,
                'probs': probs,
                'authentic': confidence >= CONFIDENCE_THRESHOLD
            })

    # ── Stage 2: Contour-based detection ─────────────────────────────────────
    if not detections:
        print("Grid detection found nothing. Trying contour-based detection...")
        detections = contour_based_detection(img_bgr)

    # ── Stage 3: Full-image fallback ──────────────────────────────────────────
    if not detections:
        print("No regions found. Classifying entire image as single leaf...")
        species, confidence, probs = classify_leaf(img_bgr)
        detections.append({
            'bbox': (0, 0, w, h),
            'species': species,
            'confidence': confidence,
            'probs': probs,
            'authentic': confidence >= CONFIDENCE_THRESHOLD
        })

    # ── Visualize ─────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(1, 1, figsize=(16, 11))
    ax.imshow(img_rgb)

    for i, det in enumerate(detections):
        x1, y1, x2, y2 = det['bbox']
        color = (0, 200, 0) if det['authentic'] else (255, 50, 50)
        color_norm = tuple(c/255 for c in color)

        rect = patches.Rectangle(
            (x1, y1), x2-x1, y2-y1,
            linewidth=2.5, edgecolor=color_norm, facecolor='none'
        )
        ax.add_patch(rect)

        status = "✓" if det['authentic'] else "✗"
        label = f"{status} {det['species']} {det['confidence']*100:.0f}%"
        ax.text(x1+4, y1+20, label,
                color='white', fontsize=9, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor=color_norm, alpha=0.85))

        # Show leaf number
        ax.text(x2-20, y2-8, str(i+1),
                color='white', fontsize=8, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='black', alpha=0.6))

    auth_count = sum(1 for d in detections if d['authentic'])
    total = len(detections)
    ax.set_title(
        f"VaidyaVision Bulk Detection  —  {auth_count}/{total} leaves authenticated",
        fontsize=15, fontweight='bold', pad=12, color='#1a5c2a'
    )
    ax.axis('off')
    plt.tight_layout()

    save_path = output_path or image_path.replace('.jpg', '_result.jpg').replace('.png', '_result.png')
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    print(f"\nResult saved to: {save_path}")

    # ── Print summary ─────────────────────────────────────────────────────────
    print("\n" + "="*55)
    print("BULK DETECTION RESULTS — VaidyaVision")
    print("="*55)
    for i, det in enumerate(detections):
        status = "AUTHENTIC ✓" if det['authentic'] else "SUSPICIOUS ✗"
        top2 = sorted(zip(CLASS_NAMES, det['probs']), key=lambda x: -x[1])[:2]
        alt = f"  (2nd: {top2[1][0]} {top2[1][1]*100:.0f}%)" if len(top2) > 1 else ""
        print(f"  Leaf {i+1}: {det['species']:<14} {det['confidence']*100:.1f}%  —  {status}{alt}")
    print(f"\n  Summary: {auth_count}/{total} leaves authenticated")
    print("="*55)

    return detections

# ── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    image_path = sys.argv[1] if len(sys.argv) > 1 else r"C:\DIP_PBL\test_bulk.jpg"
    print(f"Processing: {image_path}")
    results = detect_and_classify_bulk(image_path)