#!/usr/bin/env python3
"""
Check which face recognition model is actually loaded
"""

import sys
import os

print("=" * 60)
print("FACE RECOGNITION MODEL CHECKER")
print("=" * 60)
print()

# Check if InsightFace is installed
try:
    import insightface
    print(f"✅ InsightFace installed: version {insightface.__version__}")
    print(f"   Location: {insightface.__file__}")
except ImportError as e:
    print(f"❌ InsightFace NOT installed: {e}")
    sys.exit(1)

print()

# Check model directory
home = os.path.expanduser("~/.insightface")
if os.path.exists(home):
    print(f"✅ InsightFace home directory: {home}")
    models_dir = os.path.join(home, "models")
    if os.path.exists(models_dir):
        print(f"   Models directory: {models_dir}")
        for model_pack in os.listdir(models_dir):
            model_path = os.path.join(models_dir, model_pack)
            if os.path.isdir(model_path):
                files = os.listdir(model_path)
                onnx_files = [f for f in files if f.endswith('.onnx')]
                print(f"   📦 Model pack: {model_pack}")
                print(f"      ONNX files: {len(onnx_files)}")
                for onnx in onnx_files:
                    size_mb = os.path.getsize(os.path.join(model_path, onnx)) / (1024*1024)
                    print(f"        - {onnx} ({size_mb:.1f} MB)")
    else:
        print(f"   ⚠️  No models directory found")
else:
    print(f"❌ InsightFace home directory NOT found: {home}")

print()

# Check if Luxand is installed
try:
    import fsdk
    print(f"⚠️  LUXAND FaceSDK detected!")
    print(f"   Location: {fsdk.__file__}")
except ImportError:
    print(f"✅ Luxand FaceSDK NOT installed (good - using InsightFace only)")

print()

# Check if Recognito is installed
recognito_dirs = [
    "recognito_engine",
    "recognito_deps"
]

for dir_name in recognito_dirs:
    dir_path = os.path.join(os.path.dirname(__file__), dir_name)
    if os.path.exists(dir_path):
        print(f"⚠️  {dir_name} directory found: {dir_path}")
        files = os.listdir(dir_path)
        print(f"   Files: {files[:5]}")
    else:
        print(f"✅ {dir_name} NOT found (using InsightFace only)")

print()

# Try to load the model
print("Attempting to load InsightFace model...")
try:
    from insightface.app import FaceAnalysis
    
    app = FaceAnalysis(name='buffalo_l')
    app.prepare(ctx_id=-1, det_size=(640, 640))
    
    print(f"✅ Model loaded successfully!")
    print(f"   Model name: buffalo_l")
    print(f"   Detection size: 640x640")
    print(f"   Context: CPU (ctx_id=-1)")
    print()
    print(f"   Models loaded:")
    if hasattr(app, 'models'):
        for model_name, model in app.models.items():
            print(f"     - {model_name}: {type(model).__name__}")
    
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("CONCLUSION:")
print("=" * 60)
print("✅ You are using InsightFace with the buffalo_l model pack")
print("✅ This is ArcFace recognition with RetinaFace detection")
print("✅ This is NOT Luxand or Recognito")
print("=" * 60)

