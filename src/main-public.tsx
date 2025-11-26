import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicEnrollmentPage } from './components/PublicEnrollmentPage'
import './index.css'

// Simple router for public enrollment only
function PublicApp() {
  // Extract userId and groupId from URL path: /enroll/:userId/:groupId
  const pathParts = window.location.pathname.split('/')
  const isEnrollPage = pathParts[1] === 'enroll'
  const userId = pathParts[2]
  const groupId = pathParts[3]

  if (isEnrollPage && userId && groupId) {
    return <PublicEnrollmentPage userId={userId} groupId={groupId} />
  }

  // Landing page for root path
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Face<span className="text-blue-500">Pace</span>
        </h1>
        <p className="text-gray-600 mb-4">
          Public Enrollment System
        </p>
        <p className="text-sm text-gray-500">
          Please use the enrollment link provided by your administrator.
        </p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PublicApp />
  </React.StrictMode>,
)




