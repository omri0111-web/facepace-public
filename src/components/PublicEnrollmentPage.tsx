import React, { useState, useEffect, useRef } from 'react'
import { supabaseDataService } from '../services/SupabaseDataService'
import { backendRecognitionService } from '../services/BackendRecognitionService'
import type { EnrollmentLink } from '../lib/supabase'

interface PublicEnrollmentPageProps {
  linkCode: string
}

export function PublicEnrollmentPage({ linkCode }: PublicEnrollmentPageProps) {
  const [enrollmentLink, setEnrollmentLink] = useState<EnrollmentLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [allergies, setAllergies] = useState('')
  
  // Photo capture state
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Load enrollment link on mount
  useEffect(() => {
    loadEnrollmentLink()
  }, [linkCode])

  // Clean up camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const loadEnrollmentLink = async () => {
    try {
      const link = await supabaseDataService.getEnrollmentLink(linkCode)
      if (!link) {
        setError('This enrollment link is invalid or has expired.')
        setLoading(false)
        return
      }
      
      setEnrollmentLink(link)
      setLoading(false)
    } catch (err: any) {
      setError('Failed to load enrollment link. Please try again.')
      setLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      
      setStream(mediaStream)
      setShowCamera(true)
    } catch (err) {
      setError('Failed to access camera. Please allow camera permissions.')
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return

    try {
      // Capture frame from video
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        setError('Failed to capture photo')
        return
      }
      
      ctx.drawImage(videoRef.current, 0, 0)
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      // Validate face quality
      const validation = await backendRecognitionService.validateFace(photoDataUrl)
      
      if (validation.face_count === 0) {
        setError('No face detected. Please make sure your face is visible.')
        return
      }
      
      if (validation.face_count > 1) {
        setError('Multiple faces detected. Please make sure only one person is in frame.')
        return
      }
      
      if (validation.score < 60) {
        setError(`Photo quality is low (${validation.score}/100). ${validation.recommendation}`)
        return
      }
      
      // Add to captured photos
      setCapturedPhotos([...capturedPhotos, photoDataUrl])
      setError('') // Clear any previous errors
    } catch (err: any) {
      setError('Failed to capture photo: ' + err.message)
    }
  }

  const removePhoto = (index: number) => {
    setCapturedPhotos(capturedPhotos.filter((_, i) => i !== index))
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
    
    if (capturedPhotos.length < 1) {
      setError('Please capture at least 1 photo')
      return
    }
    
    if (!enrollmentLink) {
      setError('Enrollment link not found')
      return
    }
    
    setSubmitting(true)
    setError('')
    
    try {
      // Create person in the link creator's database
      const person = await supabaseDataService.createPerson(enrollmentLink.user_id, {
        name: name.trim(),
        email: email.trim() || undefined,
        age: age ? parseInt(age) : undefined,
        parent_name: parentName.trim() || undefined,
        parent_phone: parentPhone.trim() || undefined,
        allergies: allergies ? allergies.split(',').map(a => a.trim()) : undefined
      })
      
      // Upload photos and generate embeddings
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photoDataUrl = capturedPhotos[i]
        
        // Convert data URL to blob
        const blob = await (await fetch(photoDataUrl)).blob()
        
        // Upload to Supabase Storage
        const photoUrl = await supabaseDataService.uploadPersonPhoto(
          enrollmentLink.user_id,
          person.id,
          blob,
          `photo_${i}_${Date.now()}.jpg`
        )
        
        // Generate embedding via Railway backend
        const canvas = document.createElement('canvas')
        const img = new Image()
        img.src = photoDataUrl
        await new Promise(resolve => img.onload = resolve)
        
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          
          // Call backend to generate embedding
          await backendRecognitionService.enrollFace(person.id, person.name, canvas)
        }
      }
      
      // Add person to group if specified
      if (enrollmentLink.group_id) {
        await supabaseDataService.addGroupMember(enrollmentLink.group_id, person.id)
      }
      
      // Increment link usage
      await supabaseDataService.incrementEnrollmentLinkUsage(enrollmentLink.id)
      
      // Stop camera
      stopCamera()
      
      // Show success
      setSuccess(true)
      
    } catch (err: any) {
      setError('Failed to submit enrollment: ' + err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading enrollment form...</p>
        </div>
      </div>
    )
  }

  if (error && !enrollmentLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Link</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Enrollment Complete!</h1>
          <p className="text-gray-600 mb-6">
            Thank you, {name}! Your information has been submitted successfully.
          </p>
          <p className="text-gray-500 text-sm">
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

          {/* Age */}
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
              Photos * (Take 1-3 clear photos of your face)
            </label>
            
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
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border-2 border-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                    disabled={submitting}
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
                    disabled={submitting}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}

            {/* Start Camera Button */}
            {!showCamera && capturedPhotos.length < 3 && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition"
                disabled={submitting}
              >
                📷 Start Camera
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || capturedPhotos.length === 0}
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


