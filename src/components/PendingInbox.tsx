import React, { useState, useEffect } from 'react'
import { supabaseDataService } from '../services/SupabaseDataService'
import { backendRecognitionService } from '../services/BackendRecognitionService'
import { useAuth } from '../hooks/useAuth'
import { logger } from '../utils/logger'
import { checkPhotoQuality, type QualityCheckResult } from '../utils/frontendQualityChecks'

interface Person {
  id: string
  name: string
  email: string
  ageGroup: string
  guides: string[]
  age: number
  parentName: string
  parentPhone: string
  allergies: string[]
  lastSeen?: Date
  status: 'present' | 'absent' | 'unknown'
  avatar?: string
  photoPaths?: string[]
  groups: string[]
}

interface Group {
  id: string
  name: string
  description: string
  memberCount: number
  capacity: number
  isActive: boolean
  lastSession?: Date
  members: string[]
}

interface PendingEnrollment {
  id: string
  name: string
  email?: string
  age?: number
  age_group?: string
  parent_name?: string
  parent_phone?: string
  allergies?: string[]
  photo_urls: string[]
  group_id?: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
}

interface PendingInboxProps {
  isOpen: boolean
  onClose: () => void
  people: Person[]
  setPeople: (people: Person[]) => void
  groups: Group[]
  setGroups: (groups: Group[]) => void
}

export function PendingInbox({ isOpen, onClose, people, setPeople, groups, setGroups }: PendingInboxProps) {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<PendingEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEnrollment, setSelectedEnrollment] = useState<PendingEnrollment | null>(null)
  const [processing, setProcessing] = useState(false)
  const [selectedPhotoQuality, setSelectedPhotoQuality] = useState<QualityCheckResult[]>([])
  const [checkingQuality, setCheckingQuality] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && user) {
      loadPendingEnrollments()
    }
  }, [isOpen, user])

  useEffect(() => {
    if (selectedEnrollment && selectedEnrollment.photo_urls.length > 0) {
      checkPendingPhotosQuality()
    }
  }, [selectedEnrollment])

  const checkPendingPhotosQuality = async () => {
    if (!selectedEnrollment) return
    
    setCheckingQuality(true)
    const results: QualityCheckResult[] = []
    
    try {
      for (const photoUrl of selectedEnrollment.photo_urls) {
        // Fetch photo as blob
        const response = await fetch(photoUrl)
        const blob = await response.blob()
        
        // Check quality
        const quality = await checkPhotoQuality(blob, {
          minBrightness: 50,
          maxBrightness: 200,
          minContrast: 30,
          minSharpness: 100,
          requireFace: true,
          minFaceSize: 0.05
        })
        
        results.push(quality)
      }
      
      setSelectedPhotoQuality(results)
    } catch (error) {
      logger.error('Failed to check photo quality', error)
      setSelectedPhotoQuality([])
    } finally {
      setCheckingQuality(false)
    }
  }

  const loadPendingEnrollments = async () => {
    if (!user) return

    try {
      setLoading(true)
      const data = await supabaseDataService.fetchPendingEnrollments(user.id)
      setEnrollments(data as PendingEnrollment[])
      logger.success(`Loaded ${data.length} pending enrollments`)
    } catch (error) {
      logger.error('Failed to load pending enrollments', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptEnrollment = async (enrollment: PendingEnrollment) => {
    if (!user) return

    try {
      setProcessing(true)
      logger.system(`Processing enrollment for ${enrollment.name}...`)
      
      // Call backend to process the pending enrollment
      // Backend will: download photos, generate embeddings, create person in Supabase,
      // save embeddings to Supabase + local cache, add to group if specified
      const response = await backendRecognitionService.processPendingEnrollment(enrollment.id)
      
      logger.success(`Backend processed enrollment: ${JSON.stringify(response)}`)
      
      // Create person object for local state
      const newPerson: Person = {
        id: response.person_id,
        name: enrollment.name,
        email: enrollment.email || '',
        age: enrollment.age || 0,
        ageGroup: enrollment.age_group || '',
        parentName: enrollment.parent_name || '',
        parentPhone: enrollment.parent_phone || '',
        allergies: enrollment.allergies || [],
        photoPaths: response.photo_urls || [],
        status: 'unknown' as const,
        guides: [],
        groups: response.group_id ? [response.group_id] : []
      }
      
      // Add person to local state
      setPeople([...people, newPerson])
      
      // Update groups state if person was added to a group
      if (response.group_id) {
        const updatedGroups = groups.map(group => {
          if (group.id === response.group_id) {
            return {
              ...group,
              members: [...group.members, response.person_id],
              memberCount: group.memberCount + 1
            }
          }
          return group
        })
        setGroups(updatedGroups)
        logger.success(`Added ${enrollment.name} to group ${groups.find(g => g.id === response.group_id)?.name || 'Unknown'}`)
      }
      
      // Refresh the list
      await loadPendingEnrollments()
      setSelectedEnrollment(null)
      
      logger.success(`✅ ${enrollment.name} enrolled successfully!`)
      alert(`✅ ${enrollment.name} has been enrolled successfully and is ready for recognition!`)
    } catch (error: any) {
      logger.error('Failed to accept enrollment', error)
      alert(`Failed to accept enrollment: ${error.message || 'Unknown error'}. Please try again.`)
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectEnrollment = async (enrollment: PendingEnrollment) => {
    if (!user) return

    const confirmed = window.confirm(`Are you sure you want to reject ${enrollment.name}'s enrollment?`)
    if (!confirmed) return

    try {
      setProcessing(true)
      
      // Delete pending enrollment and photos
      await supabaseDataService.deletePendingEnrollment(enrollment.id)
      
      // Refresh the list
      await loadPendingEnrollments()
      setSelectedEnrollment(null)
      
      logger.success(`Rejected enrollment for ${enrollment.name}`)
    } catch (error) {
      logger.error('Failed to reject enrollment', error)
      alert('Failed to reject enrollment. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === enrollments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(enrollments.map((e) => e.id))
    }
  }

  const handleAcceptSelected = async () => {
    if (!user || selectedIds.length === 0) return
    const confirmed = window.confirm(
      `Accept ${selectedIds.length} pending enrollment(s)?`,
    )
    if (!confirmed) return

    try {
      setProcessing(true)
      for (const id of selectedIds) {
        const enrollment = enrollments.find((e) => e.id === id)
        if (!enrollment) continue
        await handleAcceptEnrollment(enrollment)
      }
      setSelectedIds([])
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - full page like Records */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all duration-200 active:scale-95"
          >
            ←
          </button>
          <div className="text-center flex-1">
            <h2 className="text-gray-900 text-xl">Pending Enrollments</h2>
            <p className="text-gray-500 text-sm">
              Review and accept new people from enrollment links
            </p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h4 className="text-xl font-medium text-gray-900 mb-2">
              No Pending Enrollments
            </h4>
            <p className="text-gray-600">
              New sign-ups from enrollment links will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bulk actions */}
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-gray-700">
                {selectedIds.length > 0
                  ? `${selectedIds.length} selected of ${enrollments.length}`
                  : `${enrollments.length} pending`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  {selectedIds.length === enrollments.length
                    ? 'Clear selection'
                    : 'Select all'}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptSelected}
                  disabled={selectedIds.length === 0 || processing}
                  className="px-3 py-1.5 text-xs rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Accept selected
                </button>
              </div>
            </div>

            {enrollments.map((enrollment) => {
              const isSelected = selectedIds.includes(enrollment.id)
              return (
                <div
                  key={enrollment.id}
                  className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer ${
                    isSelected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedEnrollment(enrollment)}
                >
                  <div className="flex items-start justify-between">
                    <div className="mr-3 mt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSelected(enrollment.id)
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-lg text-gray-900">
                        {enrollment.name}
                      </h4>

                      {enrollment.group_id && (
                        <div className="mt-1 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          👥{' '}
                          {groups.find((g) => g.id === enrollment.group_id)?.name ||
                            'Unknown Group'}
                        </div>
                      )}

                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        {enrollment.email && <div>📧 {enrollment.email}</div>}
                        {enrollment.age && (
                          <div>
                            🎂 Age {enrollment.age}{' '}
                            {enrollment.age_group && `• ${enrollment.age_group}`}
                          </div>
                        )}
                        {enrollment.parent_name && (
                          <div>
                            👨‍👩‍👧‍👦 Parent: {enrollment.parent_name}{' '}
                            {enrollment.parent_phone &&
                              `• ${enrollment.parent_phone}`}
                          </div>
                        )}
                        {enrollment.allergies && enrollment.allergies.length > 0 && (
                          <div>🏥 Allergies: {enrollment.allergies.join(', ')}</div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        Submitted {new Date(enrollment.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAcceptEnrollment(enrollment)
                        }}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {processing ? '⏳' : '✓'} Add
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Enrollment Details Modal */}
      {selectedEnrollment && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSelectedEnrollment(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden"></div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-xl">{selectedEnrollment.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Review enrollment details
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEnrollment(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Photos */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Photos ({selectedEnrollment.photo_urls.length})</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedEnrollment.photo_urls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                        Photo {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Quality Summary */}
              {selectedPhotoQuality.length > 0 && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                  <div className="text-sm font-bold text-gray-900 mb-3">📊 Photo Quality Summary</div>
                  
                  {/* Overall Score */}
                  <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-gray-700">Overall Quality Score</div>
                      <div className="text-2xl font-bold text-green-700">
                        {Math.round(selectedPhotoQuality.reduce((sum, m) => sum + m.score, 0) / selectedPhotoQuality.length)}/100
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const avgScore = Math.round(selectedPhotoQuality.reduce((sum, m) => sum + m.score, 0) / selectedPhotoQuality.length);
                        if (avgScore >= 90) return '✅ Excellent - Ready for recognition';
                        if (avgScore >= 75) return '✅ Good - Ready for recognition';
                        if (avgScore >= 60) return '⚠️ Fair - Consider retaking';
                        return '❌ Poor - Should retake photos';
                      })()}
                    </div>
                  </div>

                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-blue-700 font-medium">Photos</div>
                      <div className="text-blue-900">
                        {selectedPhotoQuality.length} total • {selectedPhotoQuality.filter(m => m.passed).length} passing
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium">Face Size</div>
                      <div className="text-blue-900">
                        Avg: {Math.round(selectedPhotoQuality.reduce((sum, m) => sum + ((m.metrics.faceSize || 0) * 640), 0) / selectedPhotoQuality.length)}px • 
                        Min: {Math.round(Math.min(...selectedPhotoQuality.map(m => (m.metrics.faceSize || 0) * 640)))}px
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium">Sharpness</div>
                      <div className="text-blue-900">
                        Avg: {Math.round(selectedPhotoQuality.reduce((sum, m) => sum + (m.metrics.sharpness || 0), 0) / selectedPhotoQuality.length)} • 
                        Best: {Math.round(Math.max(...selectedPhotoQuality.map(m => m.metrics.sharpness || 0)))}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium">Lighting</div>
                      <div className="text-blue-900">
                        Bright: {Math.round(selectedPhotoQuality.reduce((sum, m) => sum + (m.metrics.brightness || 0), 0) / selectedPhotoQuality.length)} • 
                        Contrast: {Math.round(selectedPhotoQuality.reduce((sum, m) => sum + (m.metrics.contrast || 0), 0) / selectedPhotoQuality.length)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {checkingQuality && (
                <div className="text-center text-sm text-gray-600 py-4">
                  ⏳ Analyzing photo quality...
                </div>
              )}

              {/* Group Info */}
              {selectedEnrollment.group_id && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Enrolling In</h4>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <span className="font-medium text-blue-900">
                        {groups.find(g => g.id === selectedEnrollment.group_id)?.name || 'Unknown Group'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedEnrollment.email && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-gray-900">{selectedEnrollment.email}</span>
                    </div>
                  )}
                  {selectedEnrollment.age && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Age:</span>
                      <span className="font-medium text-gray-900">{selectedEnrollment.age}</span>
                    </div>
                  )}
                  {selectedEnrollment.age_group && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Grade:</span>
                      <span className="font-medium text-gray-900">{selectedEnrollment.age_group}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent Info */}
              {(selectedEnrollment.parent_name || selectedEnrollment.parent_phone) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Parent/Guardian Information</h4>
                  <div className="space-y-2 text-sm">
                    {selectedEnrollment.parent_name && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium text-gray-900">{selectedEnrollment.parent_name}</span>
                      </div>
                    )}
                    {selectedEnrollment.parent_phone && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium text-gray-900">{selectedEnrollment.parent_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Info */}
              {selectedEnrollment.allergies && selectedEnrollment.allergies.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Medical Information</h4>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-900">
                      <span className="font-medium">Allergies:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedEnrollment.allergies.map((allergy, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => handleRejectEnrollment(selectedEnrollment)}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAcceptEnrollment(selectedEnrollment)}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processing ? (
                    <>
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
                      Processing...
                    </>
                  ) : (
                    '✓ Accept & Process'
                  )}
                </button>
              </div>
              <div className="mt-2 text-center text-xs text-gray-500">
                Accepting will download photos, generate face embeddings, and add person to your database
              </div>

              {/* Extra padding for mobile safe area */}
              <div className="h-4 sm:hidden"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

