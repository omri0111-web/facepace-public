import React, { useState, useRef, useEffect } from 'react';
import { backendRecognitionService } from '../services/BackendRecognitionService';
import { Person } from '../App';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  onEnrollmentComplete: (personId: string) => void;
  selectedGroupId?: string;
}

export function FaceEnrollmentModal({
  isOpen,
  onClose,
  people,
  onEnrollmentComplete,
  selectedGroupId,
}: FaceEnrollmentModalProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isCapturing && videoRef.current) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCapturing]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' 
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
    setIsCapturing(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCapturing(true);
    setError(null);
  };

  const enrollFace = async () => {
    if (!selectedPerson || !capturedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Create image element from captured photo
      const img = new Image();
      img.src = capturedImage;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Ensure person exists, enroll via backend service, and add to group
      await backendRecognitionService.createPerson(selectedPerson.id, selectedPerson.name);
      const enrolled = await backendRecognitionService.enrollFace(
        selectedPerson.id,
        selectedPerson.name,
        img
      );

      if (selectedGroupId) {
        await backendRecognitionService.addGroupMember(selectedGroupId, selectedPerson.id);
      }

      if (enrolled) {
        setSuccess(true);
        onEnrollmentComplete(selectedPerson.id);
        
        // Also persist to frontend state by emitting a storage event for any listeners (optional)
        try {
          const persisted = {
            person_id: selectedPerson.id,
            person_name: selectedPerson.name,
          };
          window.localStorage.setItem('last_enrolled_person', JSON.stringify(persisted));
        } catch {}
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError('No face detected in the photo. Please try again with a clear frontal face photo.');
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
      setError('Failed to enroll face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setSelectedPerson(null);
    setIsCapturing(false);
    setCapturedImage(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  // Filter out people who might already be enrolled
  const unenrolledPeople = people;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>
          
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">Enroll Face</h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Add facial recognition for attendance
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedPerson ? (
            /* Person Selection */
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Select a person to enroll:
              </div>
              {unenrolledPeople.map((person) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className="w-full p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{person.name}</div>
                      <div className="text-xs text-gray-500">{person.ageGroup}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : !isCapturing && !capturedImage ? (
            /* Ready to capture */
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📸</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Ready to capture photo
              </h4>
              <p className="text-sm text-gray-600 mb-6">
                Enrolling: <strong>{selectedPerson.name}</strong>
              </p>
              <button
                onClick={() => setIsCapturing(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Start Camera
              </button>
            </div>
          ) : isCapturing ? (
            /* Camera view */
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full border-4 border-blue-500 hover:bg-blue-50 transition-all active:scale-95"
                  >
                    <div className="w-full h-full rounded-full bg-blue-500"></div>
                  </button>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <div className="text-xs text-yellow-800">
                  <strong>Tips for best results:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Face the camera directly</li>
                    <li>Ensure good lighting</li>
                    <li>Remove glasses if possible</li>
                    <li>Keep a neutral expression</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : capturedImage ? (
            /* Preview captured image */
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <img src={capturedImage} alt="Captured" className="w-full" />
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="text-sm text-green-800 flex items-center">
                    <span className="mr-2">✓</span>
                    Successfully enrolled! Face recognition is now active.
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={retakePhoto}
                  disabled={isProcessing || success}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retake
                </button>
                <button
                  onClick={enrollFace}
                  disabled={isProcessing || success}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : success ? (
                    '✓ Enrolled!'
                  ) : (
                    'Confirm & Enroll'
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

