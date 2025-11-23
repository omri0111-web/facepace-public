# Smart Camera Implementation

A new `SmartCamera` component has been implemented to provide a user-friendly, Google-style photo capture experience.

## Features

1.  **Immersive Overlay**: Full-screen camera view with a focus on the subject.
2.  **Visual Guidance**:
    *   **Oval Guide**: A clear green/red oval indicates where to place the face.
    *   **Instructions**: Dynamic text prompts (e.g., "Look straight", "Turn Left").
    *   **Real-time Feedback**: Visual indicators for quality checks (brightness, sharpness, face detection).
3.  **Smart Quality Checks**:
    *   Client-side validation prevents bad photos from being saved.
    *   Instant feedback: "Too dark", "Move closer", "Hold steady".
    *   Automatic scoring (0-100).
4.  **Stable UI**:
    *   **Fixed Shutter Button**: The capture button never moves, ensuring muscle memory works.
    *   **Progress Tracking**: "Photo 1 of 4" indicators.
    *   **Gallery View**: Integrated gallery to review taken photos.
5.  **Accessibility & UX**:
    *   **Sound**: Shutter sound effect.
    *   **Flash**: Visual flash effect on capture.
    *   **Upload Option**: Integrated file upload fallback.

## Integration

The Smart Camera is now used in:
*   **Public Enrollment Page**: For self-enrollment via link.
*   **Add Person Modal**: For admin-led enrollment.
*   **People Panel**: For managing existing photos.

## Usage

The camera automatically manages the stream and permissions. It uses the `frontendQualityChecks` utility to ensure high-quality data for the recognition system.

