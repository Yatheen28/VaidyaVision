# quick_test.py — run this from C:\DIP_PBL\
import tensorflow as tf
import numpy as np
import cv2
import os

model = tf.keras.models.load_model('models/vaidyavision_v2.keras')

# Pick 2-3 real images from your Images_processed folder — one per species
test_images = {
    'Tulsi':       r'Images_processed/fake/unknown_1.jpg',
    'Neem':        r'Images_processed/fake/unknown_2.jpg',
    'Amla':        r'Images_processed/fake/unknown_3.jpg',
    'Banana':      r'Images_processed/fake/uk_4.jpg'
}
class_names = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi']

for true_label, path in test_images.items():
    img = cv2.imread(path)
    img = cv2.resize(img, (224, 224))
    img = np.expand_dims(img, axis=0).astype(np.float32)
    preds = model.predict(img, verbose=0)[0]
    predicted = class_names[np.argmax(preds)]
    confidence = np.max(preds) * 100
    print(f"True: {true_label:12} → Predicted: {predicted:12} ({confidence:.1f}%)")