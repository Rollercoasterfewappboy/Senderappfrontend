import { useState } from 'react'
import { FiX, FiLock } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function NotepadPasswordModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('Password is required')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('/admin/notepad-password/verify', {
        notepadPassword: password
      })

      if (response.data.verified) {
        // Store password verification in sessionStorage (cleared on browser close)
        sessionStorage.setItem('notepadPasswordVerified', 'true')
        sessionStorage.setItem('notepadPasswordVerifiedAt', new Date().toISOString())
        
        toast.success('Notepad unlocked')
        setPassword('')
        setError('')
        onSuccess()
        onClose()
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid password'
      setError(errorMsg)
      toast.error(errorMsg)
      
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1
      setFailedAttempts(newFailedAttempts)
      
      // Redirect to dashboard after wrong password is entered
      // User remains logged in but returns to dashboard to try again
      setTimeout(() => {
        toast.error('Redirecting to dashboard...')
        navigate('/dashboard')
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  const isClosable = false // Cannot close this modal without entering correct password

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FiLock className="text-blue-600 text-xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Notepad Locked</h2>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          This notepad is password-protected. Please enter the password to unlock and view your notes.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Notepad Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isClosable && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
