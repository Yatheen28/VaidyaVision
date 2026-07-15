# 🌿 VaidyaVision

**VaidyaVision** is a full-stack AI-based medicinal leaf authentication system designed to identify key Ayurvedic medicinal plants and flag potential adulterants (fakes) with high confidence.

## 🚀 Features

- **Dual-Pipeline Authentication:** Employs a unique Hybrid AI approach that fuses modern Deep Learning (YOLO/CNNs) with Classical Digital Image Processing (DIP/SVM) for robust predictions.
- **Support for Key Ayurvedic Plants:** Identifies Amla, Ashwagandha, Bhrami, Curry, Neem, and Tulsi, while checking for common visual imposters (e.g., Tamarind, Gotu Kola).
- **Rich User Interface:** Beautiful, responsive React frontend featuring Drag & Drop uploads, a Confidence Gauge, and detailed Prediction Charts.
- **Bulk Detection:** Process multiple leaves simultaneously using our YOLO-based leaf detection module.
- **Ayush Context:** Provides contextual Ayurvedic information for detected species including medicinal uses and known adulterants.

## 🏗️ Architecture

### Backend (Python + FastAPI)
Located in `backend/main.py`, the backend runs the core authentication logic:
1. **Deep Learning Pipeline:** Uses a custom trained `.keras` model (`vaidyavision_v3.keras`) to generate initial confidence logits.
2. **Classical DIP Pipeline:** Acts as the "expert eye," mathematically analyzing the image via OpenCV:
   - **Color:** HSV Histograms
   - **Texture:** GLCM-style processing (CLAHE, blurring, Sobel edges)
   - **Shape/Vein Geometry:** Edge detection, morphological operations, and contours.
3. **Fused Scoring:** Combines DL and Classical SVM predictions with temperature scaling and entropy penalties to reduce overconfidence on unseen objects, yielding a final verdict (e.g., `AUTHENTIC`, `ADULTERATED`, `UNKNOWN`).

### Frontend (React + Vite + Tailwind CSS)
Located in `src/`, the modern frontend leverages:
- **Tailwind CSS:** For rapid, aesthetic styling.
- **Framer Motion:** For smooth page transitions and micro-animations.
- **Recharts:** For breaking down the model's confidence distribution visually.

## 🛠️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/VaidyaVision.git
cd VaidyaVision
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
# In the project root (or vaidyavision-ui folder)
npm install
npm run dev
```

## 🧠 Models
Pre-trained models are located in the `models/` directory:
- `vaidyavision_v3.keras` - Deep Learning Model
- `svm_all_combined.pkl` - Classical DIP SVM Classifier
- `yolo_leaf_detector.pt` - YOLOv8 model for Bulk Leaf Detection

## 📄 License
This project is licensed under the MIT License.