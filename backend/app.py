from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2 as cv
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from transformers import pipeline
import torch

app = Flask(__name__)
CORS(app)

# Load a food classification model from Hugging Face
# We'll use a fast one for demo purposes
print("Loading Hugging Face model...")
classifier = pipeline("image-classification", model="microsoft/resnet-50")

def analyze_freshness(image_np):
    """
    Simulate freshness analysis using OpenCV.
    Calculates vibrancy (saturation) and sharpness (texture).
    """
    # Convert to HSV to check vibrancy/saturation
    hsv = cv.cvtColor(image_np, cv.COLOR_BGR2HSV)
    saturation = hsv[:,:,1].mean()
    
    # Check sharpness using Laplacian variance
    gray = cv.cvtColor(image_np, cv.COLOR_BGR2GRAY)
    sharpness = cv.Laplacian(gray, cv.CV_64F).var()
    
    # Normalize scores (very simplified)
    # Saturation usually 0-255, 100+ is quite vibrant
    sat_score = min(100, (saturation / 150) * 100)
    # Sharpness varies wildly, let's say 100+ is "firm"
    sharp_score = min(100, (sharpness / 500) * 100)
    
    freshness_index = (sat_score * 0.6) + (sharp_score * 0.4)
    return round(freshness_index, 1)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        # Decode base64 image
        image_data = data['image'].split(",")[1]
        image_bytes = base64.b64decode(image_data)
        
        # Convert to PIL for Hugging Face
        pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Convert to OpenCV format (numpy)
        open_cv_image = np.array(pil_image)
        # Convert RGB to BGR for OpenCV
        open_cv_image = open_cv_image[:, :, ::-1].copy()
        
        # 1. Hugging Face Classification
        predictions = classifier(pil_image)
        top_prediction = predictions[0]
        
        # 2. OpenCV Freshness Analysis
        freshness_score = analyze_freshness(open_cv_image)
        
        # 3. Generate mock details based on classification
        label = top_prediction['label'].replace("_", " ").title()
        
        return jsonify({
            "success": True,
            "label": label,
            "confidence": round(top_prediction['score'] * 100, 2),
            "freshness_score": freshness_score,
            "details": {
                "pesticides": "0.01 mg/kg" if freshness_score > 80 else "0.05 mg/kg",
                "bacteria": "Minimal" if freshness_score > 70 else "Trace amounts",
                "shelf_life": f"{max(1, int(freshness_score/10))} days"
            }
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
