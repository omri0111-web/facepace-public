import React, { useState, useEffect, useRef } from 'react'
import { supabaseDataService } from '../services/SupabaseDataService'
import { checkPhotoQuality, getQualityFeedback, type QualityCheckResult } from '../utils/frontendQualityChecks'

interface PublicEnrollmentPageProps {
  userId: string
  groupId: string
}

export function PublicEnrollmentPage({ userId, groupId }: PublicEnrollmentPageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [allergies, setAllergies] = useState('')
  
  // Photo capture state
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [photoQuality, setPhotoQuality] = useState<QualityCheckResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [checkingQuality, setCheckingQuality] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Clean up camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      setCameraLoading(true)
      setError('')
      console.log('📷 Requesting camera access...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      })
      
      console.log('✅ Camera access granted')
      console.log('Stream tracks:', mediaStream.getTracks().length)
      
      setStream(mediaStream)
      setShowCamera(true)
      
      // Wait for next render cycle to ensure video element is in DOM
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (videoRef.current) {
        console.log('Setting video srcObject...')
        videoRef.current.srcObject = mediaStream
        
        // Wait for video metadata to load
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('✅ Video metadata loaded')
              resolve(true)
            }
          }
        })
        
        // Ensure video plays
        try {
          await videoRef.current.play()
          console.log('✅ Video playing')
        } catch (playErr) {
          console.warn('Video play warning:', playErr)
          // Ignore play errors, autoPlay should handle it
        }
      }
      
      setCameraLoading(false)
      console.log('✅ Camera started successfully')
    } catch (err: any) {
      console.error('❌ Camera error:', err)
      setCameraLoading(false)
      setShowCamera(false)
      
      let errorMessage = 'Failed to access camera. '
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions in your browser.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.'
      } else {
        errorMessage += err.message || 'Unknown error occurred.'
      }
      
      setError(errorMessage)
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return

    try {
      setCheckingQuality(true)
      setError('')
      
      // Capture frame from video
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        setError('Failed to capture photo')
        setCheckingQuality(false)
        return
      }
      
      ctx.drawImage(videoRef.current, 0, 0)
      
      // Convert to blob for quality check
      const photoBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
      })
      
      // Frontend quality check (fast, no backend call)
      const qualityResult = await checkPhotoQuality(photoBlob, {
        minBrightness: 50,
        maxBrightness: 200,
        minContrast: 30,
        minSharpness: 100,
        requireFace: true,
        minFaceSize: 0.05
      })
      
      setCheckingQuality(false)
      
      if (!qualityResult.passed) {
        setError(getQualityFeedback(qualityResult))
        return
      }
      
      // Convert canvas to data URL for display
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      // Add to captured photos
      setCapturedPhotos([...capturedPhotos, photoDataUrl])
      setPhotoQuality([...photoQuality, qualityResult])
      setError('') // Clear any previous errors
      
    } catch (err: any) {
      setCheckingQuality(false)
      setError('Failed to capture photo: ' + err.message)
    }
  }

  const removePhoto = (index: number) => {
    setCapturedPhotos(capturedPhotos.filter((_, i) => i !== index))
    setPhotoQuality(photoQuality.filter((_, i) => i !== index))
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    
    if (capturedPhotos.length < 4) {
      setError('Please capture at least 4 photos of your face')
      return
    }
    
    setSubmitting(true)
    setError('')
    
    try {
      console.log('📤 Submitting enrollment for:', name.trim())
      console.log('👤 User ID:', userId)
      console.log('👥 Group ID:', groupId)
      
      // Generate a unique pending ID
      const pendingId = crypto.randomUUID()
      console.log('🆔 Pending ID:', pendingId)
      
      // Upload photos to Supabase Storage under pending/ path
      console.log('📤 Uploading', capturedPhotos.length, 'photos to Supabase...')
      const photoUrls: string[] = []
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photoDataUrl = capturedPhotos[i]
        
        // Convert data URL to blob
        const blob = await (await fetch(photoDataUrl)).blob()
        
        // Upload to pending folder in Supabase Storage
        const photoUrl = await supabaseDataService.uploadPendingPhoto(
          pendingId,
          blob,
          `photo_${i + 1}.jpg`
        )
        photoUrls.push(photoUrl)
        console.log(`✅ Uploaded photo ${i + 1}/${capturedPhotos.length}`)
      }
      console.log('✅ All photos uploaded')
      
      // Create pending enrollment record (NO face processing yet)
      console.log('📝 Creating pending enrollment...')
      console.log('📝 Group ID from URL:', groupId)
      console.log('📝 Group ID being sent:', groupId || undefined)
      await supabaseDataService.createPendingEnrollment({
        id: pendingId,
        user_id: userId,
        group_id: groupId || undefined,
        name: name.trim(),
        email: email.trim() || undefined,
        age: age ? parseInt(age) : undefined,
        age_group: ageGroup.trim() || undefined,
        parent_name: parentName.trim() || undefined,
        parent_phone: parentPhone.trim() || undefined,
        allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        photo_urls: photoUrls,
        status: 'pending'
      })
      console.log('✅ Enrollment submitted successfully!')
      
      // Stop camera
      stopCamera()
      
      // Show success
      setSuccess(true)
      
    } catch (err: any) {
      console.error('❌ Enrollment submission error:', err)
      setError('Failed to submit enrollment: ' + err.message)
      setSubmitting(false)
    }
  }


  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Enrollment Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Thank you, {name}! Your enrollment has been submitted successfully.
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Your submission is now pending review. You'll be notified once it's approved.
          </p>
          <p className="text-gray-400 text-xs">
            You can close this page now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Join Face<span className="text-blue-500">Pace</span>
          </h1>
          <p className="text-gray-600">
            Complete the form below to enroll
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="John Doe"
              required
              disabled={submitting}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="john@example.com"
              disabled={submitting}
            />
          </div>

          {/* Age & Grade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age (optional)
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="12"
                min="1"
                max="150"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade (optional)
              </label>
              <input
                type="text"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="6th Grade"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Parent Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent/Guardian Name (optional)
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Jane Doe"
              disabled={submitting}
            />
          </div>

          {/* Parent Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent/Guardian Phone (optional)
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="555-1234"
              disabled={submitting}
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allergies (optional, comma-separated)
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Peanuts, Pollen"
              disabled={submitting}
            />
          </div>

          {/* Photos Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos * (Take 4 clear photos of your face from different angles)
            </label>
            <p className="text-sm text-gray-500 mb-3">
              {capturedPhotos.length}/4 photos captured
              {photoQuality.length > 0 && ` • Quality: ${Math.round(photoQuality.reduce((sum, q) => sum + q.score, 0) / photoQuality.length)}/100`}
            </p>
            
            {/* Captured Photos */}
            {capturedPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Camera View */}
            {showCamera && (
              <div className="mb-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 rounded-lg border-2 border-blue-500 bg-black object-cover"
                    style={{ minHeight: '300px' }}
                  />
                  {cameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white mx-auto mb-2"></div>
                        <p>Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting || checkingQuality || cameraLoading}
                  >
                    {checkingQuality ? '⏳ Checking quality...' : '📸 Capture Photo'}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
                    disabled={submitting || cameraLoading}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}

            {/* Start Camera Button */}
            {!showCamera && capturedPhotos.length < 4 && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition"
                disabled={submitting}
              >
                📷 {capturedPhotos.length === 0 ? 'Start Camera' : 'Take More Photos'}
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || capturedPhotos.length < 4}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </span>
            ) : capturedPhotos.length < 4 ? (
              `Take ${4 - capturedPhotos.length} more photo${4 - capturedPhotos.length !== 1 ? 's' : ''}`
            ) : (
              'Complete Enrollment'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>🔒 Your information is encrypted and secure</p>
          <p className="mt-1">Powered by FacePace</p>
        </div>
      </div>
    </div>
  )
}


