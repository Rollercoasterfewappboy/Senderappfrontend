import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FiPackage,
  FiClock,
  FiXCircle,
  FiPlus,
  FiTrendingUp,
  FiActivity,
  FiCheckCircle
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Dashboard() {
  // Removed item stats and recentItems for user dashboard cleanup
  const [loading, setLoading] = useState(true)
  const [userTimezone, setUserTimezone] = useState('UTC')

  useEffect(() => {
    fetchUserTimezone()
  }, [])

  const fetchUserTimezone = async () => {
    try {
      const response = await axios.get('/auth/profile')
      const tz = response.data.user.preferredTimezone || 'UTC'
      console.log('📍 Dashboard: User timezone fetched:', tz)
      setUserTimezone(tz)
    } catch (error) {
      console.error('Error fetching user timezone:', error)
      console.log('📍 Dashboard: Using default timezone: UTC')
    }
  }

  // Removed fetchDashboardData for user dashboard cleanup

  // Removed statCards for user dashboard cleanup

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-success-100 text-success-800',
      unpaid: 'bg-error-100 text-error-800',
      pending: 'bg-warning-100 text-warning-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  // Removed loading state for user dashboard cleanup

  // Removed totalRevenue calculation for user dashboard cleanup

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your marketplace.</p>
      </div>
      {/* All item, escrow, support, quick actions, and stats removed for user dashboard */}
    </div>
  )
}

// import { useState, useEffect } from 'react'
// import { Link } from 'react-router-dom'
// import {
//   FiPackage,
//   FiClock,
//   FiXCircle,
//   FiPlus,
//   FiTrendingUp,
//   FiActivity,
//   FiCheckCircle
// } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'
// import SentRemindersWidget from '../../components/common/SentRemindersWidget'

// export default function Dashboard() {
//   const [stats, setStats] = useState({
//     totalItems: 0,
//     paidItems: 0,
//     unpaidItems: 0,
//     pendingItems: 0,
//     revenueByCurrency: []
//   })
//   const [recentItems, setRecentItems] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [userTimezone, setUserTimezone] = useState('UTC')

//   useEffect(() => {
//     fetchDashboardData()
//     fetchUserTimezone()
//   }, [])

//   const fetchUserTimezone = async () => {
//     try {
//       const response = await axios.get('/auth/profile')
//       setUserTimezone(response.data.user.preferredTimezone || 'UTC')
//     } catch (error) {
//       console.error('Error fetching user timezone:', error)
//     }
//   }

//   const fetchDashboardData = async () => {
//     try {
//       const [statsResponse, itemsResponse] = await Promise.all([
//         axios.get('/items/stats'),
//         axios.get('/items?limit=5')
//       ])

//       setStats(statsResponse.data)
//       setRecentItems(itemsResponse.data.items)
//     } catch (error) {
//       toast.error('Error loading dashboard data')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const statCards = [
//     { title: 'Total Items', value: stats.totalItems, icon: FiPackage, color: 'bg-blue-500', textColor: 'text-blue-600' },
//     { title: 'Paid Items', value: stats.paidItems, icon: FiCheckCircle, color: 'bg-success-500', textColor: 'text-success-600' },
//     { title: 'Unpaid Items', value: stats.unpaidItems, icon: FiXCircle, color: 'bg-error-500', textColor: 'text-error-600' },
//     { title: 'Pending Items', value: stats.pendingItems, icon: FiClock, color: 'bg-warning-500', textColor: 'text-warning-600' }
//   ]

//   const getStatusBadge = (status) => {
//     const badges = {
//       paid: 'bg-success-100 text-success-800',
//       unpaid: 'bg-error-100 text-error-800',
//       pending: 'bg-warning-100 text-warning-800'
//     }
//     return badges[status] || 'bg-gray-100 text-gray-800'
//   }

//   if (loading) {
//     return (
//       <div className="animate-pulse">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           {[...Array(4)].map((_, i) => (
//             <div key={i} className="card h-24 bg-gray-200"></div>
//           ))}
//         </div>
//       </div>
//     )
//   }

//   // Calculate total revenue across all currencies
//   const totalRevenue = stats.revenueByCurrency?.reduce((sum, r) => sum + (r.totalRevenue || 0), 0) || 0

//   return (
//     <div className="max-w-7xl mx-auto">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
//         <p className="text-gray-600">Welcome back! Here's what's happening with your marketplace.</p>
//       </div>

//       {/* Stats Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//         {statCards.map((card, index) => {
//           const Icon = card.icon
//           return (
//             <div key={index} className="card">
//               <div className="flex items-center">
//                 {Icon && (
//                   <div className={`p-3 rounded-lg ${card.color}`}>
//                     <Icon className="w-6 h-6 text-white" />
//                   </div>
//                 )}
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">{card.title}</p>
//                   <p className={`text-2xl font-bold ${card.textColor}`}>
//                     {card.value.toLocaleString()}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )
//         })}
//       </div>

//       {/* Revenue Card */}
//       <div className="card mb-8">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
//           <FiTrendingUp className="w-5 h-5 text-success-500" />
//         </div>
//         <div className="flex items-baseline">
//           <span className="text-3xl font-bold text-success-600">
//             {stats.revenueByCurrency && stats.revenueByCurrency.length > 0
//               ? stats.revenueByCurrency.map(r => `${r.currency} ${Number(r.totalRevenue).toLocaleString()}`).join(' | ')
//               : `NGN ${totalRevenue.toLocaleString()}`
//             }
//           </span>
//           <span className="ml-2 text-sm text-gray-500">from paid items</span>
//         </div>

//         {/* Currency Buttons */}
//         {stats.revenueByCurrency && stats.revenueByCurrency.length > 0 && (
//           <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
//             {stats.revenueByCurrency.map(r => (
//               <button
//                 key={r.currency}
//                 onClick={() => window.location.href = `/items?currency=${r.currency}`}
//                 className="p-3 border rounded text-left hover:shadow"
//               >
//                 <div className="text-sm text-gray-500">{r.currency}</div>
//                 <div className="font-semibold">{Number(r.totalRevenue).toLocaleString()}</div>
//                 <div className="text-xs text-gray-400">{r.count} items</div>
//               </button>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Sent Reminders Widget */}
//       <div className="mb-8">
//         <SentRemindersWidget userTimezone={userTimezone} />
//       </div>

//       {/* Quick Actions */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         <Link to="/add-item" className="card hover:shadow-lg transition-shadow cursor-pointer group">
//           <div className="flex items-center">
//             <div className="p-3 rounded-lg bg-primary-100 group-hover:bg-primary-200 transition-colors">
//               <FiPlus className="w-6 h-6 text-primary-600" />
//             </div>
//             <div className="ml-4">
//               <h4 className="font-semibold text-gray-900">Add New Item</h4>
//               <p className="text-sm text-gray-600">Create a new marketplace item</p>
//             </div>
//           </div>
//         </Link>

//         <Link to="/items" className="card hover:shadow-lg transition-shadow cursor-pointer group">
//           <div className="flex items-center">
//             <div className="p-3 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
//               <FiPackage className="w-6 h-6 text-blue-600" />
//             </div>
//             <div className="ml-4">
//               <h4 className="font-semibold text-gray-900">View All Items</h4>
//               <p className="text-sm text-gray-600">Manage your marketplace items</p>
//             </div>
//           </div>
//         </Link>

//         <Link to="/tickets" className="card hover:shadow-lg transition-shadow cursor-pointer group">
//           <div className="flex items-center">
//             <div className="p-3 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
//               <FiActivity className="w-6 h-6 text-purple-600" />
//             </div>
//             <div className="ml-4">
//               <h4 className="font-semibold text-gray-900">Support Center</h4>
//               <p className="text-sm text-gray-600">Get help and support</p>
//             </div>
//           </div>
//         </Link>
//       </div>

//       {/* Recent Items */}
//       <div className="card">
//         <div className="flex items-center justify-between mb-6">
//           <h3 className="text-lg font-semibold text-gray-900">Recent Items</h3>
//           <Link to="/items" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
//             View all →
//           </Link>
//         </div>

//         {recentItems.length > 0 ? (
//           <div className="space-y-4">
//             {recentItems.map((item) => (
//               <div key={item._id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
//                 {item.image && (
//                   <img
//                     src={item.image}
//                     alt={item.name}
//                     className="w-12 h-12 rounded-lg object-cover"
//                   />
//                 )}
//                 <div className="flex-1 min-w-0">
//                   <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
//                   <p className="text-sm text-gray-600">
//                     {item.currency || 'NGN'} {item.totalAmount?.toLocaleString() || item.price?.toLocaleString()} • {new Date(item.createdAt).toLocaleDateString()}
//                   </p>
//                 </div>
//                 <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
//                   {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
//                 </span>
//               </div>
//             ))}
//           </div>
//         ) : (
//           <div className="text-center py-8">
//             <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//             <h4 className="text-lg font-medium text-gray-900 mb-2">No items yet</h4>
//             <p className="text-gray-600 mb-4">Get started by adding your first item</p>
//             <Link to="/add-item" className="btn-primary">
//               Add Your First Item
//             </Link>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }








// ...........................
// dollar
// import { useState, useEffect } from 'react'
// import { Link } from 'react-router-dom'
// import { 
//   FiPackage, 
//   FiDollarSign, 
//   FiClock, 
//   FiXCircle,
//   FiPlus,
//   FiTrendingUp,
//   FiActivity
// } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'

// export default function Dashboard() {
//   const [stats, setStats] = useState({
//     totalItems: 0,
//     paidItems: 0,
//     unpaidItems: 0,
//     pendingItems: 0,
//     totalRevenue: 0
//   })
//   const [recentItems, setRecentItems] = useState([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     fetchDashboardData()
//   }, [])

//   const fetchDashboardData = async () => {
//     try {
//       const [statsResponse, itemsResponse] = await Promise.all([
//         axios.get('/items/stats'),
//         axios.get('/items?limit=5')
//       ])
      
//       setStats(statsResponse.data)
//       setRecentItems(itemsResponse.data.items)
//     } catch (error) {
//       toast.error('Error loading dashboard data')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const statCards = [
//     {
//       title: 'Total Items',
//       value: stats.totalItems,
//       icon: FiPackage,
//       color: 'bg-blue-500',
//       textColor: 'text-blue-600'
//     },
//     {
//       title: 'Paid Items',
//       value: stats.paidItems,
//       icon: FiDollarSign,
//       color: 'bg-success-500',
//       textColor: 'text-success-600'
//     },
//     {
//       title: 'Unpaid Items',
//       value: stats.unpaidItems,
//       icon: FiXCircle,
//       color: 'bg-error-500',
//       textColor: 'text-error-600'
//     },
//     {
//       title: 'Pending Items',
//       value: stats.pendingItems,
//       icon: FiClock,
//       color: 'bg-warning-500',
//       textColor: 'text-warning-600'
//     }
//   ]

//   const getStatusBadge = (status) => {
//     const badges = {
//       paid: 'bg-success-100 text-success-800',
//       unpaid: 'bg-error-100 text-error-800',
//       pending: 'bg-warning-100 text-warning-800'
//     }
//     return badges[status] || 'bg-gray-100 text-gray-800'
//   }

//   if (loading) {
//     return (
//       <div className="animate-pulse">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           {[...Array(4)].map((_, i) => (
//             <div key={i} className="card h-24 bg-gray-200"></div>
//           ))}
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="max-w-7xl mx-auto">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
//         <p className="text-gray-600">Welcome back! Here's what's happening with your marketplace.</p>
//       </div>

//       {/* Stats Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//         {statCards.map((card, index) => {
//           const Icon = card.icon
//           return (
//             <div key={index} className="card">
//               <div className="flex items-center">
//                 <div className={`p-3 rounded-lg ${card.color}`}>
//                   <Icon className="w-6 h-6 text-white" />
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">{card.title}</p>
//                   <p className={`text-2xl font-bold ${card.textColor}`}>
//                     {card.value.toLocaleString()}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )
//         })}
//       </div>

//       {/* Revenue Card */}
//       <div className="card mb-8">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
//           <FiTrendingUp className="w-5 h-5 text-success-500" />
//         </div>
//         <div className="flex items-baseline">
//           <span className="text-3xl font-bold text-success-600">
//             ₦{stats.totalRevenue?.toLocaleString() || '0'}
//           </span>
//           <span className="ml-2 text-sm text-gray-500">from paid items</span>
//         </div>
//       </div>

//       {/* Quick Actions */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         <Link
//           to="/add-item"
//           className="card hover:shadow-lg transition-shadow cursor-pointer group"
//         >
//           <div className="flex items-center">
//             <div className="p-3 rounded-lg bg-primary-100 group-hover:bg-primary-200 transition-colors">
//               <FiPlus className="w-6 h-6 text-primary-600" />
//             </div>
//             <div className="ml-4">
//               <h4 className="font-semibold text-gray-900">Add New Item</h4>
//               <p className="text-sm text-gray-600">Create a new marketplace item</p>
//             </div>
//           </div>
//         </Link>

//         <Link
//           to="/items"
//           className="card hover:shadow-lg transition-shadow cursor-pointer group"
//         >
//           <div className="flex items-center">
//             <div className="p-3 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
//               <FiPackage className="w-6 h-6 text-blue-600" />
//             </div>
//             <div className="ml-4">
//               <h4 className="font-semibold text-gray-900">View All Items</h4>
//               <p className="text-sm text-gray-600">Manage your marketplace items</p>
//             </div>
//           </div>
//         </Link>

//         <Link
//           to="/tickets"
//           className="card hover:shadow-lg transition-shadow cursor-pointer group"
//         >
//           <div className="flex items-center">
//             <div className="p-3 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
//               <FiActivity className="w-6 h-6 text-purple-600" />
//             </div>
//             <div className="ml-4">
//               <h4 className="font-semibold text-gray-900">Support Center</h4>
//               <p className="text-sm text-gray-600">Get help and support</p>
//             </div>
//           </div>
//         </Link>
//       </div>

//       {/* Recent Items */}
//       <div className="card">
//         <div className="flex items-center justify-between mb-6">
//           <h3 className="text-lg font-semibold text-gray-900">Recent Items</h3>
//           <Link
//             to="/items"
//             className="text-sm text-primary-600 hover:text-primary-700 font-medium"
//           >
//             View all →
//           </Link>
//         </div>

//         {recentItems.length > 0 ? (
//           <div className="space-y-4">
//             {recentItems.map((item) => (
//               <div key={item._id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
//                 {item.image && (
//                   <img
//                     src={item.image}
//                     alt={item.name}
//                     className="w-12 h-12 rounded-lg object-cover"
//                   />
//                 )}
//                 <div className="flex-1 min-w-0">
//                   <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
//                   <p className="text-sm text-gray-600">
//                     ₦{item.price?.toLocaleString()} • {new Date(item.createdAt).toLocaleDateString()}
//                   </p>
//                 </div>
//                 <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
//                   {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
//                 </span>
//               </div>
//             ))}
//           </div>
//         ) : (
//           <div className="text-center py-8">
//             <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//             <h4 className="text-lg font-medium text-gray-900 mb-2">No items yet</h4>
//             <p className="text-gray-600 mb-4">Get started by adding your first item</p>
//             <Link to="/add-item" className="btn-primary">
//               Add Your First Item
//             </Link>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }