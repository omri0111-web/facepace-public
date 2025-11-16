# FacePace - Face Recognition Attendance App

A modern, cloud-based attendance tracking application using face recognition technology with React frontend, FastAPI backend, and Supabase for multi-user support.

## ✨ New: Cloud Deployment Ready!

**FacePace now supports:**
- 🌐 Multi-user cloud deployment
- 🔐 Secure authentication (email/password)
- ☁️ Cloud database (PostgreSQL via Supabase)
- 📦 Cloud storage (photos via Supabase Storage)
- 🔗 Shareable enrollment links
- 🚀 One-click deployment to Vercel + Railway

## Features

- **Real-time Face Recognition**: Live camera feed with instant face detection and recognition
- **Multi-User Support**: Each user gets their own private database
- **Enrollment Links**: Share links for people to add themselves (no account needed)
- **Group Management**: Create and manage scout groups with member assignments
- **Attendance Tracking**: Automatic detection and manual confirmation of attendance
- **Cloud Storage**: All photos stored securely in Supabase
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React + TypeScript + Vite (deployed on Vercel)
- **Backend**: FastAPI + Python (deployed on Railway)
- **Face Recognition**: InsightFace with ONNX models
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI Components**: Radix UI + Tailwind CSS

## 🚀 Quick Deployment (New!)

Want to get your app on the internet? Follow our comprehensive guides:

1. **[NEXT_STEPS.md](NEXT_STEPS.md)** - ⭐ START HERE! Step-by-step deployment checklist
2. **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Set up your database and authentication
3. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deploy to Vercel and Railway
4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand how everything works

**Time to deploy:** ~1 hour (including Supabase setup)  
**Cost:** $0/month (free tiers are sufficient for testing and small teams)

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Python 3.8+
- Camera access
- Supabase account (free) - [Sign up here](https://supabase.com)

### Installation

1. **Set up Supabase** (15 minutes)
   - Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
   - Create project and run SQL schema
   - Get your API keys

2. **Configure environment**
   - Create `.env.local` file (see [ENV_SETUP.md](ENV_SETUP.md))
   - Add your Supabase credentials

3. **Install dependencies**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. **Start the application**
   ```bash
   # Terminal 1 - Start backend
   cd backend
   python main.py
   
   # Terminal 2 - Start frontend
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - You'll see a login page - sign up to start!

## Usage

1. **Add People**: Use the People panel to add scouts with their photos
2. **Create Groups**: Organize scouts into groups (patrols, troops, etc.)
3. **Record Attendance**: Start recording to automatically detect faces
4. **Confirm Attendance**: Manually add anyone not automatically detected
5. **View Records**: Check attendance history and statistics

## 📚 Documentation

### Deployment & Setup
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - ⭐ Start here! Quick deployment checklist
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Database and authentication setup
- **[ENV_SETUP.md](ENV_SETUP.md)** - Environment variables configuration
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deploy to Vercel + Railway

### Understanding the System
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and data flow
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What was built and why
- **[FILES_CREATED.md](FILES_CREATED.md)** - All files created/modified

### Technical Docs
- [Face Recognition Setup](docs/FACE_RECOGNITION_SETUP.md)
- [SeetaFace Setup](docs/SEETAFACE2_SETUP.md)
- [Database Schema](backend/DATABASE.md)

## 🆕 What's New in This Version

### Multi-User Cloud Deployment
- ✅ Complete authentication system (Supabase Auth)
- ✅ Each user gets their own private database
- ✅ Row-Level Security for data isolation
- ✅ Cloud storage for photos (Supabase Storage)

### New Features
- ✅ **Enrollment Links**: Generate shareable links for people to sign themselves up
- ✅ **Public Enrollment Page**: No-login enrollment form with camera integration
- ✅ **Cloud Infrastructure**: Deploy to Vercel (frontend) + Railway (backend)
- ✅ **Environment Configuration**: Separate dev/prod environments

### Architecture Improvements
- ✅ **Separation of Concerns**: Data operations (Supabase) vs AI (Railway)
- ✅ **Scalability**: Auto-scales with cloud infrastructure
- ✅ **Security**: Enterprise-grade authentication and RLS
- ✅ **Cost-Effective**: Free tiers sufficient for small teams

### Documentation
- ✅ 16+ comprehensive markdown guides
- ✅ Step-by-step deployment instructions
- ✅ Troubleshooting sections
- ✅ Architecture diagrams and explanations

## 💰 Cost

### Free Tier (Recommended for Testing)
- **Vercel**: Free forever for personal projects
- **Supabase**: 500MB database + 1GB storage
- **Railway**: $5 free credit/month
- **Total**: $0/month

### Production (100+ users)
- **Vercel**: Still free
- **Supabase Pro**: $25/month (8GB DB + 100GB storage)
- **Railway**: $5-10/month
- **Total**: ~$30-35/month

## 🔐 Security

- ✅ HTTPS everywhere (Vercel, Railway, Supabase)
- ✅ Row-Level Security policies at database level
- ✅ bcrypt password hashing
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Environment variable secrets
- ✅ Private storage buckets

## License

This project uses InsightFace models which may have licensing restrictions for commercial use. Please review the model licenses before commercial deployment.

## Contributing

1. Fork the repository
2. Create a feature branch from `test`
3. Make your changes
4. Test thoroughly (local + deployed)
5. Submit a pull request

## Support

### Documentation
Start with [NEXT_STEPS.md](NEXT_STEPS.md) for a guided deployment experience.

### Troubleshooting
See [DEPLOYMENT_GUIDE.md - Troubleshooting](DEPLOYMENT_GUIDE.md#troubleshooting-common-issues)

### Issues
For issues and questions, please open an issue on GitHub.