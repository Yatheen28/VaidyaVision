import os
import cv2
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
 
# ── GPU CHECK ────────────────────────────────────────────────────────────────
print("GPUs available:", tf.config.list_physical_devices('GPU'))
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    tf.config.experimental.set_memory_growth(gpus[0], True)
    print("GPU memory growth enabled")
 
# ── CONFIG ───────────────────────────────────────────────────────────────────
DATA_DIR      = r"C:\DIP_PBL\Images"
MODELS_DIR    = r"C:\DIP_PBL\models"
IMG_SIZE      = 224
BATCH_SIZE    = 32
EPOCHS_PHASE1 = 15
EPOCHS_PHASE2 = 30
os.makedirs(MODELS_DIR, exist_ok=True)
 
# Exact folder names — must match your Images/ subfolders exactly
CLASS_NAMES = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']
 
# ── GRABCUT: removes background from Ashwagandha plant images ────────────────
def apply_grabcut(img):
    """
    DIP Technique: Image Segmentation using GrabCut
    Isolates the plant from background (pots, brick floors etc.)
    Used specifically for Ashwagandha which only has whole-plant images.
    """
    mask = np.zeros(img.shape[:2], np.uint8)
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
 
    h, w = img.shape[:2]
    rect = (10, 10, w - 20, h - 20)
 
    try:
        cv2.grabCut(img, mask, rect, bg_model, fg_model, 5, cv2.GC_INIT_WITH_RECT)
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        result = img * mask2[:, :, np.newaxis]
        result[mask2 == 0] = [255, 255, 255]
        return result
    except:
        return img
 
# ── STANDARD PREPROCESSING PIPELINE ─────────────────────────────────────────
def preprocess_image(img_path, is_ashwagandha=False):
    """
    Applies DIP techniques in sequence:
    1. Resize
    2. Noise Removal (Technique 5) — Median filter
    3. GrabCut segmentation — only for Ashwagandha
    4. Color Space: BGR → LAB (Technique 7 + Bonus beyond RGB)
    5. Histogram Processing: CLAHE on L channel (Technique 2)
    6. Convert back to RGB and return
    Note: NO rescaling here — EfficientNetB0 expects pixel values in [0,255]
          and handles its own normalization internally via preprocess_input.
    """
    img = cv2.imread(img_path)
    if img is None:
        return None
 
    # Resize to model input size
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
 
    # Technique 5: Noise Removal — Median filter removes sensor noise
    img = cv2.medianBlur(img, 3)
 
    # GrabCut for Ashwagandha only
    if is_ashwagandha:
        img = apply_grabcut(img)
 
    # Technique 7 + BONUS: Color Space — BGR to LAB
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
 
    # Technique 2: Histogram Processing — CLAHE on L channel
    # Standardizes brightness across images from different lighting conditions
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
 
    # Merge back and convert to RGB
    lab = cv2.merge([l, a, b])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
 
    # Return as uint8 [0,255] — EfficientNet preprocess_input handles normalization
    return img.astype(np.uint8)
 
# ── PREPROCESS AND SAVE ALL IMAGES ───────────────────────────────────────────
PROCESSED_DIR = r"C:\DIP_PBL\Images_processed"
 
def preprocess_all_images():
    print("\n" + "="*50)
    print("PREPROCESSING ALL IMAGES")
    print("="*50)
 
    if os.path.exists(PROCESSED_DIR):
        print("Processed folder already exists — skipping preprocessing.")
        print("Delete C:\\DIP_PBL\\Images_processed to reprocess.")
        return
 
    for class_name in CLASS_NAMES:
        src_dir = os.path.join(DATA_DIR, class_name)
        dst_dir = os.path.join(PROCESSED_DIR, class_name)
        os.makedirs(dst_dir, exist_ok=True)
 
        is_ashwa = (class_name == 'Ashwagandha')
        images = [f for f in os.listdir(src_dir)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
 
        print(f"\nProcessing {class_name} ({len(images)} images)...")
        success = 0
        for fname in images:
            src_path = os.path.join(src_dir, fname)
            dst_path = os.path.join(dst_dir,
                                    os.path.splitext(fname)[0] + '.jpg')
            processed = preprocess_image(src_path, is_ashwagandha=is_ashwa)
            if processed is not None:
                # Save as BGR (cv2 default)
                save_img = cv2.cvtColor(processed, cv2.COLOR_RGB2BGR)
                cv2.imwrite(dst_path, save_img)
                success += 1
 
        print(f"  Saved {success}/{len(images)} images")
 
    print("\nPreprocessing complete!")
 
# ── DATA GENERATORS ───────────────────────────────────────────────────────────
def create_generators():
    """
    KEY FIX: No rescale=1./255 here.
    EfficientNetB0 uses its own preprocess_input internally (added in build_model).
    Rescaling to [0,1] before preprocess_input was corrupting the input data
    and causing the model to be stuck at ~17% accuracy.
    """
    train_datagen = ImageDataGenerator(
        # NO rescale here — EfficientNet handles its own preprocessing
        rotation_range=40,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.15,
        zoom_range=0.25,
        horizontal_flip=True,
        vertical_flip=True,
        brightness_range=[0.6, 1.4],
        fill_mode='nearest',
        validation_split=0.2
    )
 
    val_datagen = ImageDataGenerator(
        # NO rescale here either
        validation_split=0.2
    )
 
    train_gen = train_datagen.flow_from_directory(
        PROCESSED_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        shuffle=True,
        classes=CLASS_NAMES
    )
 
    val_gen = val_datagen.flow_from_directory(
        PROCESSED_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        shuffle=False,
        classes=CLASS_NAMES
    )
 
    print("\nClass indices:", train_gen.class_indices)
    print("Training samples:", train_gen.samples)
    print("Validation samples:", val_gen.samples)
 
    return train_gen, val_gen
 
# ── COMPUTE CLASS WEIGHTS ────────────────────────────────────────────────────
def get_class_weights(train_gen):
    total = train_gen.samples
    weights = {}
    for i, name in enumerate(CLASS_NAMES):
        count = len([f for f in os.listdir(
            os.path.join(PROCESSED_DIR, name))
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        weights[i] = (total / (len(CLASS_NAMES) * count))
    print("\nClass weights:", weights)
    return weights
 
# ── BUILD MODEL ───────────────────────────────────────────────────────────────
def build_model(num_classes):
    """
    KEY FIX: Added tf.keras.applications.efficientnet.preprocess_input as
    the first operation. This is EfficientNet's own normalization that expects
    pixel values in [0, 255] range. Without this, or with manual rescale=1/255
    before this, the model receives incorrectly scaled inputs and fails to learn.
    """
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3)
    )
    base_model.trainable = False
 
    inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
 
    # ── THIS IS THE KEY FIX ──────────────────────────────────────────────────
    # EfficientNetB0's own preprocessing — must receive [0,255] pixel values
    # Converts internally to the format EfficientNet was trained on
    x = tf.keras.applications.efficientnet.preprocess_input(inputs)
    # ────────────────────────────────────────────────────────────────────────
 
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
 
    model = Model(inputs, outputs)
    return model, base_model
 
# ── PLOT TRAINING HISTORY ────────────────────────────────────────────────────
def plot_history(history, phase_name):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
 
    ax1.plot(history.history['accuracy'], label='Train Accuracy')
    ax1.plot(history.history['val_accuracy'], label='Val Accuracy')
    ax1.set_title(f'{phase_name} — Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax1.grid(True)
 
    ax2.plot(history.history['loss'], label='Train Loss')
    ax2.plot(history.history['val_loss'], label='Val Loss')
    ax2.set_title(f'{phase_name} — Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    ax2.grid(True)
 
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_DIR, f'{phase_name}_history.png'))
    plt.show()
    print(f"Plot saved to models folder")
 
# ── EVALUATE MODEL ───────────────────────────────────────────────────────────
def evaluate_model(model, val_gen):
    print("\n" + "="*50)
    print("EVALUATING MODEL")
    print("="*50)
 
    val_gen.reset()
    y_pred_probs = model.predict(val_gen, verbose=1)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = val_gen.classes
 
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=CLASS_NAMES))
 
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Greens',
                xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
    plt.title('Confusion Matrix — VaidyaVision Model')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_DIR, 'confusion_matrix.png'))
    plt.show()
    print("Confusion matrix saved!")
 
    return y_pred, y_true
 
# ── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
 
    # Step 1: Preprocess all images with DIP techniques
    preprocess_all_images()
 
    # Step 2: Create data generators (NO rescale — EfficientNet handles it)
    train_gen, val_gen = create_generators()
    num_classes = len(CLASS_NAMES)
 
    # Step 3: Class weights to handle imbalance
    class_weights = get_class_weights(train_gen)
 
    # Step 4: Build model with EfficientNet preprocess_input layer
    model, base_model = build_model(num_classes)
    model.summary()
 
    # ── PHASE 1: Train classifier head only (base frozen) ────────────────────
    print("\n" + "="*50)
    print("PHASE 1: Training classifier head (base model frozen)")
    print("="*50)
 
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
 
    callbacks_p1 = [
        EarlyStopping(monitor='val_accuracy', patience=5,
                      restore_best_weights=True, verbose=1),
        ModelCheckpoint(
            os.path.join(MODELS_DIR, 'phase1_best.keras'),
            monitor='val_accuracy', save_best_only=True, verbose=1
        )
    ]
 
    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS_PHASE1,
        class_weight=class_weights,
        callbacks=callbacks_p1
    )
 
    plot_history(history1, 'Phase1_Frozen')
    p1_acc = max(history1.history['val_accuracy'])
    print(f"\nPhase 1 best val accuracy: {p1_acc:.4f} ({p1_acc*100:.1f}%)")
 
    # ── PHASE 2: Unfreeze top 30 layers and fine-tune ─────────────────────────
    print("\n" + "="*50)
    print("PHASE 2: Fine-tuning top layers of EfficientNetB0")
    print("="*50)
 
    base_model.trainable = True
    for layer in base_model.layers[:-50]:
        layer.trainable = False
 
    trainable_count = sum(1 for l in base_model.layers if l.trainable)
    print(f"Trainable layers in base: {trainable_count}/{len(base_model.layers)}")
 
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
 
    callbacks_p2 = [
        EarlyStopping(monitor='val_accuracy', patience=7,
                      restore_best_weights=True, verbose=1),
        ModelCheckpoint(
            os.path.join(MODELS_DIR, 'vaidyavision_best.keras'),
            monitor='val_accuracy', save_best_only=True, verbose=1
        ),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                          patience=3, min_lr=1e-7, verbose=1)
    ]
 
    history2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS_PHASE2,
        class_weight=class_weights,
        callbacks=callbacks_p2
    )
 
    plot_history(history2, 'Phase2_Finetune')
 
    # ── SAVE FINAL MODEL ──────────────────────────────────────────────────────
    final_path = os.path.join(MODELS_DIR, 'vaidyavision_v2.keras')
    model.save(final_path)
    print(f"\nFinal model saved: {final_path}")
 
    # ── EVALUATE ──────────────────────────────────────────────────────────────
    evaluate_model(model, val_gen)
 
    final_acc = max(history2.history['val_accuracy'])
    print("\n" + "="*50)
    print(f"TRAINING COMPLETE — VaidyaVision")
    print(f"Phase 1 best accuracy : {p1_acc:.4f}  ({p1_acc*100:.1f}%)")
    print(f"Phase 2 best accuracy : {final_acc:.4f}  ({final_acc*100:.1f}%)")
    print(f"Model saved at        : {final_path}")
    print("="*50)
