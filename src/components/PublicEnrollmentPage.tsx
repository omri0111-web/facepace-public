import React, { useState } from 'react'
import { supabaseDataService } from '../services/SupabaseDataService'
import { type QualityCheckResult } from '../utils/frontendQualityChecks'
import { SmartCamera } from './SmartCamera'
import { Check, Sun, User, Glasses, Smile, ArrowRight, ArrowLeft, ScanFace, Smartphone, Zap } from 'lucide-react'

interface EnrollmentInstructionsProps {
  onNext: () => void;
}

const EnrollmentInstructions = ({ onNext }: EnrollmentInstructionsProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "The 4 Angles",
      description: "We will capture your face from 4 directions: Center, Left, Right, and Up.",
      icon: <ScanFace className="w-12 h-12 text-blue-500" />,
      color: "bg-blue-50 text-blue-600",
      animation: (
        <svg viewBox="0 0 200 200" className="w-full h-full mx-auto text-blue-600">
           <style>{`
              @keyframes headTurn {
                0%, 15% { transform: translateX(0) rotateY(0deg); } /* Center */
                25%, 40% { transform: translateX(-15px) rotateY(-20deg); } /* Left */
                50%, 65% { transform: translateX(15px) rotateY(20deg); } /* Right */
                75%, 90% { transform: translateY(-15px) rotateX(20deg); } /* Up */
                100% { transform: translateX(0) rotateY(0deg); }
              }
              .face-group-turn {
                animation: headTurn 6s ease-in-out infinite;
                transform-origin: center center;
              }
            `}</style>
            
            {/* Static Frame */}
            <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
            
            {/* Animated Face (Shared Shape) */}
            <g className="face-group-turn">
              {/* Head Outline */}
              <path d="M60,60 Q100,20 140,60 Q170,100 140,160 Q100,190 60,160 Q30,100 60,60" 
                    fill="#eff6ff" stroke="currentColor" strokeWidth="3" />
              {/* Eyes */}
              <circle cx="80" cy="90" r="6" fill="currentColor" />
              <circle cx="120" cy="90" r="6" fill="currentColor" />
              {/* Nose */}
              <path d="M100,90 Q95,110 100,120" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              {/* Mouth */}
              <path d="M80,140 Q100,150 120,140" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </g>
             {/* Arrow for UP - Timed to match faster head movement */}
            <path d="M100,40 L100,20" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowhead)">
               <animate attributeName="opacity" values="0;0;0;1;0" dur="6s" keyTimes="0;0.75;0.85;0.9;1" repeatCount="indefinite" />
            </path>
             <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>
        </svg>
      )
    },
    {
      title: "Face the Light",
      description: "Face a window or light source. Avoid shadows on your face.",
      icon: <Sun className="w-12 h-12 text-amber-500" />,
      color: "bg-amber-50 text-amber-600",
      animation: (
        <svg viewBox="0 0 200 200" className="w-full h-full mx-auto" style={{ overflow: 'visible' }}>
          {/* Creative "Sun Orbit" Animation - Vertical Circle */}
          
          {/* Central Face (Shared Shape) */}
          <g>
            <path d="M60,60 Q100,20 140,60 Q170,100 140,160 Q100,190 60,160 Q30,100 60,60" 
                  stroke="#4b5563" strokeWidth="3">
               {/* Face color: Lit (Top) -> Dark (Bottom/Behind) -> Lit */}
               {/* Sun at Top (0%): Light. Sun at Bottom (50%): Darkest. Sun at Top (100%): Light */}
               <animate attributeName="fill" values="#f3f4f6; #f3f4f6; #111827; #f3f4f6; #f3f4f6" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="8s" repeatCount="indefinite" />
            </path>
            
            {/* Features fade out when dark (at bottom) */}
            <g>
               <animate attributeName="opacity" values="1; 1; 0; 1; 1" keyTimes="0; 0.3; 0.5; 0.7; 1" dur="8s" repeatCount="indefinite" />
               <circle cx="80" cy="90" r="6" fill="#374151" />
               <circle cx="120" cy="90" r="6" fill="#374151" />
               <path d="M100,90 Q95,110 100,120" fill="none" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
               <path d="M80,140 Q100,150 120,140" fill="none" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>

          {/* Orbiting Sun - Smaller orbit to stay within bounds */}
          <g>
            {/* Moves sun in a smaller circle path around the face */}
            <animateMotion path="M100,25 A75,75 0 1,1 100,175 A75,75 0 1,1 100,25" dur="8s" repeatCount="indefinite" rotate="auto" />
            
            <g transform="rotate(90)"> 
               <circle cx="0" cy="0" r="12" fill="#f59e0b">
                  {/* Sun fully disappears (opacity 0) when "behind" face at bottom (0.4-0.6) */}
                  <animate attributeName="opacity" values="1; 1; 0; 0; 1; 1" keyTimes="0; 0.35; 0.45; 0.55; 0.65; 1" dur="8s" repeatCount="indefinite" />
               </circle>
               {/* Sun Rays */}
               <g stroke="#f59e0b" strokeWidth="2">
                  <animate attributeName="opacity" values="1; 1; 0; 0; 1; 1" keyTimes="0; 0.35; 0.45; 0.55; 0.65; 1" dur="8s" repeatCount="indefinite" />
                  <line x1="0" y1="-15" x2="0" y2="-22" />
                  <line x1="0" y1="15" x2="0" y2="22" />
                  <line x1="-15" y1="0" x2="-22" y2="0" />
                  <line x1="15" y1="0" x2="22" y2="0" />
               </g>
            </g>
          </g>
        </svg>
      )
    },
    {
      title: "Get Close",
      description: "Bring the phone closer until your face fills the circle. The closer, the better!",
      icon: <ScanFace className="w-12 h-12 text-blue-500" />,
      color: "bg-blue-50 text-blue-600",
      animation: (
        <svg viewBox="0 0 200 200" className="w-full h-full mx-auto">
           {/* Static Target Circle */}
           <circle cx="100" cy="100" r="80" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="8 8" />
           <text x="100" y="195" textAnchor="middle" fill="#2563eb" fontSize="12" fontWeight="bold">FACE HERE</text>

           {/* Growing Face (Shared Shape) - Slow grow -> Hold -> Restart */}
           <g transform="translate(100, 100)">
              <g>
                 {/* Scale: Medium (0.55) -> Big (0.9) -> Hold -> Restart */}
                 {/* Face starts bigger so it never looks too small */}
                 <animateTransform attributeName="transform" type="scale" values="0.55; 0.9; 0.9; 0.55" keyTimes="0; 0.5; 0.9; 1" dur="6s" repeatCount="indefinite" calcMode="linear" />
                 
                 <path d="M-40,-40 Q0,-80 40,-40 Q70,0 40,60 Q0,90 -40,60 Q-70,0 -40,-40" 
                       fill="#dbeafe" stroke="#1e40af" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                 {/* Features */}
                 <circle cx="-20" cy="-10" r="6" fill="#1e40af" />
                 <circle cx="20" cy="-10" r="6" fill="#1e40af" />
                 <path d="M-20,40 Q0,50 20,40" fill="none" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
           </g>
           
           {/* Success Checkmark - Integrated into circle */}
           <g>
              {/* V Sign appears when face is big (3s - 5.4s) */}
              <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.5; 0.55; 0.9; 1" dur="6s" repeatCount="indefinite" />
              
              {/* Green background circle */}
              <circle cx="150" cy="50" r="20" fill="#22c55e" />
              {/* Checkmark path */}
              <path d="M140,50 L146,56 L160,42" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
           </g>
        </svg>
      )
    },
    {
      title: "Clear Your View",
      description: "Please remove glasses, hats, or masks for the best scan.",
      icon: <Glasses className="w-12 h-12 text-indigo-500" />,
      color: "bg-indigo-50 text-indigo-600",
      animation: (
        <svg viewBox="0 0 200 200" className="w-full h-full mx-auto">
          {/* Shared Face Shape (Fixed Size) */}
          <g>
             <path d="M60,60 Q100,20 140,60 Q170,100 140,160 Q100,190 60,160 Q30,100 60,60" 
                   fill="#e0e7ff" stroke="#4f46e5" strokeWidth="3" />
             <circle cx="80" cy="90" r="6" fill="#4f46e5" />
             <circle cx="120" cy="90" r="6" fill="#4f46e5" />
             <path d="M100,90 Q95,110 100,120" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
             <path d="M80,140 Q100,150 120,140" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Accessories Group - Fading Out Slowly */}
          <g>
             <animate attributeName="opacity" values="1; 1; 0; 0; 1" dur="8s" repeatCount="indefinite" />
             <animateTransform attributeName="transform" type="translate" values="0,0; 0,0; 0,-20; 0,-20; 0,0" dur="8s" repeatCount="indefinite" />
             
             {/* Black Sunglasses - Moved UP slightly (-5px) */}
             <g transform="translate(0, -10)">
                <path d="M65,92 L90,92 L100,95 L110,92 L135,92" stroke="black" strokeWidth="2" fill="none" />
                <path d="M65,92 Q65,115 85,115 Q98,115 98,92" fill="black" opacity="0.9" />
                <path d="M102,92 Q102,115 115,115 Q135,115 135,92" fill="black" opacity="0.9" />
                <line x1="55" y1="95" x2="65" y2="92" stroke="black" strokeWidth="2" /> {/* Left arm */}
                <line x1="135" y1="92" x2="145" y2="95" stroke="black" strokeWidth="2" /> {/* Right arm */}
             </g>

             {/* Hat - On top of head */}
             <path d="M50,70 L150,70 L140,40 Q100,25 60,40 Z" fill="#374151" stroke="#111827" strokeWidth="2" />
             <rect x="50" y="65" width="100" height="8" fill="#1f2937" rx="2" />
          </g>
        </svg>
      )
    },
    {
      title: "Hold Steady",
      description: "Keep your phone still to avoid blur. A steady hand means a clear photo!",
      icon: <Smartphone className="w-12 h-12 text-green-500" />,
      color: "bg-green-50 text-green-600",
      animation: (
        <svg viewBox="0 0 200 200" className="w-full h-full mx-auto">
           {/* Phone Frame (New Animation - Slight Shake vs Solid) */}
           
           {/* 1. Shaky State (Red Outline) */}
           <g>
             <animate attributeName="opacity" values="1; 0; 0; 1" keyTimes="0; 0.4; 0.9; 1" dur="4s" repeatCount="indefinite" />
             <rect x="70" y="50" width="60" height="100" rx="5" fill="#fee2e2" stroke="#ef4444" strokeWidth="3">
                <animateTransform attributeName="transform" type="rotate" values="-3 100 100; 3 100 100; -3 100 100" dur="0.2s" repeatCount="indefinite" />
             </rect>
             {/* Blurred Face */}
             <circle cx="100" cy="90" r="20" fill="#ef4444" opacity="0.3" filter="url(#blurMe)" />
           </g>

           {/* 2. Steady State (Green Outline) */}
           <g opacity="0">
             <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.4; 0.9; 1" dur="4s" repeatCount="indefinite" />
             <rect x="70" y="50" width="60" height="100" rx="5" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
             {/* Clear Face */}
             <circle cx="100" cy="90" r="20" fill="#16a34a" opacity="1" />
             <text x="100" y="180" textAnchor="middle" fontSize="14" fill="#16a34a" fontWeight="bold">Perfect!</text>
           </g>
           
           <defs>
             <filter id="blurMe">
               <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
             </filter>
           </defs>
        </svg>
      )
    }
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onNext();
    } else {
      setStep(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen min-h-screen bg-white px-6">
      
      {/* All content grouped together, centered vertically */}
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* Progress + Counter - Compact row */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex gap-1 flex-1 mr-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-10 bg-blue-600' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>
          <span className="text-lg font-semibold text-gray-400">
            {step + 1}/{steps.length}
          </span>
        </div>

        {/* Animation - Fixed size for all pages */}
        <div className="w-[300px] h-[300px] flex items-center justify-center mb-3">
          {currentStep.animation}
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
          {currentStep.title}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {currentStep.description}
        </p>

        {/* Buttons */}
        <div className="w-full flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="w-14 h-14 flex items-center justify-center rounded-2xl border-2 border-gray-100 text-gray-500 hover:bg-gray-50 transition-all duration-200 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={handleNext}
            className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-200 active:scale-95"
          >
            {isLastStep ? "I'm Ready" : "Next Tip"} 
            {!isLastStep && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PublicEnrollmentPageProps {
  userId: string
  groupId: string
}

export function PublicEnrollmentPage({ userId, groupId }: PublicEnrollmentPageProps) {
  const [step, setStep] = useState<'details' | 'instructions' | 'camera' | 'review' | 'success'>('details')
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
    setStep('instructions')
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

  if (step === 'instructions') {
    return <EnrollmentInstructions onNext={() => setStep('camera')} />
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
