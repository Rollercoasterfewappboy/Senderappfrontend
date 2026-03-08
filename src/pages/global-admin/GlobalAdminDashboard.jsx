import { useState, useEffect } from 'react'
import { Users, UserPlus, Copy, Eye, EyeOff, Trash2, ToggleRight, ToggleLeft, Search, ChevronDown } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function GlobalAdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserData, setCreateUserData] = useState({
    firstName: '',
    lastName: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUser, setExpandedUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/global-admin/users')
      setUsers(response.data.users || [])
    } catch (error) {
      toast.error('Error loading users')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()

    if (!createUserData.firstName.trim() || !createUserData.lastName.trim()) {
      toast.error('First name and last name are required')
      return
    }

    try {
      const response = await axios.post('/global-admin/create-user', {
        firstName: createUserData.firstName.trim(),
        lastName: createUserData.lastName.trim()
      })

      const { user } = response.data
      
      // Copy credentials to clipboard for easy access
      const credentials = `Email: ${user.email}\nPassword: ${user.password}`
      navigator.clipboard.writeText(credentials)
      
      toast.success('User created! Credentials copied to clipboard.')
      toast.custom((t) => (
        <div className='bg-white p-4 rounded-lg shadow-lg border-l-4 border-green-500'>
          <p className='font-semibold mb-2'>New User Created:</p>
          <p className='text-sm text-gray-600 mb-2'>Email: <span className='font-mono text-gray-800'>{user.email}</span></p>
          <p className='text-sm text-gray-600'>Password: <span className='font-mono text-gray-800'>{user.password}</span></p>
          <p className='text-xs text-gray-500 mt-2'>Credentials copied to clipboard</p>
        </div>
      ), { duration: 8000 })
      
      setCreateUserData({ firstName: '', lastName: '' })
      setShowCreateUserModal(false)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating user')
      console.error('Error:', error)
    }
  }

  const handleDisableUser = async (userId) => {
    try {
      await axios.put(`/global-admin/users/${userId}/disable`)
      toast.success('User disabled successfully')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error disabling user')
      console.error('Error:', error)
    }
  }

  const handleEnableUser = async (userId) => {
    try {
      await axios.put(`/global-admin/users/${userId}/enable`)
      toast.success('User enabled successfully')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error enabling user')
      console.error('Error:', error)
    }
  }

  const handleToggleNotepad = async (userId, enabled) => {
    try {
      await axios.put(`/global-admin/users/${userId}/notepad`, { enabled })
      toast.success(`Notepad ${enabled ? 'enabled' : 'disabled'} for user`)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating notepad setting')
      console.error('Error:', error)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Permanently delete this user and all associated data? This action cannot be undone.')) return
    try {
      await axios.delete(`/global-admin/users/${userId}`)
      toast.success('User permanently deleted')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting user')
      console.error('Error:', error)
    }
  }

  const tabs = [
    { id: 'users', name: 'Users', icon: Users }
  ]

  const filteredUsers = users.filter(user =>
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && users.length === 0) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-12 h-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Top Navigation */}
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between'>
            <div className='text-2xl font-bold text-gray-900'>
              <div>inboxguaranteed</div>
              <div>Global Administration Panel</div>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className='inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition'
            >
              <UserPlus className='w-5 h-5 mr-2' />
              Create New User
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Users Tab Content */}
        <div className='space-y-6'>
          {/* Search Bar */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-3 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Search by name or email...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
              />
            </div>
          </div>

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
              <Users className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600 font-medium'>No users found</p>
              <p className='text-gray-500 text-sm mt-1'>Create a new user to get started</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {filteredUsers.map(user => (
                <div
                  key={user._id}
                  className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition'
                >
                  <div className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center'>
                            <span className='text-blue-600 font-semibold text-sm'>
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className='font-semibold text-gray-900'>
                              {user.firstName} {user.lastName}
                            </p>
                            <p className='text-sm text-gray-500'>{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        {/* Status Badge */}
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </div>

                        {/* Enable/Disable Button */}
                        {user.isActive ? (
                          <button
                            onClick={() => handleDisableUser(user._id)}
                            className='inline-flex items-center px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm'
                            title='Disable this user'
                          >
                            <ToggleRight className='w-4 h-4 mr-1' />
                            Disable
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnableUser(user._id)}
                            className='inline-flex items-center px-3 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition font-medium text-sm'
                            title='Enable this user'
                          >
                            <ToggleLeft className='w-4 h-4 mr-1' />
                            Enable
                          </button>
                        )}

                        {/* Notepad toggle */}
                        <button
                          onClick={() => handleToggleNotepad(user._id, !user?.adminConfig?.notepadEnabled)}
                          className={`inline-flex items-center px-3 py-2 rounded-lg transition font-medium text-sm ml-2 ${
                            user?.adminConfig?.notepadEnabled
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                          title={`${
                            user?.adminConfig?.notepadEnabled ? 'Disable' : 'Enable'
                          } notepad for this user`}
                        >
                          {user?.adminConfig?.notepadEnabled ? (
                            <Eye className='w-4 h-4 mr-1' />
                          ) : (
                            <EyeOff className='w-4 h-4 mr-1' />
                          )}
                          Notepad
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className='inline-flex items-center px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium text-sm ml-2'
                          title='Permanently delete this user'
                        >
                          <Trash2 className='w-4 h-4 mr-1' />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedUser === user._id && (
                      <div className='mt-4 pt-4 border-t border-gray-200 text-sm'>
                        <div className='grid grid-cols-2 gap-4'>
                          <div>
                            <p className='text-gray-600'>Created</p>
                            <p className='text-gray-900 font-medium'>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>User ID</p>
                            <p className='text-gray-900 font-mono text-xs'>{user._id}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                    className='w-full px-4 py-2 border-t border-gray-200 text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1 text-sm'
                  >
                    <ChevronDown className={`w-4 h-4 transition ${expandedUser === user._id ? 'rotate-180' : ''}`} />
                    {expandedUser === user._id ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className='fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full'>
            <div className='px-6 py-4 border-b border-gray-200'>
              <h3 className='text-lg font-semibold text-gray-900'>Create New User</h3>
              <p className='text-sm text-gray-600 mt-1'>
                A random email and password will be generated automatically.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  First Name *
                </label>
                <input
                  type='text'
                  required
                  value={createUserData.firstName}
                  onChange={(e) => setCreateUserData({
                    ...createUserData,
                    firstName: e.target.value
                  })}
                  placeholder='Enter first name'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Last Name *
                </label>
                <input
                  type='text'
                  required
                  value={createUserData.lastName}
                  onChange={(e) => setCreateUserData({
                    ...createUserData,
                    lastName: e.target.value
                  })}
                  placeholder='Enter last name'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
                />
              </div>

              <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800'>
                <p className='font-medium mb-1'>Note:</p>
                <p>The generated credentials will be displayed and copied to clipboard after creation.</p>
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowCreateUserModal(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2'
                >
                  <UserPlus className='w-4 h-4' />
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
