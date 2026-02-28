import { useState } from 'react'
import {
  FiEye, FiEyeOff, FiMail, FiLock, FiSearch
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/auth/login', formData)
      const { user, token } = response.data

      if (!user.isEmailConfirmed) {
        toast.error('Please confirm your email address before logging in')
        return
      }

      onLogin(user, token)
      toast.success('Login successful!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }



  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)

    try {
      const response = await axios.get(`/auth/search?q=${encodeURIComponent(query)}`)
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }



  return (
    <div className="space-y-8">
      {/* Login Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your email"
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
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your password"
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



            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

      </div>
    </div>
  )
}

//       }

//       onLogin(user, token)
//       toast.success('Login successful!')
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Login failed')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleForgotPassword = async (e) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       await axios.post('/auth/forgot-password', { email: forgotEmail })
//       toast.success('Password reset link sent to your email')
//       setShowForgotPassword(false)
//       setForgotEmail('')
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Error sending reset email')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleSearch = async (query) => {
//     if (!query || query.length < 2) {
//       setSearchResults([])
//       return
//     }

//     setSearching(true)
//     try {
//       const response = await axios.get(`/auth/search?q=${encodeURIComponent(query)}`)
//       setSearchResults(response.data.users || [])
//     } catch (error) {
//       console.error('Search error:', error)
//       setSearchResults([])
//       // Don't show error toast for search failures
//     } finally {
//       setSearching(false)
//     }
//   }

//   const handleSupportSubmit = async (e) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       await axios.post('/auth/support-ticket', supportData)
//       toast.success('Support ticket submitted successfully')
//       setShowSupportForm(false)
//       setSupportData({ name: '', email: '', message: '' })
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Error submitting support ticket')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="space-y-8">
//       {/* Enhanced Privacy Policy Notice */}
//       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
//         <div className="flex items-start space-x-4">
//           <div className="flex-shrink-0">
//             <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
//               <FiShield className="w-5 h-5 text-white" />
//             </div>
//           </div>
//           <div>
//             <h3 className="text-lg font-semibold text-blue-900 mb-2">Business Use Only</h3>
//             <p className="text-sm text-blue-800 leading-relaxed">
//              This platform is for business use only. Use Marketbook & Solution to promote legitimate activities and grow your financial opportunities. By using it, you agree to act professionally, manage invoices, track transactions, and enjoy escrow support. We also offer website development, product design, and logo creation. For service bids, contact support, and we’ll assist you promptly.
//             </p>
//             <div className="mt-3 flex items-center space-x-4 text-xs text-blue-700">
//               <span className="flex items-center">
//                 <FiUser className="w-3 h-3 mr-1" />
//                 Professional Users
//               </span>
//               <span className="flex items-center">
//                 <FiShield className="w-3 h-3 mr-1" />
//                 Secure Platform
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Enhanced Search Bar */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <div className="flex items-center space-x-3 mb-4">
//           <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
//             <FiSearch className="w-4 h-4 text-white" />
//           </div>
//           <h3 className="text-lg font-semibold text-gray-900">Find Trusted Businesses</h3>
//         </div>
        
//         <div className="relative">
//           <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//           <input
//             type="text"
//             placeholder="Search for businesses, services, or professionals..."
//             value={searchQuery}
//             onChange={(e) => {
//               setSearchQuery(e.target.value)
//               handleSearch(e.target.value)
//             }}
//             className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
//           />
//         </div>
        
//         {searching && (
//           <div className="mt-4 text-center">
//             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
//             <p className="text-sm text-gray-500 mt-2">Searching...</p>
//           </div>
//         )}

//         {searchResults.length > 0 && (
//           <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
//             {searchResults.map((user) => (
//               <div key={user._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
//                 <div className="flex items-center space-x-4">
//                   <img
//                     src={user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=3b82f6&color=fff`}
//                     alt="Profile"
//                     className="w-12 h-12 rounded-full border-2 border-gray-200"
//                   />
//                   <div className="flex-1">
//                     <div className="flex items-center space-x-2 mb-1">
//                       <h4 className="font-medium text-gray-900">
//                         {user.firstName} {user.lastName}
//                       </h4>
//                       {user.isRecommended && (
//                         <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
//                           <FiStar className="w-3 h-3 fill-current" />
//                           <span className="text-xs font-medium">Recommended</span>
//                         </div>
//                       )}
//                     </div>
                    
//                     <div className="space-y-1">
//                       <p className="text-sm text-gray-600 flex items-center">
//                         <FiMail className="w-3 h-3 mr-2" />
//                         {user.email}
//                       </p>
                      
//                       {user.businessInfo?.businessName && (
//                         <p className="text-sm text-primary-600 font-medium flex items-center">
//                           <FiUser className="w-3 h-3 mr-2" />
//                           {user.businessInfo.businessName}
//                         </p>
//                       )}
                      
//                       {user.businessInfo?.phoneNumber && (
//                         <p className="text-sm text-gray-500 flex items-center">
//                           <FiPhone className="w-3 h-3 mr-2" />
//                           {user.businessInfo.phoneNumber}
//                         </p>
//                       )}
                      
//                       {user.billingAddress && (
//                         <p className="text-sm text-gray-500 flex items-center">
//                           <FiMapPin className="w-3 h-3 mr-2" />
//                           {[
//                             user.billingAddress.street,
//                             user.billingAddress.city,
//                             user.billingAddress.state,
//                             user.billingAddress.zipCode
//                           ].filter(Boolean).join(', ')}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
//           <div className="mt-4 text-center py-8">
//             <FiSearch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//             <p className="text-gray-600">No businesses found matching your search</p>
//             <p className="text-sm text-gray-500 mt-1">Try different keywords or check spelling</p>
//           </div>
//         )}
//       </div>

//       {/* Enhanced Login Form */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <div className="text-center mb-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
//           <p className="text-gray-600">Sign in to your account to continue</p>
//         </div>

//         {!showForgotPassword ? (
//           <form onSubmit={handleSubmit} className="space-y-6">
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiMail className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   id="email"
//                   name="email"
//                   type="email"
//                   required
//                   value={formData.email}
//                   onChange={handleChange}
//                   className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
//                   placeholder="Enter your email"
//                 />
//               </div>
//             </div>

//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
//                 Password
//               </label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiLock className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   id="password"
//                   name="password"
//                   type={showPassword ? 'text' : 'password'}
//                   required
//                   value={formData.password}
//                   onChange={handleChange}
//                   className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
//                   placeholder="Enter your password"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 >
//                   {showPassword ? (
//                     <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                   ) : (
//                     <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
//                   )}
//                 </button>
//               </div>
//             </div>

//             <div className="flex items-center justify-between">
//               <button
//                 type="button"
//                 onClick={() => setShowForgotPassword(true)}
//                 className="text-sm text-primary-600 hover:text-primary-500 font-medium"
//               >
//                 Forgot password?
//               </button>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? (
//                 <div className="flex items-center justify-center">
//                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
//                   Signing in...
//                 </div>
//               ) : (
//                 'Sign In'
//               )}
//             </button>
//           </form>
//         ) : (
//           <form onSubmit={handleForgotPassword} className="space-y-6">
//             <div className="text-center mb-6">
//               <h3 className="text-lg font-medium text-gray-900 mb-2">Reset Password</h3>
//               <p className="text-sm text-gray-600">
//                 Enter your email address and we'll send you a reset link
//               </p>
//             </div>

//             <div>
//               <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-2">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <FiMail className="h-5 w-5 text-gray-400" />
//                 </div>
//                 <input
//                   id="forgotEmail"
//                   type="email"
//                   required
//                   value={forgotEmail}
//                   onChange={(e) => setForgotEmail(e.target.value)}
//                   className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
//                   placeholder="Enter your email"
//                 />
//               </div>
//             </div>

//             <div className="flex space-x-3">
//               <button
//                 type="button"
//                 onClick={() => setShowForgotPassword(false)}
//                 className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
//               >
//                 Back to Login
//               </button>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? 'Sending...' : 'Send Reset Link'}
//               </button>
//             </div>
//           </form>
//         )}

//         <div className="mt-6 text-center">
//           <p className="text-sm text-gray-600">
//             Don't have an account?{' '}
//             <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
//               Create Account
//             </Link>
//           </p>
//         </div>
//       </div>

//       {/* Enhanced Support Section */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <div className="flex items-center justify-between mb-4">
//           <div className="flex items-center space-x-3">
//             <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
//               <FiMessageSquare className="w-4 h-4 text-white" />
//             </div>
//             <h3 className="text-lg font-semibold text-gray-900">Need Help?</h3>
//           </div>
//         </div>
        
//         <p className="text-gray-600 mb-4">
//           Have a question or need support? Submit a ticket and our team will get back to you promptly.
//         </p>
        
//         {!showSupportForm ? (
//           <button
//             onClick={() => setShowSupportForm(true)}
//             className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
//           >
//             Submit Support Ticket
//           </button>
//         ) : (
//           <form onSubmit={handleSupportSubmit} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Name (Optional)
//               </label>
//               <input
//                 type="text"
//                 value={supportData.name}
//                 onChange={(e) => setSupportData(prev => ({ ...prev, name: e.target.value }))}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
//                 placeholder="Your name"
//               />
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Email *
//               </label>
//               <input
//                 type="email"
//                 required
//                 value={supportData.email}
//                 onChange={(e) => setSupportData(prev => ({ ...prev, email: e.target.value }))}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
//                 placeholder="Your email address"
//               />
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Message *
//               </label>
//               <textarea
//                 required
//                 value={supportData.message}
//                 onChange={(e) => setSupportData(prev => ({ ...prev, message: e.target.value }))}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
//                 rows="4"
//                 placeholder="Describe your issue or question"
//               />
//             </div>
            
//             <div className="flex space-x-3">
//               <button
//                 type="button"
//                 onClick={() => setShowSupportForm(false)}
//                 className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? 'Submitting...' : 'Submit Ticket'}
//               </button>
//             </div>
//           </form>
//         )}
//       </div>
//     </div>
//   )
// }