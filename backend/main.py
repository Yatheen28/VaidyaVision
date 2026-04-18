"""
VaidyaVision Backend — FastAPI Server
Minimal backend wrapping the trained EfficientNetB0 model and bulk detection pipeline.
"""

import os
import io
import base64
import tempfile
import numpy as np
import cv2
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── CONFIG ────────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'vaidyavision_v2.keras')
CLASS_NAMES = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']
IMG_SIZE = 224
CONFIDENCE_THRESHOLD = 0.55

# ── LOAD MODEL AT STARTUP ────────────────────────────────────────────────────
print(f"Loading model from: {os.path.abspath(MODEL_PATH)}")
model = tf.keras.models.load_model(MODEL_PATH)
print("[OK] VaidyaVision model loaded successfully")

# ── FASTAPI APP ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="VaidyaVision API",
    description="AI-powered medicinal leaf authentication",
    version="1.0.0",
)

# CORS — allow frontend at any localhost port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
# DIP PREPROCESSING — identical pipeline from train.py
# ══════════════════════════════════════════════════════════════════════════════

def preprocess_single(img_bgr):
    """
    Apply same DIP pipeline as training:
    1. Resize to 224×224
    2. Median blur (noise removal)
    3. BGR→LAB color space
    4. CLAHE on L channel (histogram equalization)
    5. LAB→BGR→RGB
    Returns uint8 [0,255] — EfficientNet handles its own normalization.
    """
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


def read_upload_as_cv2(file_bytes):
    """Convert uploaded file bytes to OpenCV BGR image."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: SINGLE LEAF PREDICTION
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    """
    Accepts an image file, runs the DIP preprocessing pipeline,
    then classifies using the EfficientNetB0 model.
    """
    try:
        contents = await image.read()
        img_bgr = read_upload_as_cv2(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    # Preprocess with same DIP pipeline as training
    preprocessed = preprocess_single(img_bgr)
    img_array = np.expand_dims(preprocessed, axis=0).astype(np.float32)

    # Run inference
    predictions = model.predict(img_array, verbose=0)
    probs = predictions[0]

    confidence = float(np.max(probs))
    species_idx = int(np.argmax(probs))
    species = CLASS_NAMES[species_idx]

    # Build all_probs dict
    all_probs = {name: round(float(probs[i]), 4) for i, name in enumerate(CLASS_NAMES)}

    return {
        "species": species,
        "confidence": round(confidence, 4),
        "authentic": confidence >= CONFIDENCE_THRESHOLD,
        "all_probs": all_probs,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: BULK DETECTION
# ══════════════════════════════════════════════════════════════════════════════

def detect_grid_layout(img_bgr):
    """Grid detection from bulk_detect.py — finds collage/tray layouts."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    row_means = np.mean(gray, axis=1)
    col_means = np.mean(gray, axis=0)

    def find_dividers(means, size, min_gap=30):
        dividers = [0]
        smoothed = np.convolve(means, np.ones(5)/5, mode='same')
        grad = np.abs(np.diff(smoothed))
        threshold = np.percentile(grad, 92)
        i = 0
        while i < len(grad):
            if grad[i] > threshold:
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

    if len(row_divs) < 3 or len(col_divs) < 3:
        return []

    cells = []
    for i in range(len(row_divs) - 1):
        for j in range(len(col_divs) - 1):
            y1, y2 = row_divs[i], row_divs[i+1]
            x1, x2 = col_divs[j], col_divs[j+1]
            pad = 8
            y1c, y2c = min(y1+pad, y2-pad), max(y2-pad, y1+pad)
            x1c, x2c = min(x1+pad, x2-pad), max(x2-pad, x1+pad)
            if (y2c - y1c) > 40 and (x2c - x1c) > 40:
                cells.append((x1c, y1c, x2c, y2c))
    return cells


def contour_based_detection(img_bgr):
    """Contour detection fallback from bulk_detect.py."""
    detections = []
    h, w = img_bgr.shape[:2]
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_green = np.array([20, 25, 25])
    upper_green = np.array([95, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)
    mask = cv2.GaussianBlur(mask, (9, 9), 0)
    _, mask = cv2.threshold(mask, 50, 255, cv2.THRESH_BINARY)
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (12, 12))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open)
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
        x1, y1 = max(0, x-pad), max(0, y-pad)
        x2, y2 = min(w, x+bw+pad), min(h, y+bh+pad)
        crop = img_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        preprocessed = preprocess_single(crop)
        img_array = np.expand_dims(preprocessed, axis=0).astype(np.float32)
        preds = model.predict(img_array, verbose=0)
        confidence = float(np.max(preds))
        species = CLASS_NAMES[int(np.argmax(preds))]
        detections.append({
            'bbox': [int(x1), int(y1), int(x2), int(y2)],
            'species': species,
            'confidence': round(confidence, 4),
            'authentic': confidence >= CONFIDENCE_THRESHOLD,
        })
    return detections


def draw_annotated_image(img_bgr, detections):
    """Draw bounding boxes on the image and return as base64 JPEG."""
    img_draw = img_bgr.copy()
    for i, det in enumerate(detections):
        x1, y1, x2, y2 = det['bbox']
        color = (0, 200, 0) if det['authentic'] else (0, 50, 255)
        cv2.rectangle(img_draw, (x1, y1), (x2, y2), color, 3)
        label = f"{det['species']} {det['confidence']*100:.0f}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(img_draw, (x1, y1-th-10), (x1+tw+10, y1), color, -1)
        cv2.putText(img_draw, label, (x1+5, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

    _, buffer = cv2.imencode('.jpg', img_draw, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return base64.b64encode(buffer).decode('utf-8')


@app.post("/bulk-predict")
async def bulk_predict(image: UploadFile = File(...)):
    """
    3-stage bulk detection pipeline:
    1. Grid detection (collage/tray layouts)
    2. Contour detection (scattered leaves)
    3. Full-image fallback (single leaf)
    """
    try:
        contents = await image.read()
        img_bgr = read_upload_as_cv2(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    h, w = img_bgr.shape[:2]
    detections = []

    # Stage 1: Grid detection
    grid_cells = detect_grid_layout(img_bgr)
    if grid_cells:
        for (x1, y1, x2, y2) in grid_cells:
            crop = img_bgr[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            preprocessed = preprocess_single(crop)
            img_array = np.expand_dims(preprocessed, axis=0).astype(np.float32)
            preds = model.predict(img_array, verbose=0)
            confidence = float(np.max(preds))
            species = CLASS_NAMES[int(np.argmax(preds))]
            detections.append({
                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                'species': species,
                'confidence': round(confidence, 4),
                'authentic': confidence >= CONFIDENCE_THRESHOLD,
            })

    # Stage 2: Contour detection
    if not detections:
        detections = contour_based_detection(img_bgr)

    # Stage 3: Full-image fallback
    if not detections:
        preprocessed = preprocess_single(img_bgr)
        img_array = np.expand_dims(preprocessed, axis=0).astype(np.float32)
        preds = model.predict(img_array, verbose=0)
        confidence = float(np.max(preds))
        species = CLASS_NAMES[int(np.argmax(preds))]
        detections.append({
            'bbox': [0, 0, int(w), int(h)],
            'species': species,
            'confidence': round(confidence, 4),
            'authentic': confidence >= CONFIDENCE_THRESHOLD,
        })

    # Add IDs
    for i, det in enumerate(detections):
        det['id'] = i + 1

    # Draw annotated image
    annotated_b64 = draw_annotated_image(img_bgr, detections)

    auth_count = sum(1 for d in detections if d['authentic'])

    return {
        "detections": detections,
        "annotated_image_base64": annotated_b64,
        "summary": {
            "total": len(detections),
            "authenticated": auth_count,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: CLASSICAL DIP ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/classical-analysis")
async def classical_analysis(image: UploadFile = File(...)):
    """
    Classical Digital Image Processing pipeline:
    - Grayscale conversion
    - Edge detection (Canny)
    - Texture features (stats on grayscale)
    - Contour / vein-like extraction
    Returns base64-encoded result images + numeric features.
    """
    try:
        contents = await image.read()
        img_bgr = read_upload_as_cv2(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    img_resized = cv2.resize(img_bgr, (400, 400))

    # 1. Grayscale
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    # 2. Edge Detection — Canny
    edges = cv2.Canny(gray, 50, 150)

    # 3. Texture Features
    texture_mean = float(np.mean(gray))
    texture_std = float(np.std(gray))
    texture_entropy = float(-np.sum(
        (np.histogram(gray, bins=256, range=(0,256))[0] / gray.size + 1e-10) *
        np.log2(np.histogram(gray, bins=256, range=(0,256))[0] / gray.size + 1e-10)
    ))

    # 4. Vein-like feature extraction — use morphological gradient
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    morph_gradient = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)

    # Enhanced veins using CLAHE + adaptive threshold
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    veins = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 15, 5)

    # 5. Contour count
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour_count = len(contours)

    # 6. Color histogram features (HSV)
    hsv = cv2.cvtColor(img_resized, cv2.COLOR_BGR2HSV)
    h_mean = float(np.mean(hsv[:, :, 0]))
    s_mean = float(np.mean(hsv[:, :, 1]))
    v_mean = float(np.mean(hsv[:, :, 2]))

    # Encode images as base64
    def img_to_b64(img):
        _, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return base64.b64encode(buf).decode('utf-8')

    return {
        "edges": {
            "image_base64": img_to_b64(edges),
            "description": "Canny edge detection (thresholds: 50, 150)",
        },
        "texture": {
            "mean_intensity": round(texture_mean, 2),
            "std_intensity": round(texture_std, 2),
            "entropy": round(texture_entropy, 2),
            "description": "Grayscale texture statistics",
        },
        "vein_features": {
            "image_base64": img_to_b64(veins),
            "morph_gradient_base64": img_to_b64(morph_gradient),
            "contour_count": contour_count,
            "description": "Vein-like structures via adaptive thresholding and morphological gradient",
        },
        "color_features": {
            "hue_mean": round(h_mean, 2),
            "saturation_mean": round(s_mean, 2),
            "value_mean": round(v_mean, 2),
            "description": "HSV color space mean values",
        },
        "grayscale_base64": img_to_b64(gray),
    }


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "model": "vaidyavision_v2.keras", "species": CLASS_NAMES}


# ══════════════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
