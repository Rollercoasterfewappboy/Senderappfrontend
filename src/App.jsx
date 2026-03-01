import EmailDashboard from './pages/user/EmailDashboard';
import SmsDashboard from './pages/user/SmsDashboard';

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import AuthLayout from './components/layouts/AuthLayout'
import DashboardLayout from './components/layouts/DashboardLayout'
import GlobalAdminLayout from './components/layouts/GlobalAdminLayout'
import Login from './pages/auth/Login'
import EmailConfirm from './pages/auth/EmailConfirm'
import Dashboard from './pages/user/Dashboard'
// Profile & Items removed
// AddItem removed
// Tickets & EscrowTickets removed
import Notepad from './pages/user/Notepad'
// Notifications removed
import GlobalAdminLogin from './pages/global-admin/GlobalAdminLogin'
import GlobalAdminDashboard from './pages/global-admin/GlobalAdminDashboard'
import ProtectedRoute from './components/common/ProtectedRoute'
// NotificationSystem removed
import LoadingSpinner from './components/common/LoadingSpinner'
import toast from 'react-hot-toast'
import AdBanner from './components/common/AdBanner'

// Axios base config
axios.defaults.baseURL = 'https://senderappbackend.onrender.com/api'

// Handle expired tokens globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      if (
        !currentPath.includes('/login') &&
        !currentPath.includes('/register') &&
        !currentPath.includes('/global-admin-login')
      ) {
        localStorage.removeItem('token')
        localStorage.removeItem('globalAdminToken')
        delete axios.defaults.headers.common['Authorization']
        toast.error('Session expired. Please login again.')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false)
  const location = useLocation()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  // additional state and effects removed (notifications, ads etc)

  const checkAuthStatus = async () => {
    try {
      const globalAdminToken = localStorage.getItem('globalAdminToken')
      const userToken = localStorage.getItem('token')

      if (globalAdminToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${globalAdminToken}`
        await axios.get('/global-admin/profile')
        setIsGlobalAdmin(true)
      } else if (userToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
        const response = await axios.get('/auth/profile')
        setUser(response.data.user)
      } else {
        localStorage.clear()
      }
    } catch (error) {
      localStorage.clear()
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
      setIsGlobalAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const login = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const logout = () => {
    setUser(null)
    setIsGlobalAdmin(false)
    localStorage.removeItem('token')
    localStorage.removeItem('globalAdminToken')
    // Clear notepad password verification on logout
    sessionStorage.removeItem('notepadPasswordVerified')
    sessionStorage.removeItem('notepadPasswordVerifiedAt')
    delete axios.defaults.headers.common['Authorization']
  }

  const globalAdminLogin = (token) => {
    setIsGlobalAdmin(true)
    localStorage.setItem('globalAdminToken', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const globalAdminLogout = () => {
    setIsGlobalAdmin(false)
    localStorage.removeItem('globalAdminToken')
    if (user) {
      const userToken = localStorage.getItem('token')
      if (userToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
      }
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }

  if (loading) return <LoadingSpinner />

  // hide AdBanner on specific routes
  const hiddenAdRoutes = [
    '/login',
    '/register',
    '/global-admin-login',
    '/global-admin',
  ]
  const shouldHideAd = hiddenAdRoutes.some((path) =>
    location.pathname.startsWith(path)
  )

  return (
    <>
      <Routes>
        {isGlobalAdmin ? (
          <Route
            path="/*"
            element={
              <GlobalAdminLayout onLogout={globalAdminLogout}>
                <Routes>
                  <Route path="/" element={<GlobalAdminDashboard />} />
                  <Route path="/global-admin/*" element={<GlobalAdminDashboard />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                {/* ✅ Place AdBanner here at the bottom */}
                {!shouldHideAd && <AdBanner />}
              </GlobalAdminLayout>
            }
          />
        ) : (
          <>
            {/* Auth Routes */}
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/email" replace />
                ) : (
                  <AuthLayout>
                    <Login onLogin={login} />
                  </AuthLayout>
                )
              }
            />

            <Route
              path="/global-admin-login"
              element={
                <AuthLayout>
                  <GlobalAdminLogin onLogin={globalAdminLogin} />
                </AuthLayout>
              }
            />
            <Route path="/confirm-email/:token" element={<EmailConfirm />} />

            {/* User Dashboard Routes */}
                        <Route
                          path="/email"
                          element={
                            <ProtectedRoute user={user}>
                              <DashboardLayout user={user} onLogout={logout}>
                                <EmailDashboard />
                                {!shouldHideAd && <AdBanner />}
                              </DashboardLayout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/sms"
                          element={
                            <ProtectedRoute user={user}>
                              <DashboardLayout user={user} onLogout={logout}>
                                <SmsDashboard />
                                {!shouldHideAd && <AdBanner />}
                              </DashboardLayout>
                            </ProtectedRoute>
                          }
                        />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <DashboardLayout user={user} onLogout={logout}>
                    <Dashboard />
                    {!shouldHideAd && <AdBanner />}
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Profile and Items routes removed */}
            <Route
              path="/notepad"
              element={
                <ProtectedRoute user={user}>
                  <DashboardLayout user={user} onLogout={logout}>
                    <Notepad user={user} isAdminMode={false} />
                    {!shouldHideAd && <AdBanner />}
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Escrow Tickets, Tickets and Notifications routes removed */}

            {/* Redirects */}
            <Route
              path="/"
              element={
                user ? <Navigate to="/email" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  )
}

export default App













// import { Routes, Route, Navigate } from 'react-router-dom'
// import { useState, useEffect } from 'react'
// import axios from 'axios'
// import AuthLayout from './components/layouts/AuthLayout'
// import DashboardLayout from './components/layouts/DashboardLayout'
// import AdminLayout from './components/layouts/AdminLayout'
// import GlobalAdminLayout from './components/layouts/GlobalAdminLayout'
// import Login from './pages/auth/Login'
// import Register from './pages/auth/Register'
// import EmailConfirm from './pages/auth/EmailConfirm'
// import ResetPassword from './pages/auth/ResetPassword'
// import Dashboard from './pages/user/Dashboard'
// import Profile from './pages/user/Profile'
// import Items from './pages/user/Items'
// import AddItem from './pages/user/AddItem'
// import Tickets from './pages/user/Tickets'
// import EscrowTickets from './pages/user/EscrowTickets'
// import AdminAccess from './pages/user/AdminAccess'
// import UserAdminDashboard from './pages/admin/UserAdminDashboard'
// import UserAdminSettings from './pages/admin/UserAdminSettings'
// import GlobalAdminLogin from './pages/global-admin/GlobalAdminLogin'
// import GlobalAdminDashboard from './pages/global-admin/GlobalAdminDashboard'
// import ProtectedRoute from './components/common/ProtectedRoute'
// import NotificationSystem from './components/common/NotificationSystem'
// import LoadingSpinner from './components/common/LoadingSpinner'
// import toast from 'react-hot-toast'

// // Axios base config
// axios.defaults.baseURL = 'https://marketbooksolutionbackendmain.onrender.com/api'

// // Handle expired tokens globally
// axios.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       const currentPath = window.location.pathname
//       if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/global-admin-login')) {
//         localStorage.removeItem('token')
//         localStorage.removeItem('globalAdminToken')
//         localStorage.removeItem('userAdminToken')
//         localStorage.removeItem('userAdminSession')
//         delete axios.defaults.headers.common['Authorization']
//         toast.error('Session expired. Please login again.')
//         window.location.href = '/login'
//       }
//     }
//     return Promise.reject(error)
//   }
// )

// function App() {
//   const [user, setUser] = useState(null)
//   const [loading, setLoading] = useState(true)
//   const [isGlobalAdmin, setIsGlobalAdmin] = useState(false)

//   useEffect(() => {
//     checkAuthStatus()
//   }, [])

//   const checkAuthStatus = async () => {
//     try {
//       const globalAdminToken = localStorage.getItem('globalAdminToken')
//       const userAdminToken = localStorage.getItem('userAdminToken')
//       const userToken = localStorage.getItem('token')

//       if (globalAdminToken) {
//         axios.defaults.headers.common['Authorization'] = `Bearer ${globalAdminToken}`
//         await axios.get('/global-admin/profile')
//         setIsGlobalAdmin(true)
//       } else if (userAdminToken) {
//         axios.defaults.headers.common['Authorization'] = `Bearer ${userAdminToken}`
//         const response = await axios.get('/auth/profile')
//         setUser(response.data.user)
//       } else if (userToken) {
//         axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
//         const response = await axios.get('/auth/profile')
//         setUser(response.data.user)
//       } else {
//         localStorage.clear()
//       }
//     } catch (error) {
//       localStorage.clear()
//       delete axios.defaults.headers.common['Authorization']
//       setUser(null)
//       setIsGlobalAdmin(false)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const login = (userData, token) => {
//     setUser(userData)
//     localStorage.setItem('token', token)
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//   }

//   const logout = () => {
//     setUser(null)
//     setIsGlobalAdmin(false)
//     localStorage.removeItem('token')
//     localStorage.removeItem('globalAdminToken')
//     localStorage.removeItem('userAdminToken')
//     localStorage.removeItem('userAdminSession')
//     delete axios.defaults.headers.common['Authorization']
//   }

//   const globalAdminLogin = (token) => {
//     setIsGlobalAdmin(true)
//     localStorage.setItem('globalAdminToken', token)
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//   }

//   const globalAdminLogout = () => {
//     setIsGlobalAdmin(false)
//     localStorage.removeItem('globalAdminToken')
//     if (user) {
//       const userToken = localStorage.getItem('token')
//       if (userToken) {
//         axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
//       }
//     } else {
//       delete axios.defaults.headers.common['Authorization']
//     }
//   }

//   if (loading) return <LoadingSpinner />

//   return (
//     <>
//       <NotificationSystem />
//       <Routes>
//         {isGlobalAdmin ? (
//           <Route path="/*" element={
//             <GlobalAdminLayout onLogout={globalAdminLogout}>
//               <Routes>
//                 <Route path="/" element={<GlobalAdminDashboard />} />
//                 <Route path="/global-admin/*" element={<GlobalAdminDashboard />} />
//                 <Route path="*" element={<Navigate to="/" replace />} />
//               </Routes>
//             </GlobalAdminLayout>
//           } />
//         ) : (
//           <>
//             {/* Auth Routes */}
//             <Route path="/login" element={
//               user ? <Navigate to="/dashboard" replace /> : 
//               <AuthLayout>
//                 <Login onLogin={login} />
//               </AuthLayout>
//             } />
//             <Route path="/register" element={
//               user ? <Navigate to="/dashboard" replace /> : 
//               <AuthLayout>
//                 <Register onRegister={login} />
//               </AuthLayout>
//             } />
//             <Route path="/global-admin-login" element={
//               <AuthLayout>
//                 <GlobalAdminLogin onLogin={globalAdminLogin} />
//               </AuthLayout>
//             } />
//             <Route path="/confirm-email/:token" element={<EmailConfirm />} />
//             <Route path="/reset-password/:token" element={<ResetPassword />} />

//             {/* User Dashboard Routes */}
//             <Route path="/dashboard" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <Dashboard />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/profile" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <Profile />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/items" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <Items />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/add-item" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <AddItem />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/escrow-tickets" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <EscrowTickets />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/tickets" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <Tickets />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/admin-access" element={
//               <ProtectedRoute user={user}>
//                 <DashboardLayout user={user} onLogout={logout}>
//                   <AdminAccess />
//                 </DashboardLayout>
//               </ProtectedRoute>
//             } />

//             {/* User Admin Routes */}
//             <Route path="/user-admin" element={
//               <ProtectedRoute user={user}>
//                 <AdminLayout user={user} onLogout={logout}>
//                   <UserAdminDashboard />
//                 </AdminLayout>
//               </ProtectedRoute>
//             } />
//             <Route path="/user-admin/settings" element={
//               <ProtectedRoute user={user}>
//                 <AdminLayout user={user} onLogout={logout}>
//                   <UserAdminSettings />
//                 </AdminLayout>
//               </ProtectedRoute>
//             } />

//             {/* Redirects */}
//             <Route path="/" element={
//               user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
//             } />
//             <Route path="*" element={<Navigate to="/" replace />} />
//           </>
//         )}
//       </Routes>
//     </>
//   )
// }

// export default App
