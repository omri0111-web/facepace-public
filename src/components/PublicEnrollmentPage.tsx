import React, { useState } from 'react'
import { supabaseDataService } from '../services/SupabaseDataService'
import { type QualityCheckResult } from '../utils/frontendQualityChecks'
import { SmartCamera } from './SmartCamera'

interface PublicEnrollmentPageProps {
  userId: string
  groupId: string
}

export function PublicEnrollmentPage({ userId, groupId }: PublicEnrollmentPageProps) {
  const [step, setStep] = useState<'details' | 'camera' | 'review' | 'success'>('details')
  const [error, setError] = useState('')
  
  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [allergies, setAllergies] = useState('')
  
  // Photo capture state
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [photoQuality, setPhotoQuality] = useState<QualityCheckResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [currentAngle, setCurrentAngle] = useState<string>('center')

  const angles = [
    { id: 'center', name: 'Center', instruction: 'Look straight at the camera', emoji: '👤' },
    { id: 'left', name: 'Turn Left', instruction: 'Turn your head slightly to the LEFT', emoji: '← 👤' },
    { id: 'right', name: 'Turn Right', instruction: 'Turn your head slightly to the RIGHT', emoji: '👤 →' },
    { id: 'up', name: 'Look Up', instruction: 'Tilt your head UP slightly', emoji: '👤 ⬆️' },
  ];

  const removePhoto = (index: number) => {
    setCapturedPhotos(capturedPhotos.filter((_, i) => i !== index))
    setPhotoQuality(photoQuality.filter((_, i) => i !== index))
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    setError('')
    setStep('camera')
  }

  const handleCameraComplete = () => {
    // When SmartCamera finishes (4 photos captured), go to review screen
    if (capturedPhotos.length < 4) {
      setError('Please capture at least 4 photos')
      return
    }
    setError('')
    setStep('review')
  }

  const handleSubmit = async () => {
    if (capturedPhotos.length < 4) {
      setError('Please capture at least 4 photos')
      return
    }
    
    setSubmitting(true)
    setError('')
    
    try {
      console.log('📤 Submitting enrollment for:', name.trim())
      
      // Generate a unique pending ID
      const pendingId = crypto.randomUUID()
      
      // Upload photos to Supabase Storage under pending/ path
      const photoUrls: string[] = []
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photoDataUrl = capturedPhotos[i]
        const blob = await (await fetch(photoDataUrl)).blob()
        const photoUrl = await supabaseDataService.uploadPendingPhoto(
          pendingId,
          blob,
          `photo_${i + 1}.jpg`
        )
        photoUrls.push(photoUrl)
      }
      
      // Create pending enrollment record
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
      
      setStep('success')
      
    } catch (err: any) {
      console.error('❌ Enrollment submission error:', err)
      setError('Could not save your info. Please try again.')
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">You&apos;re all set!</h1>
          <p className="text-gray-600 mb-4">
            Thank you, {name}! Your details and photos have been saved.
          </p>
          <p className="text-gray-400 text-xs">
            You can close this page now.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'camera') {
    return (
      <SmartCamera
        isOpen={true}
        photoCount={capturedPhotos.length}
        targetCount={4}
        photoMetrics={photoQuality}
        instruction={angles.find(a => a.id === currentAngle)?.instruction || "Look straight at the camera"}
        onCancel={() => setStep('details')} // Go back to details if cancelled
        onComplete={handleCameraComplete}
        personDetails={[
          { label: 'Name', value: name },
          { label: 'Email', value: email },
          { label: 'Age', value: age },
          { label: 'Grade', value: ageGroup },
          { label: 'Parent', value: parentName },
          { label: 'Phone', value: parentPhone },
        ].filter(detail => detail.value && detail.value.trim().length > 0)}
        onPhotoCaptured={(blob, quality) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const dataURL = reader.result as string
            setCapturedPhotos(prev => [...prev, dataURL])
            setPhotoQuality(prev => [...prev, quality])
            
            // Advance angle
            const currentIndex = angles.findIndex(a => a.id === currentAngle)
            if (currentIndex < angles.length - 1) {
              setCurrentAngle(angles[currentIndex + 1].id)
            }
          }
          reader.readAsDataURL(blob)
        }}
      />
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
            {step === 'review'
              ? 'Check your details before you finish'
              : 'Complete the form below to set up face sign-in'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-6">
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
                />
              </div>
            </div>

            {/* Parent Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Name
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Phone
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="555-1234"
                />
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergies
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Peanuts, Pollen"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 text-lg"
            >
              Next: Face Scan →
            </button>
          </form>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Captured Photos</h3>
              <div className="grid grid-cols-2 gap-4">
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-green-500"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {capturedPhotos.length < 4 && (
              <div className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                You need 4 photos to complete enrollment. Please add {4 - capturedPhotos.length} more.
              </div>
            )}

            {/* Person Details Review (Summary) */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm">
              <h4 className="font-semibold text-gray-900 mb-3">Your Details</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-600">
                <div>
                  <dt className="font-medium text-gray-700">Name</dt>
                  <dd>{name}</dd>
                </div>
                {email && (
                  <div>
                    <dt className="font-medium text-gray-700">Email</dt>
                    <dd>{email}</dd>
                  </div>
                )}
                {age && (
                  <div>
                    <dt className="font-medium text-gray-700">Age</dt>
                    <dd>{age}</dd>
                  </div>
                )}
                {ageGroup && (
                  <div>
                    <dt className="font-medium text-gray-700">Grade</dt>
                    <dd>{ageGroup}</dd>
                  </div>
                )}
                {parentName && (
                  <div>
                    <dt className="font-medium text-gray-700">Parent</dt>
                    <dd>{parentName}</dd>
                  </div>
                )}
                {parentPhone && (
                  <div>
                    <dt className="font-medium text-gray-700">Phone</dt>
                    <dd>{parentPhone}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('camera')}
                disabled={submitting || capturedPhotos.length >= 4}
                className={`flex-1 border-2 font-semibold py-3 rounded-lg transition duration-200 ${
                  capturedPhotos.length >= 4 || submitting
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {capturedPhotos.length >= 4 ? 'Delete photo to retake' : 'Resume Camera'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || capturedPhotos.length < 4}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Finish setup'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>🔒 Your information is encrypted and secure</p>
          <p className="mt-1">Powered by FacePace</p>
        </div>
      </div>
    </div>
  )
}


