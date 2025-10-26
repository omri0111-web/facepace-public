import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { backendRecognitionService } from '../services/BackendRecognitionService';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPerson: (person: { 
    id: string; // CRITICAL: Must match the enrollment ID!
    name: string; 
    email: string;
    ageGroup: string;
    age: number;
    parentName: string;
    parentPhone: string;
    allergies: string[];
    faceData: string;
    avatar?: string;
  }) => void;
}

export function AddPersonModal({ isOpen, onClose, onAddPerson }: AddPersonModalProps) {
  const [step, setStep] = useState<'info' | 'face-scan' | 'capturing' | 'complete'>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [age, setAge] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentAngle, setCurrentAngle] = useState<'center' | 'left' | 'right' | 'up' | 'complete'>('center');
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Photo upload mode states
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload'>('camera');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<Array<{
    score: number;
    quality: string;
    message: string;
    face_count: number;
    recommendation: string;
  }>>([]);
  const [isValidating, setIsValidating] = useState(false);
  
  const angles = [
    { id: 'center', name: 'Center', instruction: 'Look straight at the camera', emoji: '👤' },
    { id: 'left', name: 'Turn Left', instruction: 'Turn your head slightly to the LEFT', emoji: '← 👤' },
    { id: 'right', name: 'Turn Right', instruction: 'Turn your head slightly to the RIGHT', emoji: '👤 →' },
    { id: 'up', name: 'Look Up', instruction: 'Tilt your head UP slightly', emoji: '👤 ⬆️' },
  ];
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (step === 'face-scan' && !stream) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [step]);

  const startCamera = async () => {
    try {
      setError(null);
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
        setCameraReady(true);
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
      setCameraReady(false);
    }
  };

  const startFaceScan = async () => {
    if (!name.trim()) {
      setError('Please enter a name first');
      return;
    }

    // Check if backend face recognition is ready
    if (!backendRecognitionService.isReady()) {
      setError('Face recognition is still loading. Please wait a moment and try again...');
      
      // Try to initialize if not already done
      try {
        await backendRecognitionService.initialize();
        setError(null);
        setStep('face-scan');
      } catch (err) {
        console.error('Failed to initialize face recognition:', err);
        setError('Failed to load face recognition. Please refresh the page and try again.');
      }
      return;
    }

    setError(null);
    setStep('face-scan');
  };

  // Photo upload functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter((file: File) => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (validFiles.length !== files.length) {
      setError('Please upload only image files (JPG, PNG, WebP)');
      return;
    }

    setUploadedFiles(validFiles);
    setIsValidating(true);
    setError(null);

    // Convert files to data URLs and validate
    const dataUrls: string[] = [];
    const results: any[] = [];

    for (const file of validFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file as Blob);
      });

      dataUrls.push(dataUrl);

      try {
        const validation = await backendRecognitionService.validateFace(dataUrl);
        results.push(validation);
      } catch (err) {
        console.error('Validation error:', err);
        results.push({
          score: 0,
          quality: 'poor',
          message: 'Failed to validate image',
          face_count: 0,
          recommendation: 'Please try a different image'
        });
      }
    }

    setUploadedImages(dataUrls);
    setValidationResults(results);
    setIsValidating(false);

    // Check if we have enough good quality photos
    const goodPhotos = results.filter(r => r.score >= 40).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    if (goodPhotos < 3) {
      setError(`Need at least 3 good quality photos. You have ${goodPhotos} good photos. Please upload more.`);
    } else if (averageScore < 60) {
      setError(`Average photo quality is too low (${Math.round(averageScore)}/100). Please upload better quality photos.`);
    } else {
      setError(null);
    }
  };

  const removeUploadedImage = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newImages = uploadedImages.filter((_, i) => i !== index);
    const newResults = validationResults.filter((_, i) => i !== index);
    
    setUploadedFiles(newFiles);
    setUploadedImages(newImages);
    setValidationResults(newResults);
  };

  const captureCurrentAngle = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    setCapturedImages(prev => [...prev, imageData]);
    
    // Move to next angle
    const currentIndex = angles.findIndex(a => a.id === currentAngle);
    if (currentIndex < angles.length - 1) {
      setCurrentAngle(angles[currentIndex + 1].id as any);
    } else {
      // All angles captured, proceed to enrollment
      const allImages = [...capturedImages, imageData];
      setCapturedImages(allImages);
      enrollAllImages(allImages);
    }
  };

  const [enrolledPersonId, setEnrolledPersonId] = useState<string | null>(null);
  const [enrolledPhotoPaths, setEnrolledPhotoPaths] = useState<string[]>([]);

  const enrollAllImages = async (images: string[]) => {
    setStep('capturing');
    setIsScanning(true);
    setEnrollmentProgress(0);
    setError(null);

    try {
      console.log(`📸 Processing ${images.length} images for enrollment...`);
      
      // Convert base64 images to Image elements
      const imgElements: HTMLImageElement[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = images[i];
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        imgElements.push(img);
        
        // Update progress
        setEnrollmentProgress((i + 1) / images.length * 50);
      }

      // Generate ID that will be used for the person - IMPORTANT: Store this!
      const personId = Date.now().toString();
      setEnrolledPersonId(personId);

      console.log(`🆔 Enrolling with ID: ${personId} for ${name}`);

      // Ensure person exists in backend DB
      await backendRecognitionService.createPerson(personId, name);

      // Upload photos to backend storage
      console.log(`📤 Uploading ${images.length} photos to backend storage...`);
      const uploadedPhotoPaths: string[] = [];
      for (const imageDataUrl of images) {
        try {
          const result = await backendRecognitionService.uploadPersonPhoto(personId, imageDataUrl);
          uploadedPhotoPaths.push(result.filename);
        } catch (error) {
          console.error('Failed to upload photo:', error);
        }
      }
      console.log(`✅ Uploaded ${uploadedPhotoPaths.length} photos`);
      setEnrolledPhotoPaths(uploadedPhotoPaths);

      // Enroll all images to build multiple embeddings for the same person_id
      let numSuccessful = 0;
      for (let i = 0; i < imgElements.length; i++) {
        const ok = await backendRecognitionService.enrollFace(
          personId,
          name,
          imgElements[i]
        );
        if (ok) numSuccessful++;
        setEnrollmentProgress(50 + ((i + 1) / imgElements.length) * 50);
      }

      if (numSuccessful === 0) {
        throw new Error('Could not detect clear faces in the photos. Please try again with better lighting.');
      }

      setEnrollmentProgress(100);
      
      // Only stop camera if we're in camera mode
      if (captureMode === 'camera') {
        stopCamera();
      }
      
      setTimeout(() => {
        setIsScanning(false);
        setStep('complete');
      }, 500);

    } catch (err: any) {
      console.error('Enrollment failed:', err);
      setError(err.message || 'Failed to enroll face. Please try again.');
      setIsScanning(false);
      setEnrollmentProgress(0);
      setCapturedImages([]);
      setCurrentAngle('center');
      setStep('face-scan');
    }
  };

  const startEnrollment = async () => {
    if (captureMode === 'camera') {
      // Use captured images from camera
      if (capturedImages.length === 0) {
        setError('Please capture photos first');
        return;
      }
      await enrollAllImages(capturedImages);
    } else {
      // Use uploaded images
      if (uploadedImages.length === 0) {
        setError('Please upload photos first');
        return;
      }
      
      // Check validation results
      const goodPhotos = validationResults.filter(r => r.score >= 40).length;
      const averageScore = validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length;
      
      if (goodPhotos < 3) {
        setError(`Need at least 3 good quality photos. You have ${goodPhotos} good photos. Please upload more.`);
        return;
      }
      
      if (averageScore < 60) {
        setError(`Average photo quality is too low (${Math.round(averageScore)}/100). Please upload better quality photos.`);
        return;
      }
      
      await enrollAllImages(uploadedImages);
    }
  };

  const retakePhoto = () => {
    setCapturedImages([]);
    setCurrentAngle('center');
    setError(null);
    setStep('face-scan');
    setEnrollmentProgress(0);
    startCamera();
  };

  const handleComplete = () => {
    if (!enrolledPersonId) {
      setError('No enrollment ID found. Please try again.');
      return;
    }

    const personData = {
      id: enrolledPersonId, // USE THE SAME ID AS ENROLLMENT!
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@scouts.org`,
      ageGroup: ageGroup || '6th Grade',
      age: parseInt(age) || 11,
      parentName: parentName || 'Parent Name',
      parentPhone: parentPhone || '(555) 000-0000',
      allergies: allergies ? allergies.split(',').map(a => a.trim()) : [],
      faceData: `face_scan_${enrolledPersonId}`,
      avatar: capturedImages[0] || undefined, // Use first photo as avatar
      photoPaths: enrolledPhotoPaths, // Include uploaded photo paths
    };

    console.log(`✅ Creating person with ID: ${enrolledPersonId} - matches enrollment!`);
    onAddPerson(personData);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setStep('info');
    setName('');
    setEmail('');
    setAgeGroup('');
    setAge('');
    setParentName('');
    setParentPhone('');
    setAllergies('');
    setEnrollmentProgress(0);
    setIsScanning(false);
    setCapturedImages([]);
    setCurrentAngle('center');
    setEnrolledPersonId(null); // Reset enrollment ID
    setError(null);
    onClose();
  };

  const isFormValid = name.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Add a new scout with real face recognition for attendance tracking.
          </DialogDescription>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scout@example.com (optional)"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ageGroup">Grade</Label>
                <Input
                  id="ageGroup"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  placeholder="e.g., 6th Grade"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="11"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="parentName">Parent Name</Label>
              <Input
                id="parentName"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent/Guardian name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="parentPhone">Parent Phone</Label>
              <Input
                id="parentPhone"
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies (comma-separated)</Label>
              <Input
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Peanuts, Dairy, etc."
                className="mt-1"
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <span className="mr-2">🎯</span>
                HIGH-QUALITY Multi-Angle Face Scan
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                We'll capture {angles.length} photos from different angles for maximum recognition accuracy.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• SSD MobileNetV1 - Industry-grade AI model</li>
                <li>• Multi-angle capture for better matching</li>
                <li>• 128-dimensional face embeddings</li>
                <li>• Works in various lighting conditions</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={startFaceScan} 
                disabled={!isFormValid}
                className="flex-1"
              >
                Next: Face Scan →
              </Button>
            </div>
          </div>
        )}

        {step === 'face-scan' && (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex space-x-2 mb-4">
              <Button
                variant={captureMode === 'camera' ? 'default' : 'outline'}
                onClick={() => setCaptureMode('camera')}
                className="flex-1"
              >
                📷 Live Camera
              </Button>
              <Button
                variant={captureMode === 'upload' ? 'default' : 'outline'}
                onClick={() => setCaptureMode('upload')}
                className="flex-1"
              >
                📁 Upload Photos
              </Button>
            </div>

            {captureMode === 'camera' && (
              <>
                {/* Progress indicator */}
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {angles.map((angle, index) => (
                    <div
                      key={angle.id}
                      className={`w-3 h-3 rounded-full transition-all ${
                        capturedImages.length > index
                          ? 'bg-green-500'
                          : currentAngle === angle.id
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <div className="relative">
                  <div className="w-full h-64 bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => setCameraReady(true)}
                    />
                  </div>
                
                  {/* Face guide overlay */}
                  {cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-56 border-2 border-green-400 rounded-full">
                        <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping"></div>
                      </div>
                    </div>
                  )}

                  {/* Instructions overlay */}
                  {cameraReady && (
                    <div className="absolute top-4 left-4 right-4">
                      <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">
                            {angles.find(a => a.id === currentAngle)?.emoji} {angles.find(a => a.id === currentAngle)?.name}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-yellow-300">
                          {angles.find(a => a.id === currentAngle)?.instruction}
                        </div>
                        <div className="text-xs text-white/70 mt-1">
                          Photo {capturedImages.length + 1} of {angles.length}
                        </div>
                      </div>
                    </div>
                  )}

                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <div className="text-sm">Starting camera...</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
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
              </>
            )}

            {captureMode === 'upload' && (
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <Label htmlFor="photo-upload">Upload Photos (3-5 recommended)</Label>
                  <input
                    id="photo-upload"
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload 3-5 photos from different angles for best recognition
                  </p>
                </div>

                {/* Validation Results */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Photo Quality Analysis:</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {uploadedImages.map((image, index) => {
                        const result = validationResults[index];
                        const qualityColor = result?.score >= 70 ? 'green' : result?.score >= 40 ? 'yellow' : 'red';
                        const qualityColorClass = result?.score >= 70 ? 'green' : result?.score >= 40 ? 'yellow' : 'red';
                        return (
                          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <img
                              src={image}
                              alt={`Upload ${index + 1}`}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Photo {index + 1}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeUploadedImage(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  qualityColorClass === 'green' ? 'bg-green-500' : 
                                  qualityColorClass === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <span className={`text-xs ${
                                  qualityColorClass === 'green' ? 'text-green-600' : 
                                  qualityColorClass === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {result?.message || 'Validating...'}
                                </span>
                              </div>
                              {result && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        qualityColorClass === 'green' ? 'bg-green-500' : 
                                        qualityColorClass === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${result.score}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600">{result.score}/100</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Validation Status */}
                {isValidating && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Analyzing photo quality...</p>
                  </div>
                )}
              </div>
            )}


            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              {captureMode === 'camera' ? (
                <Button 
                  onClick={captureCurrentAngle}
                  disabled={!cameraReady}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  📸 Capture ({capturedImages.length + 1}/{angles.length})
                </Button>
              ) : (
                <Button 
                  onClick={startEnrollment}
                  disabled={uploadedImages.length === 0 || isValidating}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  🚀 Start Enrollment
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'capturing' && (
          <div className="space-y-4">
            {/* Show captured images grid */}
            {capturedImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {capturedImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img src={img} alt={`Capture ${index + 1}`} className="w-full h-20 object-cover rounded-lg border-2 border-green-500" />
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="w-full h-48 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
                  <div className="text-sm font-medium mb-1">🧠 Processing {capturedImages.length} Images...</div>
                  <div className="text-xs text-white/80">Extracting high-quality facial features</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>AI Processing Progress</span>
                <span>{Math.round(enrollmentProgress)}%</span>
              </div>
              <Progress value={enrollmentProgress} className="h-2" />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Creating multi-angle recognition profile for maximum accuracy...
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">HIGH-QUALITY Face Recognition Enrolled!</h3>
              <p className="text-sm text-gray-600 mb-4">
                {name} has been successfully enrolled with {capturedImages.length} photos for maximum accuracy.
              </p>
            </div>

            {/* Show all captured photos */}
            {capturedImages.length > 0 && (
              <div className="flex justify-center space-x-2">
                {capturedImages.map((img, index) => (
                  <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-green-300">
                    <img src={img} alt={`${name} ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <Card className="p-4 bg-green-50">
              <div className="text-sm">
                <div className="font-medium text-green-800">✨ Enrollment Summary</div>
                <div className="text-green-700 mt-2 text-left space-y-1">
                  <div>✓ Name: {name}</div>
                  <div>✓ Photos captured: {capturedImages.length} angles</div>
                  <div>✓ AI model: SSD MobileNetV1 (High Quality)</div>
                  <div>✓ Face embeddings: 128D vectors</div>
                  <div>✓ Status: Ready for instant recognition</div>
                </div>
              </div>
            </Card>

            <Button onClick={handleComplete} className="w-full">
              Complete Registration
            </Button>
          </div>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
