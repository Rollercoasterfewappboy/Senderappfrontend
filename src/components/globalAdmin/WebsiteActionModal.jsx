import { useState } from 'react'
import { FiX, FiLoader } from 'react-icons/fi'

export default function WebsiteActionModal({ isOpen, website, action, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !website) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((action === 'disable' || action === 'delete') && !reason.trim()) {
      alert('Please provide a reason')
      return
    }
    setLoading(true)
    try {
      await onConfirm(website, action, reason)
      setReason('')
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    if (action === 'disable') return 'Disable Website'
    if (action === 'enable') return 'Enable Website'
    return 'Delete Website'
  }

  const getDescription = () => {
    if (action === 'disable') {
      return 'This website will be hidden from the public. Users cannot access or make payments. User admin can still edit content.'
    }
    if (action === 'enable') {
      return 'This website will be restored and accessible to the public.'
    }
    return 'This action cannot be undone. All website data will be permanently deleted.'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-gray-600 text-sm mb-4">{getDescription()}</p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Website:</span> {website.name}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">User:</span> {website.userId?.email}
            </p>
          </div>

          {/* Reason Input */}
          {(action === 'disable' || action === 'delete') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for {action}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you are taking this action..."
                className="input-field"
                rows="4"
                required
              />
              <p className="text-xs text-gray-500 mt-1">This will be logged and visible to the user</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                action === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : action === 'disable'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : (
                getTitle()
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
