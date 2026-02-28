import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiCheckCircle, FiXCircle } from 'react-icons/fi'
import axios from 'axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function EmailConfirm() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    confirmEmail()
  }, [token])

  const confirmEmail = async () => {
    try {
      const response = await axios.post(`/auth/confirm-email/${token}`)
      setStatus('success')
      setMessage(response.data.message)
    } catch (error) {
      setStatus('error')
      setMessage(error.response?.data?.message || 'Email confirmation failed')
    }
  }

  if (status === 'loading') {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'success' ? (
            <FiCheckCircle className="w-16 h-16 text-success-500 mx-auto" />
          ) : (
            <FiXCircle className="w-16 h-16 text-error-500 mx-auto" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'success' ? 'Email Confirmed!' : 'Confirmation Failed'}
        </h1>
        
        <p className="text-gray-600 mb-8">{message}</p>
        
        <Link
          to="/login"
          className="btn-primary inline-block"
        >
          {status === 'success' ? 'Go to Login' : 'Back to Login'}
        </Link>
      </div>
    </div>
  )
}