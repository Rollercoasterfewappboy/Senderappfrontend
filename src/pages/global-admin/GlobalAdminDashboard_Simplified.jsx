import { useState, useEffect } from 'react'
import { UserPlus, Users, Toggle2, Copy, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function GlobalAdminDashboard() {
  const [activeTab, setActiveTab] = useState('create-user')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // Create User Form
  const [createUserForm, setCreateUserForm] = useState({
    firstName: '',
    lastName: ''
  })
  const [createdUser, setCreatedUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Manage Users
  const [searchQuery, setSearchQuery] = useState('')
  const [toggling, setToggling] = useState({})

  useEffect(() => {
    if (activeTab === 'manage-users') {
      fetchUsers()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/global-admin/users')
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()

    if (!createUserForm.firstName.trim() || !createUserForm.lastName.trim()) {
      toast.error('Please enter both first and last name')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('/global-admin/create-user', {
        firstName: createUserForm.firstName.trim(),
        lastName: createUserForm.lastName.trim()
      })

      if (response.data.success) {
        setCreatedUser(response.data.user)
        setCreateUserForm({ firstName: '', lastName: '' })
        toast.success('User created successfully!')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(error.response?.data?.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      setToggling(prev => ({ ...prev, [userId]: true }))

      const response = await axios.put(`/global-admin/toggle-user-status/${userId}`)

      if (response.data.success) {
        // Update local state
        setUsers(users.map(u => 
          u._id === userId 
            ? { ...u, isActive: !u.isActive }
            : u
        ))
        const action = !currentStatus ? 'enabled' : 'disabled'
        toast.success(`User ${action} successfully`)
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error(error.response?.data?.message || 'Failed to update user status')
    } finally {
      setToggling(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleToggleNotepad = async (userId, enabled) => {
    try {
      setToggling(prev => ({ ...prev, [userId]: true }))
      await axios.put(`/global-admin/users/${userId}/notepad`, { enabled })
      setUsers(users.map(u => 
        u._id === userId 
          ? { ...u, adminConfig: { ...u.adminConfig, notepadEnabled: enabled } } 
          : u
      ))
      toast.success(`Notepad ${enabled ? 'enabled' : 'disabled'} for user`)
    } catch (error) {
      console.error('Error updating notepad flag:', error)
      toast.error(error.response?.data?.message || 'Failed to update notepad setting')
    } finally {
      setToggling(prev => ({ ...prev, [userId]: false }))
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase()
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Global Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users and create new accounts</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('create-user')}
            className={`pb-4 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'create-user'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </div>
          </button>
          <button
            onClick={() => setActiveTab('manage-users')}
            className={`pb-4 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'manage-users'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Manage Users
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'create-user' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Create New User</h2>

              {!createdUser ? (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={createUserForm.firstName}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={createUserForm.lastName}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Enter last name"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-60"
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">✓ User Created Successfully!</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">User ID</p>
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <code className="flex-1 font-mono text-sm text-gray-700">{createdUser._id}</code>
                        <button
                          onClick={() => copyToClipboard(createdUser._id)}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Full Name</p>
                      <p className="text-gray-900 font-medium">{createdUser.firstName} {createdUser.lastName}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Email Address</p>
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <code className="flex-1 font-mono text-sm text-gray-700">{createdUser.email}</code>
                        <button
                          onClick={() => copyToClipboard(createdUser.email)}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Password</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <code className={`font-mono text-sm ${showPassword ? 'text-gray-700' : 'text-gray-400'}`}>
                            {showPassword ? createdUser.generatedPassword : '••••••••••••'}
                          </code>
                        </div>
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(createdUser.generatedPassword)}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">⚠️ This password will only be shown once. Save it securely.</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Share these credentials with the user. They can log in immediately with the email and password provided above.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setCreatedUser(null)
                        setCreateUserForm({ firstName: '', lastName: '' })
                      }}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Create Another User
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manage-users' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Users List */}
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Notepad</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleToggleNotepad(user._id, !user?.adminConfig?.notepadEnabled)}
                            disabled={toggling[user._id]}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
                              user?.adminConfig?.notepadEnabled ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {user?.adminConfig?.notepadEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {user?.adminConfig?.notepadEnabled ? 'On' : 'Off'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                            disabled={toggling[user._id]}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                          >
                            <Toggle2 className="w-4 h-4" />
                            {toggling[user._id] ? 'Processing...' : user.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
