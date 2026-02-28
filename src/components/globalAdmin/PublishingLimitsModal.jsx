import { useState, useEffect } from 'react'
import { FiX, FiLoader, FiEdit2, FiSave, FiCheck } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function PublishingLimitsModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingLimit, setEditingLimit] = useState(1)
  const [savingUserId, setSavingUserId] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/global-admin/limits')
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load user admins')
    } finally {
      setLoading(false)
    }
  }

  const handleEditLimit = (user) => {
    setEditingUserId(user._id)
    setEditingLimit(user.websitePublishingLimits?.maxPublishedWebsites || 1)
  }

  const handleSaveLimit = async (userId) => {
    if (!editingLimit || editingLimit < 1) {
      toast.error('Limit must be at least 1')
      return
    }

    setSavingUserId(userId)
    try {
      await axios.put(`/global-admin/limits/${userId}`, {
        maxPublishedWebsites: parseInt(editingLimit)
      })
      toast.success('Publishing limit updated successfully')
      setEditingUserId(null)
      fetchUsers()
    } catch (error) {
      console.error('Error updating limit:', error)
      toast.error(error.response?.data?.message || 'Failed to update limit')
    } finally {
      setSavingUserId(null)
    }
  }

  const handleCancel = () => {
    setEditingUserId(null)
    setEditingLimit(1)
  }

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Website Publishing Limits</h2>
            <p className="text-sm text-gray-600 mt-1">Set maximum websites each user can publish</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by email, first name, or last name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <FiLoader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {users.length === 0 ? 'No user admins found' : 'No users match your search'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div key={user._id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {user.websitePublishingLimits?.currentPublishedCount || 0} published website{user.websitePublishingLimits?.currentPublishedCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {editingUserId === user._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={editingLimit}
                        onChange={(e) => setEditingLimit(e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleSaveLimit(user._id)}
                        disabled={savingUserId === user._id}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {savingUserId === user._id ? (
                          <FiLoader className="w-4 h-4 animate-spin" />
                        ) : (
                          <FiCheck className="w-4 h-4" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={savingUserId === user._id}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {user.websitePublishingLimits?.maxPublishedWebsites || 1}
                        </p>
                        <p className="text-xs text-gray-500">max websites</p>
                      </div>
                      <button
                        onClick={() => handleEditLimit(user)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <FiEdit2 className="w-4 h-4" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
