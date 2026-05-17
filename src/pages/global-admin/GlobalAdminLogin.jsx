import { useState } from 'react'
import { FiEye, FiEyeOff, FiMail, FiLock, FiKey } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function GlobalAdminLogin({ onLogin }) {
  const [formData, setFormData] = useState({
    email: 'admin@inboxguaranteed.com',
    password: '',
    resetCode: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showResetCode, setShowResetCode] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/global-admin/login', formData)
      
      if (response.data.token) {
        onLogin(response.data.token)
        toast.success('Global admin login successful!')
      } else {
        toast.success(response.data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiLock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Global Admin Access</h2>
        <p className="text-gray-600">Secure administrative control panel</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Admin Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="input-field pl-10"
              placeholder="admin@inboxguaranteed.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="input-field pl-10 pr-10"
              placeholder="Enter admin password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* <button
            type="button"
            onClick={() => setShowResetCode(!showResetCode)}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            Forgot password? Use reset code
          </button> */}
        </div>

        {showResetCode && (
          <div>
            <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700 mb-2">
              Reset Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiKey className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="resetCode"
                name="resetCode"
                type="text"
                value={formData.resetCode}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="Enter reset code (3237)"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use code 3237 to reset your password
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Authenticating...' : 'Access Admin Panel'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          This is a secure administrative area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}