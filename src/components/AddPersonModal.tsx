import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { backendRecognitionService } from '../services/BackendRecognitionService';
import { supabaseDataService } from '../services/SupabaseDataService';
import { useAuth } from '../hooks/useAuth';

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
  const { user } = useAuth();
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
  const [currentAngle, setCurrentAngle] = useState<'center' | 'left' | 'right' | 'up' | 'complete'>('center');
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Photo upload mode states
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload'>('camera');
  
  // Photo with quality check interface
  interface PhotoWithQuality {
    dataURL: string;
    qualityCheck: {
      passed: boolean;
      reasons: string[];
      metrics: {
        face_width_px: number;
        sharpness: number;
        brightness: number;
        contrast: number;
        roll_abs: number | null;
      };
    } | null; // null = not checked yet
    checking: boolean; // true = currently checking quality
  }
  
  const [photos, setPhotos] = useState<PhotoWithQuality[]>([]);
  
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

  // Check quality for uploaded photos only (camera photos are checked before adding)
  const checkPhotoQuality = async (dataURL: string, index: number) => {
    // Mark as checking
    setPhotos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], checking: true };
      return updated;
    });

    try {
      const qualityResult = await backendRecognitionService.scorePhotoQuality(dataURL);
      setPhotos(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          qualityCheck: qualityResult,
          checking: false
        };
        return updated;
      });
    } catch (err) {
      console.error('Quality check failed:', err);
      setPhotos(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          qualityCheck: {
            passed: false,
            reasons: ['Failed to check quality'],
            metrics: {}
          },
          checking: false
        };
        return updated;
      });
    }
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

    setError(null);

    // Convert files to data URLs and add to photos array
    const newPhotos: PhotoWithQuality[] = [];
    for (const file of validFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file as Blob);
      });

      newPhotos.push({
        dataURL: dataUrl,
        qualityCheck: null,
        checking: false
      });
    }

    const startIndex = photos.length;
    setPhotos(prev => [...prev, ...newPhotos]);

    // Check quality for each new photo
    for (let i = 0; i < newPhotos.length; i++) {
      await checkPhotoQuality(newPhotos[i].dataURL, startIndex + i);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const captureCurrentAngle = async () => {
    // Prevent capturing more than required photos
    if (photos.length >= angles.length) return;
    
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Check quality FIRST before adding to photos
    setError(null); // Clear previous errors
    try {
      const qualityResult = await backendRecognitionService.scorePhotoQuality(imageData);
      
      if (!qualityResult.passed) {
        // Photo rejected - show error but DON'T save photo or advance
        const reasonsList = qualityResult.reasons.length > 0 
          ? qualityResult.reasons.join('\n• ') 
          : 'Photo quality too low';
        
        setError(`❌ Photo Rejected - Please Try Again:\n• ${reasonsList}\n\n💡 Tip: ${getSuggestionForRejection(qualityResult.reasons)}`);
        return; // Don't save, don't advance - let user retry
      }
      
      // Photo ACCEPTED - save it and advance
      setPhotos(prev => [...prev, {
        dataURL: imageData,
        qualityCheck: qualityResult,
        checking: false
      }]);
      
      setError(null);
      
      // Move to next angle only if we have more to capture
      const currentIndex = angles.findIndex(a => a.id === currentAngle);
      if (currentIndex < angles.length - 1 && photos.length + 1 < angles.length) {
        setCurrentAngle(angles[currentIndex + 1].id as any);
      }
      
    } catch (err) {
      console.error('Quality check failed:', err);
      setError('⚠️ Quality check failed. Please try again.');
    }
  };
  
  // Helper function to provide specific suggestions based on rejection reasons
  const getSuggestionForRejection = (reasons: string[]): string => {
    const reasonText = reasons.join(' ').toLowerCase();
    
    if (reasonText.includes('small') || reasonText.includes('120')) {
      return 'Move MUCH closer to the camera - your face should fill the green oval!';
    }
    if (reasonText.includes('blur') || reasonText.includes('sharp')) {
      return 'Hold the camera steady and wait a moment before clicking!';
    }
    if (reasonText.includes('light') || reasonText.includes('dark') || reasonText.includes('bright')) {
      return 'Adjust lighting - face a window or turn on more lights!';
    }
    if (reasonText.includes('contrast')) {
      return 'Improve lighting to increase contrast on your face!';
    }
    if (reasonText.includes('roll') || reasonText.includes('straight')) {
      return 'Keep your head more straight - avoid tilting!';
    }
    
    return 'Check lighting, get closer, and hold camera steady!';
  };

  const [enrolledPersonId, setEnrolledPersonId] = useState<string | null>(null);
  const [enrolledPhotoPaths, setEnrolledPhotoPaths] = useState<string[]>([]);

  const startEnrollment = async () => {
    // For camera mode, all photos are pre-validated and accepted
    // For upload mode, filter to only passing photos
    const passingPhotos = captureMode === 'camera' 
      ? photos 
      : photos.filter(p => p.qualityCheck?.passed === true);
    
    if (passingPhotos.length < 3) {
      setError(`Need at least 3 ${captureMode === 'camera' ? '' : 'accepted '}photos. You have ${passingPhotos.length}. ${captureMode === 'upload' ? 'Please upload better photos (sharper, larger face, better light).' : ''}`);
      return;
    }

    setStep('capturing');
    setIsScanning(true);
    setEnrollmentProgress(0);
    setError(null);

    try {
      console.log(`📸 Processing ${passingPhotos.length} accepted photos for enrollment...`);
      
      // Convert base64 images to Image elements
      const imgElements: HTMLImageElement[] = [];
      
      for (let i = 0; i < passingPhotos.length; i++) {
        const img = new Image();
        img.src = passingPhotos[i].dataURL;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        imgElements.push(img);
        
        // Update progress
        setEnrollmentProgress((i + 1) / passingPhotos.length * 50);
      }

      // Generate ID that will be used for the person - IMPORTANT: Store this!
      const personId = Date.now().toString();
      setEnrolledPersonId(personId);

      console.log(`🆔 Enrolling with ID: ${personId} for ${name}`);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload photos to Supabase Storage
      console.log(`📤 Uploading ${passingPhotos.length} photos to Supabase Storage...`);
      const uploadedPhotoUrls: string[] = [];
      for (let i = 0; i < passingPhotos.length; i++) {
        try {
          // Convert base64 to blob
          const response = await fetch(passingPhotos[i].dataURL);
          const blob = await response.blob();
          
          // Upload to Supabase
          const photoUrl = await supabaseDataService.uploadPersonPhoto(
            user.id,
            personId,
            blob,
            `photo_${i}_${Date.now()}.jpg`
          );
          uploadedPhotoUrls.push(photoUrl);
          console.log(`✅ Uploaded photo ${i + 1}/${passingPhotos.length} to Supabase`);
        } catch (error) {
          console.error('Failed to upload photo to Supabase:', error);
        }
      }
      console.log(`✅ Uploaded ${uploadedPhotoUrls.length} photos to Supabase`);
      setEnrolledPhotoPaths(uploadedPhotoUrls);

      // Enroll accepted images to build multiple embeddings for the same person_id
      let numSuccessful = 0;
      const failureReasons: string[] = [];
      const embeddingsToSave: number[][] = [];
      
      for (let i = 0; i < passingPhotos.length; i++) {
        try {
          // Get embedding from backend
          const embedding = await backendRecognitionService.getEmbedding(imgElements[i]);
          if (embedding && embedding.length > 0) {
            embeddingsToSave.push(embedding);
            numSuccessful++;
            console.log(`✅ Photo ${i + 1}/${passingPhotos.length} processed successfully`);
          }
          setEnrollmentProgress(50 + ((i + 1) / passingPhotos.length) * 50);
        } catch (enrollError: any) {
          console.error(`❌ Photo ${i + 1} processing failed:`, enrollError.message);
          failureReasons.push(`Photo ${i + 1}: ${enrollError.message}`);
          // Continue with other photos instead of failing completely
        }
      }

      if (numSuccessful === 0) {
        const errorMsg = `All ${passingPhotos.length} photos were rejected:\n${failureReasons.join('\n')}`;
        throw new Error(errorMsg);
      }
      
      if (numSuccessful < passingPhotos.length) {
        console.warn(`⚠️ Only ${numSuccessful}/${passingPhotos.length} photos were processed successfully`);
      }

      // Save all embeddings to Supabase
      console.log(`💾 Saving ${embeddingsToSave.length} embeddings to Supabase...`);
      for (let i = 0; i < embeddingsToSave.length; i++) {
        try {
          const photoUrl = uploadedPhotoUrls[i] || '';
          await supabaseDataService.storeFaceEmbedding(personId, embeddingsToSave[i], photoUrl);
        } catch (error) {
          console.error('Failed to save embedding to Supabase:', error);
        }
      }
      console.log(`✅ Saved ${embeddingsToSave.length} embeddings to Supabase`);

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
      setStep('face-scan');
    }
  };

  const retakePhoto = () => {
    setPhotos([]);
    setCurrentAngle('center');
    setError(null);
    setStep('face-scan');
    setEnrollmentProgress(0);
    startCamera();
  };
  
  // Count passing photos
  const passingCount = photos.filter(p => p.qualityCheck?.passed === true).length;
  const canEnroll = passingCount >= 3;

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
      avatar: photos.filter(p => p.qualityCheck?.passed)[0]?.dataURL || undefined, // Use first accepted photo as avatar
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
    setPhotos([]);
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
                        photos.length > index
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
                          Photo {photos.length + 1} of {angles.length}
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
                
                {/* Photo gallery - Fixed height to prevent jumping */}
                <div className="min-h-[120px]">
                  {photos.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="text-xs font-medium text-green-700 mb-2 flex items-center justify-between">
                        <span>✅ Accepted Photos ({photos.length}/{angles.length})</span>
                        <span className="text-green-600 text-xs">All photos passed quality check!</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo.dataURL}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border-2 border-green-500"
                            />
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-bl">
                              ✓
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-800">
                    <strong>📋 Photo must pass quality check to be saved:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><strong>Get VERY close</strong> - Face should fill most of the oval guide</li>
                      <li><strong>Bright light on face</strong> - Stand facing a window or lamp</li>
                      <li><strong>Hold camera steady</strong> - Wait a moment before clicking</li>
                      <li><strong>Face camera straight</strong> - Minimal head tilt</li>
                    </ul>
                    <div className="mt-2 text-xs text-blue-700 font-medium">
                      ⚡ If rejected, photo won't count - you can retry immediately!
                    </div>
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

                {/* Photo gallery with quality badges */}
                {photos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Photo Quality Status:</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <img
                            src={photo.dataURL}
                            alt={`Photo ${index + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Photo {index + 1}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removePhoto(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </div>
                            {photo.checking ? (
                              <div className="text-xs text-gray-600 mt-1">Checking quality...</div>
                            ) : photo.qualityCheck ? (
                              <div className="mt-1">
                                {photo.qualityCheck.passed ? (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-600 text-xs font-medium">✅ Good</span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-red-600 text-xs font-medium">❌ Needs improvement</span>
                                    </div>
                                    <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                                      {photo.qualityCheck.reasons.map((reason, i) => (
                                        <li key={i}>{reason}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 mt-1">Pending check...</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600">
                      Accepted: {passingCount} / {photos.length} (Need at least 3)
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Fixed height container for messages to prevent button jumping */}
            <div className="min-h-[60px]">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                  <div className="text-sm text-red-800 whitespace-pre-line">{error}</div>
                </div>
              )}

              {/* Status message */}
              {!error && photos.length > 0 && captureMode === 'camera' && (
                <div className="text-center text-sm py-2">
                  {photos.length >= angles.length ? (
                    <span className="font-medium text-green-700">
                      ✅ Perfect! All {photos.length} photos accepted and ready to enroll!
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      ✅ {photos.length} accepted • {angles.length - photos.length} more {angles.length - photos.length === 1 ? 'photo' : 'photos'} needed
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              {captureMode === 'camera' ? (
                photos.length >= angles.length ? (
                  <Button 
                    onClick={startEnrollment}
                    disabled={photos.length < 3}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={photos.length < 3 ? `Need at least 3 photos (currently ${photos.length})` : ''}
                  >
                    🚀 Start Enrollment ({photos.length} photos)
                  </Button>
                ) : (
                  <Button 
                    onClick={captureCurrentAngle}
                    disabled={!cameraReady || photos.length >= angles.length}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    📸 Take Shot ({Math.min(photos.length + 1, angles.length)}/{angles.length})
                  </Button>
                )
              ) : (
                <Button 
                  onClick={startEnrollment}
                  disabled={!canEnroll}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canEnroll ? `Need at least 3 accepted photos (currently ${passingCount})` : ''}
                >
                  🚀 Start Enrollment ({passingCount} accepted)
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'capturing' && (
          <div className="space-y-4">
            {/* Show accepted images grid */}
            {photos.filter(p => p.qualityCheck?.passed).length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.filter(p => p.qualityCheck?.passed).map((photo, index) => (
                  <div key={index} className="relative">
                    <img src={photo.dataURL} alt={`Accepted ${index + 1}`} className="w-full h-20 object-cover rounded-lg border-2 border-green-500" />
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                      ✓
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="w-full h-48 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
                  <div className="text-sm font-medium mb-1">🧠 Processing {photos.filter(p => p.qualityCheck?.passed).length} Images...</div>
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
              <h3 className="font-medium mb-2">Enrollment Complete</h3>
              <p className="text-sm text-gray-600 mb-4">
                {name} enrolled with {passingCount} accepted photos.
              </p>
            </div>

            {/* Show accepted photos */}
            {photos.filter(p => p.qualityCheck?.passed).length > 0 && (
              <div className="flex justify-center space-x-2">
                {photos.filter(p => p.qualityCheck?.passed).map((photo, index) => (
                  <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-green-300">
                    <img src={photo.dataURL} alt={`${name} ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <Card className="p-4 bg-green-50">
              <div className="text-sm">
                <div className="font-medium text-green-800">📊 Enrollment Summary</div>
                <div className="text-green-700 mt-2 text-left space-y-1">
                  <div>✓ Name: {name}</div>
                  <div>✓ Accepted photos: {passingCount}</div>
                  {photos.filter(p => p.qualityCheck?.passed).length > 0 && (
                    <div className="text-xs text-gray-700">
                      {(() => {
                        const metrics = photos
                          .filter(p => p.qualityCheck?.passed)
                          .map(p => p.qualityCheck!.metrics)
                          .filter(Boolean);
                        const widths = metrics.map(m => m?.face_width_px || 0);
                        const sharp = metrics.map(m => m?.sharpness || 0);
                        const minW = widths.length > 0 ? Math.round(Math.min(...widths)) : 0;
                        const avgSharp = sharp.length > 0 ? Math.round(sharp.reduce((a, b) => a + b, 0) / sharp.length) : 0;
                        return `Min face width: ${minW}px • Avg sharpness: ${avgSharp}`;
                      })()}
                    </div>
                  )}
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
