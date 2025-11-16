## FacePace App — Quick User Guide

### What this app is
FacePace is a simple, fast attendance app that recognizes people by face using your device camera. You organize people into groups, start a session, and the app confirms who is present automatically. You can also process a recorded video to capture attendance after an event.

### Why it matters (the need)
- Manual roll calls waste time and are error‑prone
- People move—paper lists don’t
- Fast, accurate attendance makes activities start on time and reduces administrative overhead

### Core pillars
- **Accuracy**: Production‑grade face recognition with quality checks for better matches
- **Speed**: One tap to start; real‑time detection and confirmation
- **Simplicity**: Clear flows—add people, make groups, take attendance
- **Reliability**: Works with standard webcams; persists data locally on the server
- **Safety**: Admin‑only by design; photos stay within your deployment

---

## Who uses it
- **Admin/Guide**: Manages people, groups, and records attendance

---

## Before you start
- A computer with a camera (or an external webcam)
- Good, even lighting; faces should be frontal and clearly visible
- Backend running and reachable (default `http://127.0.0.1:8000`)
- Frontend open in your browser (default `http://localhost:3000`)

The app initializes the recognition service automatically. If prompted, allow camera access in your browser.

---

## First‑time setup (one‑time)
1. **Add people**
   - Go to People and add a person with a unique ID and name
   - Capture or upload a clear photo; follow the on‑screen quality tips
2. **Create groups**
   - Create a group (e.g., a patrol/class/team)
   - Assign members to the group

Tip: Add 1–3 high‑quality photos per person (front‑facing, well‑lit) for best accuracy.

---

## Daily use
### 1) Take attendance (Live Camera)
1. Select a group
2. Start a session and allow camera access
3. Ask participants to face the camera briefly
4. Confirm recognized names and finalize the session

What you’ll see:
- Live video with detection boxes
- Real‑time recognized names with confidence
- List of present members; you can manually add anyone not detected

### 2) After‑event: process a video (optional)
1. Choose a group
2. Upload a video from the event
3. The app scans frames, recognizes known members, and summarizes results

### 3) Review attendance
- Open the History/Records view to see who attended and when
- Export or save reports if enabled in your deployment

---

## Best practices for accuracy
- Use even lighting; avoid strong backlight
- Keep faces frontal and unobstructed (no masks/sunglasses if possible)
- Stand close enough that the face fills a reasonable part of the frame
- Enroll clear photos (sharp, centered, single face)

---

## Troubleshooting
- **No faces detected**: Improve lighting, move closer, face the camera
- **Low match confidence**: Re‑enroll with a better photo; avoid side angles
- **Camera not available**: Check browser permissions and device selection
- **Backend not reachable**: Ensure the server is running at the configured URL

---

## Privacy & safety
- Admin‑only app; no public access
- Photos and attendance data remain on your server
- Review your organization’s policy before sharing exports

---

## Quick checklist (for sessions)
- Camera allowed and pointed at participants
- Group selected
- Lighting okay
- Start session → confirm names → finalize

---

## Need help?
If you have questions or run into issues, contact your system admin or file an issue in your project tracker.



