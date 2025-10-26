# FacePace - Face Recognition Attendance App

A modern attendance tracking application using face recognition technology with React frontend and FastAPI backend.

## Features

- **Real-time Face Recognition**: Live camera feed with instant face detection and recognition
- **Group Management**: Create and manage scout groups with member assignments
- **Attendance Tracking**: Automatic detection and manual confirmation of attendance
- **Celebration Animation**: Fun confetti animation when recording completes
- **Persistent Storage**: All data saved to SQLite database
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + Python
- **Face Recognition**: InsightFace with ONNX models
- **Database**: SQLite
- **UI Components**: Radix UI + Tailwind CSS

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Camera access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/omri0111-web/FacePace.git
   cd FacePace
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Start the application**
   ```bash
   # Terminal 1 - Start backend
   ./scripts/start-backend.sh
   
   # Terminal 2 - Start frontend
   ./scripts/start-frontend.sh
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Usage

1. **Add People**: Use the People panel to add scouts with their photos
2. **Create Groups**: Organize scouts into groups (patrols, troops, etc.)
3. **Record Attendance**: Start recording to automatically detect faces
4. **Confirm Attendance**: Manually add anyone not automatically detected
5. **View Records**: Check attendance history and statistics

## Documentation

- [Face Recognition Setup](docs/FACE_RECOGNITION_SETUP.md)
- [SeetaFace Setup](docs/SEETAFACE2_SETUP.md)

## License

This project uses InsightFace models which may have licensing restrictions for commercial use. Please review the model licenses before commercial deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please open an issue on GitHub.