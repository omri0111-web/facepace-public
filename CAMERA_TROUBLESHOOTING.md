# 📷 Camera Troubleshooting Guide

## 🐛 Issue: Camera Won't Open on Enrollment Page

If the camera doesn't start when you click "📷 Start Camera" on the enrollment page, follow these steps:

---

## ✅ **Fix Applied**

I've updated the camera code with:
1. ✅ Better error handling and logging
2. ✅ Added `muted` attribute to video element (required for autoplay)
3. ✅ Explicit `video.play()` call
4. ✅ Detailed error messages for different failure scenarios

---

## 🔍 **Debugging Steps**

### **1. Check Browser Console**

Open the browser console (F12) and look for these messages:

**Success:**
```
📷 Requesting camera access...
✅ Camera access granted
✅ Video playing
✅ Camera started successfully
```

**Permission Denied:**
```
❌ Camera error: NotAllowedError
Failed to access camera. Please allow camera permissions in your browser.
```

**No Camera Found:**
```
❌ Camera error: NotFoundError
Failed to access camera. No camera found on this device.
```

**Camera In Use:**
```
❌ Camera error: NotReadableError
Failed to access camera. Camera is already in use by another application.
```

---

## 🛠️ **Common Fixes**

### **Fix 1: Allow Camera Permissions**

**Chrome/Edge:**
1. Click the 🔒 or ⓘ icon in the address bar
2. Find "Camera" permission
3. Change to "Allow"
4. Refresh the page

**Firefox:**
1. Click the 🔒 icon in the address bar
2. Click "Connection secure" → "More information"
3. Go to "Permissions" tab
4. Find "Use the Camera"
5. Uncheck "Use default" and select "Allow"
6. Refresh the page

**Safari:**
1. Safari → Settings → Websites → Camera
2. Find localhost:3000
3. Change to "Allow"
4. Refresh the page

---

### **Fix 2: Close Other Apps Using Camera**

If you see "Camera is already in use":
1. Close Zoom, Teams, Skype, or other video apps
2. Close other browser tabs using the camera
3. Restart your browser
4. Try again

---

### **Fix 3: Check System Permissions (Mac)**

1. Open **System Settings** → **Privacy & Security**
2. Click **Camera**
3. Make sure your browser is checked/enabled
4. Restart browser if you just enabled it

---

### **Fix 4: Check System Permissions (Windows)**

1. Open **Settings** → **Privacy** → **Camera**
2. Make sure "Allow apps to access your camera" is ON
3. Scroll down and make sure your browser is ON
4. Restart browser if you just enabled it

---

### **Fix 5: Try Different Browser**

If one browser doesn't work, try:
- Chrome (best compatibility)
- Edge
- Firefox
- Safari (Mac only)

---

### **Fix 6: Check for HTTPS**

Some browsers require HTTPS for camera access (except localhost):
- ✅ `http://localhost:3000` - Should work
- ✅ `http://127.0.0.1:3000` - Should work
- ❌ `http://192.168.x.x:3000` - May not work (use HTTPS)

---

## 🧪 **Test Camera Access**

Before testing the enrollment page, verify your camera works:

1. **Test in browser:**
   - Open: https://www.onlinemictest.com/webcam-test/
   - Click "Test my cam"
   - Camera should show video

2. **Test system camera:**
   - Mac: Open "Photo Booth" app
   - Windows: Open "Camera" app
   - Should show video

If camera doesn't work in these tests, it's a system/hardware issue, not the app.

---

## 📋 **Expected Behavior**

When camera starts correctly:

1. **Click "📷 Start Camera"**
2. **Browser shows permission prompt** (first time only)
3. **Click "Allow"**
4. **Video feed appears** in a blue-bordered box
5. **Two buttons appear:**
   - "📸 Capture Photo" (blue)
   - "Stop Camera" (gray)

---

## 🎥 **Camera Features**

Once camera is working:

- **Capture photos:** Click "📸 Capture Photo"
- **Quality check:** Each photo is automatically checked for quality
- **Preview:** Captured photos show below with green border
- **Remove:** Click ❌ on any photo to remove it
- **Progress:** Shows "X/4 photos captured"
- **Average quality:** Shows quality score after capturing photos

---

## 🔧 **Advanced Debugging**

### **Check if camera is detected:**

Open browser console and run:
```javascript
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const cameras = devices.filter(d => d.kind === 'videoinput')
    console.log('Cameras found:', cameras.length)
    cameras.forEach(cam => console.log('  -', cam.label || 'Unknown camera'))
  })
```

Should show at least 1 camera.

### **Test camera access directly:**

```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('✅ Camera access works!')
    stream.getTracks().forEach(track => track.stop())
  })
  .catch(err => {
    console.error('❌ Camera error:', err.name, err.message)
  })
```

---

## 📝 **Still Not Working?**

If camera still won't start after trying all fixes:

1. **Check console logs** (F12) for error messages
2. **Copy the error message**
3. **Try a different device** (phone, tablet, different computer)
4. **Report the issue** with:
   - Browser name and version
   - Operating system
   - Error message from console
   - Screenshot of the error

---

## ✅ **Verification**

Camera is working correctly when:
- [x] Click "Start Camera" opens video feed
- [x] Video shows live camera feed
- [x] "Capture Photo" button works
- [x] Photos show quality score
- [x] Can capture 4 photos
- [x] Can remove photos
- [x] Can submit form after capturing 4 photos

---

## 🎉 **Success!**

Once camera is working, continue with the enrollment:
1. Capture 4 photos (different angles)
2. Fill in all form fields
3. Click "Submit Enrollment"
4. Should see success message!

---

**Need more help?** Check the browser console (F12) for detailed error messages!

