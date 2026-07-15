<div align="center">
  <h1>🌿 VaidyaVision</h1>
  <p><strong>An Advanced, Hybrid AI-Based Medicinal Leaf Authentication System</strong></p>
</div>

---

## 📖 Overview

**VaidyaVision** is a comprehensive, full-stack application designed to authenticate Ayurvedic medicinal plants with high confidence. Identifying medicinal leaves can be extremely difficult because many medicinal plants have visual "imposters" (e.g., Neem vs. Curry leaves, Ashwagandha vs. Withania coagulans). 

VaidyaVision solves this by acting as an "expert eye," combining the pattern recognition of modern Deep Learning with the mathematically rigorous analysis of Classical Digital Image Processing (DIP). 

### Supported Ayurvedic Plants
The system natively supports and distinguishes:
- **Amla** (Indian Gooseberry)
- **Ashwagandha** (Indian Ginseng)
- **Bhrami** 
- **Curry Leaf**
- **Neem**
- **Tulsi** (Holy Basil)

---

## 🧠 The Hybrid AI Architecture (Backend)

The core brain of the system runs in `backend/main.py` using **FastAPI**. It employs a unique dual-pipeline approach to ensure predictions are not just confident, but *correct*.

### 1. Deep Learning Pipeline (DL)
- Uses a custom-trained **`.keras` CNN model** (`vaidyavision_v3.keras`).
- Handles initial spatial feature extraction and provides a baseline prediction.
- Applies **Temperature Scaling** to raw model logits to calibrate probabilities.

### 2. Classical Digital Image Processing Pipeline (SVM)
Deep Learning models can often be "confidently wrong." To counter this, we use a Classical DIP pipeline via OpenCV to extract exact mathematical features. This data is fed into an **SVM Classifier** (`svm_all_combined.pkl`).
- **Feature Set A (Color):** Extracts exact HSV histograms (96-dimensional vectors) to capture minute hue differences.
- **Feature Set B (Texture):** Uses GLCM-style processing, CLAHE, median blurring, and Sobel edge magnitude to analyze leaf surface texture (20-dimensional vectors).
- **Feature Set C (Shape & Vein Geometry):** Uses Canny edge detection, morphological dilation/erosion, and contours to calculate physical geometry such as circularity, perimeter, and area ratios (18-dimensional vectors).

### 3. YOLO Bulk Detection
- For users needing to process multiple leaves simultaneously, the system uses a **YOLOv8** object detection model (`yolo_leaf_detector.pt`) to draw bounding boxes and identify multiple leaves in a single frame.

### 4. Fused Scoring System
The backend aggregates the DL and Classical pipeline scores. 
- It applies an **Entropy Penalty** to reduce overconfidence when an image looks like "none of the above" (e.g., an unseen leaf).
- It categorizes the final prediction into one of 5 strict verdicts:
  - `AUTHENTIC` (High Confidence Match)
  - `ADULTERATED` (High Confidence Imposter)
  - `SUSPICIOUS` (Conflicting signals between AI models)
  - `VERIFY` (Low Confidence)
  - `UNKNOWN` (Unrecognized object)

---

## 💻 The Frontend Architecture (React)

The user interface is built for speed, aesthetics, and clarity, located in the `src/` (or `vaidyavision-ui/src/`) directory.

### Tech Stack
- **React + Vite:** For ultra-fast hot module replacement and component-based UI.
- **Tailwind CSS:** For sleek, responsive, and modern styling.
- **Framer Motion:** For micro-animations and smooth page transitions.
- **Recharts:** For rendering the visual distribution of the AI's confidence scores.

### Key Modules
- **DropZone:** A drag-and-drop file upload component that parses the image before sending it to the FastAPI backend.
- **Confidence Gauge:** A dynamic, animated dial that visually represents the `fused_score` percentage.
- **Prediction Chart:** A bar chart showing how the AI weighed the probabilities of each species.
- **Species Context (Ayush):** Displays hardcoded, expert-verified data from `speciesData.js`, explaining the medicinal uses, the Ayush context, and the common visual adulterants for the detected leaf.

---

## 🛠️ Setup & Local Installation

### Prerequisites
- Node.js (v16+)
- Python (3.9+)

### 1. Clone the repository
```bash
git clone https://github.com/Yatheen28/DIP_PBL.git
cd DIP_PBL
```

### 2. Run the Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Activate the virtual environment
source venv/bin/activate    # Linux/Mac
venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server (runs on http://localhost:8000)
uvicorn main:app --reload
```

### 3. Run the Frontend (React / Vite)
Open a new terminal window.
```bash
# Navigate to the UI directory
cd vaidyavision-ui

# Install Node modules
npm install

# Start the dev server (runs on http://localhost:5173)
npm run dev
```

---

## 📂 Project Structure

```text
VaidyaVision/
├── backend/                   # FastAPI backend server
│   ├── main.py                # Core API, scoring fusion, and pipeline logic
│   └── requirements.txt       # Python dependencies
├── models/                    # AI Weights (Not synced in git if large)
│   ├── vaidyavision_v3.keras  # Primary DL Model
│   ├── svm_all_combined.pkl   # Classical DIP Model
│   └── yolo_leaf_detector.pt  # Bulk Detection Model
├── vaidyavision-ui/           # React Frontend Application
│   ├── src/
│   │   ├── components/        # Reusable UI elements (Navbar, DropZone, etc.)
│   │   ├── pages/             # Route views (Landing, Authenticate, BulkDetect)
│   │   ├── data/              # Hardcoded Ayush contextual data
│   │   └── App.jsx            # Routing and core layout
│   ├── tailwind.config.js     # Styling configuration
│   └── package.json           # Node dependencies
├── classical_pipeline.py      # Standalone script for DIP feature extraction
├── train.py & train_v3.py     # Scripts for training the DL models
└── README.md                  # Project documentation
```

---

## 📄 License
This project is licensed under the MIT License.