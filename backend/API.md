# API Documentation

## Base URL
```
http://127.0.0.1:8000
```

## Overview
This FastAPI backend provides face recognition and attendance management capabilities using InsightFace.

---

## Initialization

### POST `/init`
Initialize the face recognition system.

**Request Body**:
```json
{
  "model_pack": "buffalo_l",
  "det_width": 640,
  "det_height": 640,
  "model_root": "/path/to/models",  // Optional
  "offline_only": false              // Optional
}
```

**Response**:
```json
{
  "status": "initialized",
  "model_pack": "buffalo_l"
}
```

---

## Face Recognition

### POST `/detect`
Detect faces in an image (fast, returns bounding boxes only).

**Request Body**:
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "faces": [
    {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 250
    }
  ]
}
```

### POST `/recognize`
Recognize faces in an image and match against database.

**Request Body**:
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "faces": [
    {
      "personId": "1234567890",
      "personName": "John Doe",
      "confidence": 0.85,
      "box": {
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 250
      }
    }
  ]
}
```

### POST `/enroll`
Enroll a new face embedding for a person.

**Request Body**:
```json
{
  "person_id": "1234567890",
  "person_name": "John Doe",
  "image": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "status": "enrolled",
  "person_id": "1234567890",
  "person_name": "John Doe"
}
```

---

## Person Management

### POST `/person`
Create a new person in the database.

**Request Body**:
```json
{
  "person_id": "1234567890",
  "person_name": "John Doe"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

### GET `/people`
Get all people in the database.

**Response**:
```json
{
  "people": [
    {
      "person_id": "1234567890",
      "person_name": "John Doe",
      "photo_paths": ["abc123.jpg", "def456.jpg"]
    }
  ]
}
```

### POST `/person/delete`
Delete a person and all their data.

**Request Body**:
```json
{
  "person_id": "1234567890"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

**Note**: Cascades to delete embeddings and group memberships.

---

## Photo Management

### POST `/person/photo/upload`
Upload a photo for a person.

**Request Body**:
```json
{
  "person_id": "1234567890",
  "image": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "status": "ok",
  "filename": "abc123-def456-789.jpg",
  "path": "/person/photo/1234567890/abc123-def456-789.jpg"
}
```

**Notes**:
- Photo is saved to `/backend/photos/{person_id}/{filename}.jpg`
- Filename is auto-generated using UUID
- Photo path is added to `persons.photo_paths` in database

### GET `/person/photo/{person_id}/{filename}`
Retrieve a person's photo.

**Parameters**:
- `person_id`: Person's ID
- `filename`: Photo filename

**Response**: Image file (JPEG)

**Example**:
```
GET /person/photo/1234567890/abc123-def456-789.jpg
```

### POST `/person/photo/delete`
Delete a person's photo.

**Request Body**:
```json
{
  "person_id": "1234567890",
  "filename": "abc123-def456-789.jpg"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

---

## Group Management

### POST `/group`
Create a new group.

**Request Body**:
```json
{
  "group_id": "patrol_1",
  "group_name": "Eagle Patrol"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

### GET `/groups`
Get all groups with their members and guides.

**Response**:
```json
{
  "groups": [
    {
      "group_id": "patrol_1",
      "group_name": "Eagle Patrol",
      "guide_id": "1234567890",
      "members": ["1234567890", "9876543210"]
    }
  ]
}
```

### POST `/group/update`
Update group details (name and/or guide).

**Request Body**:
```json
{
  "group_id": "patrol_1",
  "group_name": "Eagle Patrol Updated",  // Optional
  "guide_id": "1234567890"                // Optional
}
```

**Response**:
```json
{
  "status": "ok"
}
```

### POST `/group/add`
Add a person to a group.

**Request Body**:
```json
{
  "group_id": "patrol_1",
  "person_id": "1234567890"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

### POST `/group/remove`
Remove a person from a group.

**Request Body**:
```json
{
  "group_id": "patrol_1",
  "person_id": "1234567890"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

### POST `/group/delete`
Delete a group and all its memberships.

**Request Body**:
```json
{
  "group_id": "patrol_1"
}
```

**Response**:
```json
{
  "status": "ok"
}
```

---

## Face Quality Assessment

### POST `/validate-face`
Assess the quality of a face photo for recognition.

**Request Body**:
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "score": 85,
  "quality": "excellent",
  "message": "Excellent - Face clearly visible",
  "face_count": 1,
  "face_ratio": 0.15,
  "angle_score": 0.95,
  "size_score": 0.90,
  "recommendation": "Photo quality is good"
}
```

**Quality Levels**:
- `excellent`: score >= 70
- `good`: score >= 40
- `poor`: score < 40

---

## Video Processing

### POST `/process-video-frame`
Process a single video frame for face detection.

**Request Body**:
```json
{
  "image": "data:image/jpeg;base64,...",
  "timestamp": 1.5
}
```

**Response**:
```json
{
  "faces": [
    {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 250,
      "timestamp": 1.5
    }
  ],
  "timestamp": 1.5
}
```

---

## Utility

### POST `/clear`
Clear all data from the database (people, embeddings, groups).

**Response**:
```json
{
  "status": "cleared"
}
```

**⚠️ Warning**: This is destructive and cannot be undone!

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid input, service not initialized)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## CORS

CORS is enabled for all origins (`*`) to allow frontend development.

**Production Note**: Restrict CORS origins in production deployment.

---

## Rate Limiting

No rate limiting is currently implemented.

---

## Authentication

No authentication is currently implemented. This is an admin-only application.

**Production Note**: Implement authentication before deployment.

---

## Example Usage

### Python
```python
import requests
import base64

# Initialize
response = requests.post('http://127.0.0.1:8000/init', json={
    'model_pack': 'buffalo_l'
})

# Enroll a face
with open('photo.jpg', 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode()
    
response = requests.post('http://127.0.0.1:8000/enroll', json={
    'person_id': '123',
    'person_name': 'John Doe',
    'image': f'data:image/jpeg;base64,{img_b64}'
})

# Recognize faces
response = requests.post('http://127.0.0.1:8000/recognize', json={
    'image': f'data:image/jpeg;base64,{img_b64}'
})
print(response.json())
```

### JavaScript/TypeScript
```typescript
// Initialize
await fetch('http://127.0.0.1:8000/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model_pack: 'buffalo_l' })
});

// Recognize faces
const response = await fetch('http://127.0.0.1:8000/recognize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: dataUrl })
});
const data = await response.json();
console.log(data.faces);
```

---

## Performance Tips

1. **Batch Operations**: Group multiple operations when possible
2. **Image Size**: Resize images to 640x640 before sending for faster processing
3. **Caching**: Cache recognition results for repeated queries
4. **Connection Reuse**: Reuse HTTP connections for multiple requests
5. **Async Processing**: Use async/await for non-blocking operations

---

## Troubleshooting

### Service Not Initialized
**Error**: `Service not initialized`  
**Solution**: Call `/init` endpoint before using recognition features

### No Face Detected
**Error**: Empty `faces` array in response  
**Solution**: Ensure image contains a clear, well-lit face

### Poor Recognition Accuracy
**Solution**: 
- Use `/validate-face` to check photo quality
- Enroll multiple angles of the same person
- Ensure good lighting and clear face visibility

### Port Already in Use
**Error**: `Address already in use`  
**Solution**: 
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn backend.main:app --port 8001
```

