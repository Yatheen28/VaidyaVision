"""
VaidyaVision Backend — main.py
FastAPI server integrating System B (EfficientNetB0) + System A (Classical SVM)
"""

import os, base64, json, pickle
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
AUTHENTIC_THRESHOLD  = 0.75
SUSPICIOUS_THRESHOLD = 0.55

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

# ── LOAD DEEP LEARNING MODEL ──────────────────────────────────────────────────
print(f"Loading DL model: {os.path.abspath(MODEL_PATH)}")
dl_model = tf.keras.models.load_model(MODEL_PATH)
print("[OK] EfficientNetB0 model loaded")

# ── LOAD CLASSICAL SVM (if trained) ──────────────────────────────────────────
svm_predictor = None
if os.path.exists(SVM_PATH):
    with open(SVM_PATH, 'rb') as f:
        svm_data = pickle.load(f)
    print("[OK] Classical SVM model loaded")

    # Import the feature extractors from classical_pipeline
    import sys
    sys.path.insert(0, os.path.join(BASE_DIR, '..'))
    try:
        from classical_pipeline import (extract_all_features,
                                         extract_color_features,
                                         extract_texture_features,
                                         extract_vein_shape_features,
                                         ClassicalPredictor)
        svm_predictor = ClassicalPredictor(SVM_PATH)
        print("[OK] Classical predictor ready")
    except ImportError as e:
        print(f"[WARN] Cannot import classical_pipeline: {e}")
        print("       Run classical_pipeline.py first to train the SVM.")
else:
    print("[WARN] SVM model not found — run classical_pipeline.py first")
    print(f"       Expected: {SVM_PATH}")

# ── LOAD REFERENCE PATHS ──────────────────────────────────────────────────────
reference_paths = {}
if os.path.exists(REFS_PATH):
    with open(REFS_PATH, 'r') as f:
        reference_paths = json.load(f)
    print(f"[OK] Reference images loaded for: {list(reference_paths.keys())}")

# ── LOAD SVM COMPARISON RESULTS ───────────────────────────────────────────────
svm_results = {}
if os.path.exists(SVM_RES_PATH):
    with open(SVM_RES_PATH, 'r') as f:
        svm_results = json.load(f)

# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="VaidyaVision API", version="2.0.0")
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
    """GrabCut background removal. Faculty suggestion 3."""
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
        return img_bgr

def dip_preprocess(img_bgr, remove_bg=False):
    """
    Matches train.py pipeline exactly.
    T5: Median blur | T7: BGR→LAB | T2: CLAHE on L | No rescale (EfficientNet handles it)
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
    batch = np.expand_dims(img_rgb_uint8.astype(np.float32), axis=0)
    probs = dl_model.predict(batch, verbose=0)[0]
    idx   = int(np.argmax(probs))
    return CLASS_NAMES[idx], float(probs[idx]), {n: round(float(probs[i]), 4) for i, n in enumerate(CLASS_NAMES)}

def detect_leaves_dip(img_bgr):
    """
    Leaf localisation using DIP techniques only — no YOLO.
    T7: HSV masking | T3: Gaussian blur | T6: Morphological operations | Distance transform
    """
    h, w = img_bgr.shape[:2]

    # First try: grid/collage detection
    grid_cells = _detect_grid(img_bgr)
    if grid_cells:
        return grid_cells, 'grid'

    # Second try: contour-based for scattered leaves
    hsv  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([20, 25, 25]), np.array([95, 255, 255]))
    mask = cv2.GaussianBlur(mask, (9, 9), 0)
    _, mask = cv2.threshold(mask, 50, 255, cv2.THRESH_BINARY)
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    k_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (12, 12))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k_close)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k_open)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    dist_n = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, sure_fg = cv2.threshold(dist_n, 0.4 * dist_n.max(), 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(sure_fg.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = (h * w) * 0.008
    bboxes = []
    for c in contours:
        if cv2.contourArea(c) < min_area:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        pad = 20
        bboxes.append((max(0,x-pad), max(0,y-pad), min(w,x+bw+pad), min(h,y+bh+pad)))
    if bboxes:
        return bboxes, 'contour'

    # Fallback: whole image
    return [(0, 0, w, h)], 'full_image'

def _detect_grid(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    def find_dividers(means, size, min_gap):
        dividers = [0]
        smoothed = np.convolve(means, np.ones(5)/5, mode='same')
        grad     = np.abs(np.diff(smoothed))
        thresh   = np.percentile(grad, 92)
        i = 0
        while i < len(grad):
            if grad[i] > thresh:
                j = i
                while j < len(grad) and grad[j] > thresh:
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

    row_divs = find_dividers(np.mean(gray, axis=1), h, h//8)
    col_divs = find_dividers(np.mean(gray, axis=0), w, w//8)
    if len(row_divs) < 3 or len(col_divs) < 3:
        return []
    cells = []
    for i in range(len(row_divs)-1):
        for j in range(len(col_divs)-1):
            y1, y2 = row_divs[i]+8, row_divs[i+1]-8
            x1, x2 = col_divs[j]+8, col_divs[j+1]-8
            if (y2-y1) > 40 and (x2-x1) > 40:
                cells.append((x1, y1, x2, y2))
    return cells


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: SPECIES-SPECIFIC AUTHENTICATION
# Faculty suggestion 1
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    selected_species: Optional[str] = Form(None),
    remove_bg: bool = Form(False),
):
    """
    Species-specific authentication.
    User selects species first (e.g. Tulsi), uploads image.
    System confirms: Is this really Tulsi? AUTHENTIC / ADULTERATED / UNKNOWN
    """
    try:
        contents = await image.read()
        img_bgr  = decode_image(contents)
    except Exception as e:
        raise HTTPException(400, detail=f"Invalid image: {e}")

    if selected_species and selected_species not in CLASS_NAMES:
        raise HTTPException(400, detail=f"Unknown species. Options: {CLASS_NAMES}")

    preprocessed = dip_preprocess(img_bgr, remove_bg=remove_bg)
    predicted, confidence, all_probs = run_dl_model(preprocessed)

    if selected_species:
        sel_conf = all_probs[selected_species]

        if sel_conf >= AUTHENTIC_THRESHOLD:
            status  = "AUTHENTIC"
            message = f"Confirmed genuine {selected_species} leaf. Confidence: {sel_conf*100:.1f}%"
        elif confidence >= AUTHENTIC_THRESHOLD and predicted != selected_species:
            status  = "ADULTERATED"
            message = (f"This appears to be {predicted} ({confidence*100:.1f}%), "
                       f"NOT {selected_species}. High likelihood of adulteration.")
        elif sel_conf < SUSPICIOUS_THRESHOLD and confidence < SUSPICIOUS_THRESHOLD:
            status  = "UNKNOWN"
            message = (f"Cannot identify confidently. Best match: {predicted} at {confidence*100:.1f}%. "
                       "Try a clearer image with the leaf against a plain background.")
        else:
            status  = "SUSPICIOUS"
            message = (f"Low confidence for {selected_species} ({sel_conf*100:.1f}%). "
                       "Could be adulterated or low-quality image.")

        return {
            "selected_species": selected_species,
            "predicted_species": predicted,
            "status": status,
            "message": message,
            "selected_species_confidence": round(sel_conf, 4),
            "selected_species_confidence_pct": round(sel_conf * 100, 1),
            "predicted_confidence": round(confidence, 4),
            "all_probs": all_probs,
            "species_info": SPECIES_INFO.get(selected_species, {}),
            "authentic": status == "AUTHENTIC",
            "bg_removed": remove_bg,
        }

    # Generic mode (no species pre-selected)
    if confidence >= AUTHENTIC_THRESHOLD:
        status  = "IDENTIFIED"
        message = f"Identified as {predicted} with {confidence*100:.1f}% confidence."
    elif confidence >= SUSPICIOUS_THRESHOLD:
        status  = "SUSPICIOUS"
        message = f"Likely {predicted} but confidence is low ({confidence*100:.1f}%). Possible adulteration."
    else:
        status  = "UNKNOWN"
        message = f"Cannot identify confidently ({confidence*100:.1f}%). Try a clearer image."

    return {
        "selected_species": None,
        "predicted_species": predicted,
        "status": status,
        "message": message,
        "predicted_confidence": round(confidence, 4),
        "all_probs": all_probs,
        "species_info": SPECIES_INFO.get(predicted, {}),
        "authentic": confidence >= AUTHENTIC_THRESHOLD,
        "bg_removed": remove_bg,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: BACKGROUND REMOVAL PREVIEW
# Faculty suggestion 3
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/remove-background")
async def remove_bg_endpoint(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        img_bgr  = decode_image(contents)
    except Exception as e:
        raise HTTPException(400, detail=str(e))

    removed = remove_background_grabcut(img_bgr)
    return {
        "original_b64":   img_to_b64(img_bgr),
        "bg_removed_b64": img_to_b64(removed),
        "technique":      "GrabCut segmentation (OpenCV)",
        "message":        "Background replaced with white. Proceed to authenticate.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: CLASSICAL DIP COMPARISON
# The "what DIP techniques are YOU doing" answer
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/classical-compare")
async def classical_compare(
    uploaded_image: UploadFile = File(...),
    selected_species: Optional[str] = Form(None),
):
    """
    Classical DIP comparison:
    1. Removes background from uploaded image (GrabCut)
    2. Loads the reference genuine image for the selected species
    3. Extracts DIP features from both (Canny edges, vein density, color histogram, texture)
    4. Computes similarity score
    5. Runs EfficientNetB0 on top for final verdict
    6. Returns side-by-side visual comparison

    This is the answer to faculty's question: 'What DIP techniques are YOU doing?'
    """
    if not selected_species or selected_species not in CLASS_NAMES:
        raise HTTPException(400, detail=f"selected_species required. Options: {CLASS_NAMES}")

    if svm_predictor is None:
        raise HTTPException(503, detail="Classical model not ready. Run classical_pipeline.py first.")

    try:
        upl_bytes = await uploaded_image.read()
        upl_bgr   = decode_image(upl_bytes)
    except Exception as e:
        raise HTTPException(400, detail=str(e))

    # Load reference image for the selected species
    ref_path = reference_paths.get(selected_species)
    if not ref_path or not os.path.exists(ref_path):
        raise HTTPException(404, detail=f"Reference image for {selected_species} not found. Run classical_pipeline.py first.")
    ref_bgr = cv2.imread(ref_path)

    # Background removal on uploaded image
    upl_clean = remove_background_grabcut(upl_bgr)

    # Classical comparison
    comparison = svm_predictor.compare_with_reference(upl_clean, ref_bgr)

    # Deep learning prediction
    preprocessed = dip_preprocess(upl_clean)
    dl_pred, dl_conf, all_probs = run_dl_model(preprocessed)

    # Combined verdict
    classical_match = comparison['overall_similarity'] >= 0.65
    dl_match        = dl_conf >= AUTHENTIC_THRESHOLD and dl_pred == selected_species

    if dl_match and classical_match:
        verdict = "AUTHENTIC"
        verdict_msg = "Both AI model and classical DIP analysis confirm genuine leaf."
        color = "green"
    elif not dl_match and not classical_match:
        verdict = "ADULTERATED"
        verdict_msg = f"Both systems flag this. AI says {dl_pred} ({dl_conf*100:.0f}%). DIP similarity: {comparison['overall_similarity']*100:.0f}%."
        color = "red"
    elif dl_match and not classical_match:
        verdict = "SUSPICIOUS"
        verdict_msg = f"AI model accepts it ({dl_conf*100:.0f}%) but DIP features differ from genuine reference."
        color = "orange"
    else:
        verdict = "SUSPICIOUS"
        verdict_msg = f"DIP features match but AI model is uncertain ({dl_conf*100:.0f}%). Manual verification recommended."
        color = "orange"

    return {
        "selected_species":  selected_species,
        "verdict":           verdict,
        "verdict_message":   verdict_msg,
        "verdict_color":     color,
        "comparison":        comparison,
        "dl_prediction": {
            "species":    dl_pred,
            "confidence": round(dl_conf, 4),
            "all_probs":  all_probs,
        },
        "uploaded_original_b64": img_to_b64(upl_bgr),
        "uploaded_cleaned_b64":  img_to_b64(upl_clean),
        "reference_image_b64":   img_to_b64(ref_bgr),
        "system_a_results":      svm_results,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: BULK DETECTION — DIP-based leaf localisation
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/bulk-predict")
async def bulk_predict(image: UploadFile = File(...)):
    """
    Detects individual leaves in an image using YOUR DIP techniques:
    - HSV masking for green region isolation (T7)
    - Gaussian blur (T3)
    - Morphological close/open to separate leaves (T6)
    - Distance transform for touching-leaf separation
    - GrabCut background removal per detected leaf
    - EfficientNetB0 classification per leaf
    """
    try:
        contents = await image.read()
        img_bgr  = decode_image(contents)
    except Exception as e:
        raise HTTPException(400, detail=str(e))

    bboxes, method = detect_leaves_dip(img_bgr)
    detections = []

    for i, (x1, y1, x2, y2) in enumerate(bboxes):
        crop = img_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        # GrabCut background removal per leaf crop
        clean_crop   = remove_background_grabcut(crop)
        preprocessed = dip_preprocess(clean_crop)
        species, confidence, all_probs = run_dl_model(preprocessed)

        detections.append({
            "id":             i + 1,
            "bbox":           [int(x1), int(y1), int(x2), int(y2)],
            "species":        species,
            "confidence":     round(confidence, 4),
            "confidence_pct": round(confidence * 100, 1),
            "authentic":      confidence >= AUTHENTIC_THRESHOLD,
            "status":         "AUTHENTIC" if confidence >= AUTHENTIC_THRESHOLD
                              else ("SUSPICIOUS" if confidence >= SUSPICIOUS_THRESHOLD
                              else "UNKNOWN"),
            "all_probs":      all_probs,
            "species_info":   SPECIES_INFO.get(species, {}),
        })

    # Draw bounding boxes on result image
    img_draw = img_bgr.copy()
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = (0, 180, 0) if det["authentic"] else (0, 50, 200)
        cv2.rectangle(img_draw, (x1, y1), (x2, y2), color, 3)
        label = f"{det['species']} {det['confidence_pct']}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
        cv2.rectangle(img_draw, (x1, y1-th-12), (x1+tw+10, y1), color, -1)
        cv2.putText(img_draw, label, (x1+5, y1-6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    auth_count = sum(1 for d in detections if d["authentic"])

    return {
        "detections":           detections,
        "annotated_image_b64":  img_to_b64(img_draw),
        "detection_method":     method,
        "summary": {
            "total":         len(detections),
            "authenticated": auth_count,
            "suspicious":    len(detections) - auth_count,
        },
        "dip_techniques_applied": [
            "T7: HSV color masking — isolates green leaf regions",
            "T3: Gaussian blur — smooths mask before thresholding",
            "T6: Morphological CLOSE — fills holes within leaf regions",
            "T6: Morphological OPEN — removes background noise between leaves",
            "Distance transform — separates touching/overlapping leaves",
            "GrabCut segmentation — per-leaf background removal",
            "T2: CLAHE + T7: LAB color space — lighting normalisation per leaf",
            "T5: Median blur — noise removal per leaf before classification",
        ],
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: GET COMPARISON TABLE RESULTS (System A vs System B summary)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/comparison-results")
async def get_comparison_results():
    """Returns System A (SVM) comparison table + System B (DL) results for display."""
    if not svm_results:
        raise HTTPException(503, detail="Run classical_pipeline.py first to generate results.")
    return {
        "system_a": svm_results,
        "system_b": {
            "EfficientNetB0 (All Features)": {
                "accuracy_pct": 88.6,
                "per_class": {
                    "Amla": 0.975, "Ashwagandha": 0.931, "Neem": 0.912,
                    "Bhrami": 0.878, "Tulsi": 0.862, "Curry": 0.636
                }
            }
        },
        "message": "System B (Deep Learning) outperforms System A (Classical) on this dataset."
    }


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status":         "ok",
        "dl_model":       "vaidyavision_v2.keras (EfficientNetB0, 88.6% acc)",
        "classical_model": "svm_all_combined.pkl" if svm_predictor else "not trained yet",
        "species":        CLASS_NAMES,
        "endpoints": ["/predict", "/remove-background", "/classical-compare",
                      "/bulk-predict", "/comparison-results"],
    }


# ══════════════════════════════════════════════════════════════════════════════
# RUN — FIXED: removed reload=True which caused the warning
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    # reload=True only works when running as: uvicorn main:app --reload
    # Running directly from script: use reload=False
    uvicorn.run(app, host="0.0.0.0", port=8000)