import { useState, useEffect } from 'react'
import { FiX, FiLoader, FiCheck, FiTrendingUp } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ReportsModal({ isOpen, website, onClose }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [actingOnId, setActingOnId] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionType, setActionType] = useState('warning')
  const [actionReason, setActionReason] = useState('')
  const [showActionForm, setShowActionForm] = useState(false)

  useEffect(() => {
    if (isOpen && website) {
      fetchReports()
    }
  }, [isOpen, website, filterStatus])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/global-admin/websites/${website._id}/reports`, {
        params: { status: filterStatus }
      })
      setReports(response.data.reports || [])
      console.log('[ReportsModal] Fetched reports:', response.data.reports?.map(r => ({ _id: r._id, reportId: r.reportId })))
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleTakeAction = async (e) => {
    e.preventDefault()
    if (!selectedReport || !actionType || !actionReason.trim()) {
      alert('Please fill all fields')
      return
    }

    setActingOnId(selectedReport._id)
    try {
      // Use reportId if available, otherwise fall back to Mongo _id
      const reportIdentifier = selectedReport.reportId || selectedReport._id
      console.log('[ReportsModal] Taking action on report:', { reportId: selectedReport.reportId, _id: selectedReport._id, using: reportIdentifier, actionType, reason: actionReason })
      
      const response = await axios.put(`/global-admin/websites/reports/${reportIdentifier}/resolve`, {
        actionType,
        reason: actionReason
      })
      
      console.log('[ReportsModal] Action response:', response.data)
      toast.success('Action taken on report')
      setSelectedReport(null)
      setShowActionForm(false)
      setActionType('warning')
      setActionReason('')
      fetchReports()
    } catch (error) {
      console.error('[ReportsModal] Error taking action:', error.response?.data || error.message)
      toast.error(error.response?.data?.message || 'Failed to take action')
    } finally {
      setActingOnId(null)
    }
  }

  const handleDismissReport = async (report) => {
    if (!window.confirm('Dismiss this report? It will be marked as resolved.')) return
    setActingOnId(report._id)
    try {
      const reportIdentifier = report.reportId || report._id
      console.log('[ReportsModal] Dismissing report:', { reportId: report.reportId, _id: report._id, using: reportIdentifier })
      
      await axios.put(`/global-admin/websites/reports/${reportIdentifier}/dismiss`)
      toast.success('Report dismissed')
      fetchReports()
    } catch (error) {
      console.error('[ReportsModal] Error dismissing report:', error.response?.data || error.message)
      toast.error(error.response?.data?.message || 'Failed to dismiss report')
    } finally {
      setActingOnId(null)
    }
  }

  if (!isOpen || !website) return null

  const filteredReports = reports.filter(r => r.status === filterStatus)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reports for {website.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Content reports and moderation actions</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50">
          {['pending', 'investigating', 'resolved', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                filterStatus === status
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {reports.filter(r => r.status === status).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                  {reports.filter(r => r.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No {filterStatus} reports</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map(report => (
                <div key={report._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                          {report.reportType.replace('-', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Reporter:</span> {report.reporterName || report.reporterEmail || 'Anonymous'}
                      </p>
                      {report.sectionId && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Section:</span> {report.sectionId.title}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report)
                          setShowActionForm(true)
                        }}
                        className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
                      >
                        Take Action
                      </button>
                      {filterStatus === 'pending' && (
                        <button
                          onClick={() => handleDismissReport(report)}
                          disabled={actingOnId === report._id}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {actingOnId === report._id ? (
                            <FiLoader className="w-4 h-4 animate-spin inline" />
                          ) : (
                            'Dismiss'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Form */}
        {showActionForm && selectedReport && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-4">Take Action on Report</h3>
            <form onSubmit={handleTakeAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="input-field"
                >
                  <option value="warning">Send Warning</option>
                  <option value="deleted">Delete Website</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain the action taken..."
                  className="input-field"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionForm(false)
                    setSelectedReport(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actingOnId === selectedReport._id}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actingOnId === selectedReport._id ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" /> Take Action
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}













// import { useState, useEffect } from 'react'
// import { FiX, FiLoader, FiCheck, FiTrendingUp } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'

// export default function ReportsModal({ isOpen, website, onClose }) {
//   const [reports, setReports] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [filterStatus, setFilterStatus] = useState('pending')
//   const [actingOnId, setActingOnId] = useState(null)
//   const [selectedReport, setSelectedReport] = useState(null)
//   const [actionType, setActionType] = useState('warning')
//   const [actionReason, setActionReason] = useState('')
//   const [showActionForm, setShowActionForm] = useState(false)

//   useEffect(() => {
//     if (isOpen && website) {
//       fetchReports()
//     }
//   }, [isOpen, website, filterStatus])

//   const fetchReports = async () => {
//     try {
//       setLoading(true)
//       const response = await axios.get(`/global-admin/websites/${website._id}/reports`, {
//         params: { status: filterStatus }
//       })
//       setReports(response.data.reports || [])
//       console.log('[ReportsModal] Fetched reports:', response.data.reports?.map(r => ({ _id: r._id, reportId: r.reportId })))
//     } catch (error) {
//       console.error('Error fetching reports:', error)
//       toast.error('Failed to load reports')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleTakeAction = async (e) => {
//     e.preventDefault()
//     if (!selectedReport || !actionType || !actionReason.trim()) {
//       alert('Please fill all fields')
//       return
//     }

//     setActingOnId(selectedReport._id)
//     try {
//       // Use reportId if available, otherwise fall back to Mongo _id
//       const reportIdentifier = selectedReport.reportId || selectedReport._id
//       console.log('[ReportsModal] Taking action on report:', { reportId: selectedReport.reportId, _id: selectedReport._id, using: reportIdentifier, actionType, reason: actionReason })
      
//       const response = await axios.put(`/global-admin/websites/reports/${reportIdentifier}/resolve`, {
//         actionType,
//         reason: actionReason
//       })
      
//       console.log('[ReportsModal] Action response:', response.data)
//       toast.success('Action taken on report')
//       setSelectedReport(null)
//       setShowActionForm(false)
//       setActionType('warning')
//       setActionReason('')
//       fetchReports()
//     } catch (error) {
//       console.error('[ReportsModal] Error taking action:', error.response?.data || error.message)
//       toast.error(error.response?.data?.message || 'Failed to take action')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   const handleDismissReport = async (report) => {
//     if (!window.confirm('Dismiss this report? It will be marked as resolved.')) return
//     setActingOnId(report._id)
//     try {
//       const reportIdentifier = report.reportId || report._id
//       console.log('[ReportsModal] Dismissing report:', { reportId: report.reportId, _id: report._id, using: reportIdentifier })
      
//       await axios.put(`/global-admin/websites/reports/${reportIdentifier}/dismiss`)
//       toast.success('Report dismissed')
//       fetchReports()
//     } catch (error) {
//       console.error('[ReportsModal] Error dismissing report:', error.response?.data || error.message)
//       toast.error(error.response?.data?.message || 'Failed to dismiss report')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   if (!isOpen || !website) return null

//   const filteredReports = reports.filter(r => r.status === filterStatus)

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-96 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-200">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900">Reports for {website.name}</h2>
//             <p className="text-sm text-gray-600 mt-1">Content reports and moderation actions</p>
//           </div>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
//             <FiX className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-gray-200 px-6 bg-gray-50">
//           {['pending', 'investigating', 'resolved', 'dismissed'].map(status => (
//             <button
//               key={status}
//               onClick={() => setFilterStatus(status)}
//               className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 filterStatus === status
//                   ? 'border-primary-600 text-primary-600'
//                   : 'border-transparent text-gray-600 hover:text-gray-900'
//               }`}
//             >
//               {status.charAt(0).toUpperCase() + status.slice(1)}
//               {reports.filter(r => r.status === status).length > 0 && (
//                 <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
//                   {reports.filter(r => r.status === status).length}
//                 </span>
//               )}
//             </button>
//           ))}
//         </div>

//         {/* Content */}
//         <div className="flex-1 overflow-y-auto p-6">
//           {loading ? (
//             <div className="flex justify-center py-8">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
//             </div>
//           ) : filteredReports.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-500">No {filterStatus} reports</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {filteredReports.map(report => (
//                 <div key={report._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
//                   <div className="flex items-start justify-between gap-4">
//                     <div className="flex-1">
//                       <div className="flex items-center gap-2 mb-2">
//                         <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
//                           {report.reportType.replace('-', ' ')}
//                         </span>
//                         <span className="text-xs text-gray-500">
//                           {new Date(report.createdAt).toLocaleDateString()}
//                         </span>
//                       </div>
//                       <p className="text-sm text-gray-700 mb-2">{report.description}</p>
//                       <p className="text-xs text-gray-600">
//                         <span className="font-medium">Reporter:</span> {report.reporterName || report.reporterEmail || 'Anonymous'}
//                       </p>
//                       {report.sectionId && (
//                         <p className="text-xs text-gray-600">
//                           <span className="font-medium">Section:</span> {report.sectionId.title}
//                         </p>
//                       )}
//                     </div>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => {
//                           setSelectedReport(report)
//                           setShowActionForm(true)
//                         }}
//                         className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
//                       >
//                         Take Action
//                       </button>
//                       {filterStatus === 'pending' && (
//                         <button
//                           onClick={() => handleDismissReport(report)}
//                           disabled={actingOnId === report._id}
//                           className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
//                         >
//                           {actingOnId === report._id ? (
//                             <FiLoader className="w-4 h-4 animate-spin inline" />
//                           ) : (
//                             'Dismiss'
//                           )}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Action Form */}
//         {showActionForm && selectedReport && (
//           <div className="border-t border-gray-200 p-6 bg-gray-50">
//             <h3 className="font-medium text-gray-900 mb-4">Take Action on Report</h3>
//             <form onSubmit={handleTakeAction} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
//                 <select
//                   value={actionType}
//                   onChange={(e) => setActionType(e.target.value)}
//                   className="input-field"
//                 >
//                   <option value="warning">Send Warning</option>
//                   <option value="account-suspended">Suspend Website</option>
//                   <option value="deleted">Delete Website</option>
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
//                 <textarea
//                   value={actionReason}
//                   onChange={(e) => setActionReason(e.target.value)}
//                   placeholder="Explain the action taken..."
//                   className="input-field"
//                   rows="3"
//                   required
//                 />
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowActionForm(false)
//                     setSelectedReport(null)
//                   }}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={actingOnId === selectedReport._id}
//                   className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
//                 >
//                   {actingOnId === selectedReport._id ? (
//                     <>
//                       <FiLoader className="w-4 h-4 animate-spin" /> Processing...
//                     </>
//                   ) : (
//                     <>
//                       <FiCheck className="w-4 h-4" /> Take Action
//                     </>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }












// import { useState, useEffect } from 'react'
// import { FiX, FiLoader, FiCheck, FiTrendingUp } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'

// export default function ReportsModal({ isOpen, website, onClose }) {
//   const [reports, setReports] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [filterStatus, setFilterStatus] = useState('pending')
//   const [actingOnId, setActingOnId] = useState(null)
//   const [selectedReport, setSelectedReport] = useState(null)
//   const [actionType, setActionType] = useState('warning')
//   const [actionReason, setActionReason] = useState('')
//   const [showActionForm, setShowActionForm] = useState(false)

//   useEffect(() => {
//     if (isOpen && website) {
//       fetchReports()
//     }
//   }, [isOpen, website, filterStatus])

//   const fetchReports = async () => {
//     try {
//       setLoading(true)
//       const response = await axios.get(`/global-admin/websites/${website._id}/reports`, {
//         params: { status: filterStatus }
//       })
//       setReports(response.data.reports || [])
//     } catch (error) {
//       console.error('Error fetching reports:', error)
//       toast.error('Failed to load reports')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleTakeAction = async (e) => {
//     e.preventDefault()
//     if (!selectedReport || !actionType || !actionReason.trim()) {
//       alert('Please fill all fields')
//       return
//     }

//     setActingOnId(selectedReport._id)
//     try {
//       await axios.put(`/global-admin/reports/${selectedReport.reportId}/resolve`, {
//         actionType,
//         reason: actionReason
//       })
//       toast.success('Action taken on report')
//       setSelectedReport(null)
//       setShowActionForm(false)
//       setActionType('warning')
//       setActionReason('')
//       fetchReports()
//     } catch (error) {
//       console.error('Error taking action:', error)
//       toast.error('Failed to take action')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   const handleDismissReport = async (report) => {
//     if (!window.confirm('Dismiss this report? It will be marked as resolved.')) return
//     setActingOnId(report._id)
//     try {
//       await axios.put(`/global-admin/reports/${report.reportId}/dismiss`)
//       toast.success('Report dismissed')
//       fetchReports()
//     } catch (error) {
//       console.error('Error dismissing report:', error)
//       toast.error('Failed to dismiss report')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   if (!isOpen || !website) return null

//   const filteredReports = reports.filter(r => r.status === filterStatus)

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-96 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-200">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900">Reports for {website.name}</h2>
//             <p className="text-sm text-gray-600 mt-1">Content reports and moderation actions</p>
//           </div>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
//             <FiX className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-gray-200 px-6 bg-gray-50">
//           {['pending', 'investigating', 'resolved', 'dismissed'].map(status => (
//             <button
//               key={status}
//               onClick={() => setFilterStatus(status)}
//               className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 filterStatus === status
//                   ? 'border-primary-600 text-primary-600'
//                   : 'border-transparent text-gray-600 hover:text-gray-900'
//               }`}
//             >
//               {status.charAt(0).toUpperCase() + status.slice(1)}
//               {reports.filter(r => r.status === status).length > 0 && (
//                 <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
//                   {reports.filter(r => r.status === status).length}
//                 </span>
//               )}
//             </button>
//           ))}
//         </div>

//         {/* Content */}
//         <div className="flex-1 overflow-y-auto p-6">
//           {loading ? (
//             <div className="flex justify-center py-8">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
//             </div>
//           ) : filteredReports.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-500">No {filterStatus} reports</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {filteredReports.map(report => (
//                 <div key={report._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
//                   <div className="flex items-start justify-between gap-4">
//                     <div className="flex-1">
//                       <div className="flex items-center gap-2 mb-2">
//                         <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
//                           {report.reportType.replace('-', ' ')}
//                         </span>
//                         <span className="text-xs text-gray-500">
//                           {new Date(report.createdAt).toLocaleDateString()}
//                         </span>
//                       </div>
//                       <p className="text-sm text-gray-700 mb-2">{report.description}</p>
//                       <p className="text-xs text-gray-600">
//                         <span className="font-medium">Reporter:</span> {report.reporterName || report.reporterEmail || 'Anonymous'}
//                       </p>
//                       {report.sectionId && (
//                         <p className="text-xs text-gray-600">
//                           <span className="font-medium">Section:</span> {report.sectionId.title}
//                         </p>
//                       )}
//                     </div>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => {
//                           setSelectedReport(report)
//                           setShowActionForm(true)
//                         }}
//                         className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
//                       >
//                         Take Action
//                       </button>
//                       {filterStatus === 'pending' && (
//                         <button
//                           onClick={() => handleDismissReport(report)}
//                           disabled={actingOnId === report._id}
//                           className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
//                         >
//                           {actingOnId === report._id ? (
//                             <FiLoader className="w-4 h-4 animate-spin inline" />
//                           ) : (
//                             'Dismiss'
//                           )}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Action Form */}
//         {showActionForm && selectedReport && (
//           <div className="border-t border-gray-200 p-6 bg-gray-50">
//             <h3 className="font-medium text-gray-900 mb-4">Take Action on Report</h3>
//             <form onSubmit={handleTakeAction} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
//                 <select
//                   value={actionType}
//                   onChange={(e) => setActionType(e.target.value)}
//                   className="input-field"
//                 >
//                   <option value="warning">Send Warning</option>
//                   <option value="account-suspended">Suspend Website</option>
//                   <option value="deleted">Delete Website</option>
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
//                 <textarea
//                   value={actionReason}
//                   onChange={(e) => setActionReason(e.target.value)}
//                   placeholder="Explain the action taken..."
//                   className="input-field"
//                   rows="3"
//                   required
//                 />
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowActionForm(false)
//                     setSelectedReport(null)
//                   }}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={actingOnId === selectedReport._id}
//                   className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
//                 >
//                   {actingOnId === selectedReport._id ? (
//                     <>
//                       <FiLoader className="w-4 h-4 animate-spin" /> Processing...
//                     </>
//                   ) : (
//                     <>
//                       <FiCheck className="w-4 h-4" /> Take Action
//                     </>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }








// import { useState, useEffect } from 'react'
// import { FiX, FiLoader, FiCheck, FiTrendingUp } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'

// export default function ReportsModal({ isOpen, website, onClose }) {
//   const [reports, setReports] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [filterStatus, setFilterStatus] = useState('pending')
//   const [actingOnId, setActingOnId] = useState(null)
//   const [selectedReport, setSelectedReport] = useState(null)
//   const [actionType, setActionType] = useState('warning')
//   const [actionReason, setActionReason] = useState('')
//   const [showActionForm, setShowActionForm] = useState(false)

//   useEffect(() => {
//     if (isOpen && website) {
//       fetchReports()
//     }
//   }, [isOpen, website, filterStatus])

//   const fetchReports = async () => {
//     try {
//       setLoading(true)
//       const response = await axios.get(`/global-admin/websites/${website._id}/reports`, {
//         params: { status: filterStatus }
//       })
//       setReports(response.data.reports || [])
//     } catch (error) {
//       console.error('Error fetching reports:', error)
//       toast.error('Failed to load reports')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleTakeAction = async (e) => {
//     e.preventDefault()
//     if (!selectedReport || !actionType || !actionReason.trim()) {
//       alert('Please fill all fields')
//       return
//     }

//     setActingOnId(selectedReport._id)
//     try {
//       await axios.put(`/global-admin/reports/${selectedReport.reportId}/resolve`, {
//         actionType,
//         reason: actionReason
//       })
//       toast.success('Action taken on report')
//       setSelectedReport(null)
//       setShowActionForm(false)
//       setActionType('warning')
//       setActionReason('')
//       fetchReports()
//     } catch (error) {
//       console.error('Error taking action:', error)
//       toast.error('Failed to take action')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   const handleDismissReport = async (report) => {
//     if (!window.confirm('Dismiss this report? It will be marked as resolved.')) return
//     setActingOnId(report._id)
//     try {
//       await axios.put(`/global-admin/reports/${report.reportId}/dismiss`)
//       toast.success('Report dismissed')
//       fetchReports()
//     } catch (error) {
//       console.error('Error dismissing report:', error)
//       toast.error('Failed to dismiss report')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   if (!isOpen || !website) return null

//   const filteredReports = reports.filter(r => r.status === filterStatus)

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-96 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-200">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900">Reports for {website.name}</h2>
//             <p className="text-sm text-gray-600 mt-1">Content reports and moderation actions</p>
//           </div>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
//             <FiX className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-gray-200 px-6 bg-gray-50">
//           {['pending', 'investigating', 'resolved', 'dismissed'].map(status => (
//             <button
//               key={status}
//               onClick={() => setFilterStatus(status)}
//               className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 filterStatus === status
//                   ? 'border-primary-600 text-primary-600'
//                   : 'border-transparent text-gray-600 hover:text-gray-900'
//               }`}
//             >
//               {status.charAt(0).toUpperCase() + status.slice(1)}
//               {reports.filter(r => r.status === status).length > 0 && (
//                 <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
//                   {reports.filter(r => r.status === status).length}
//                 </span>
//               )}
//             </button>
//           ))}
//         </div>

//         {/* Content */}
//         <div className="flex-1 overflow-y-auto p-6">
//           {loading ? (
//             <div className="flex justify-center py-8">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
//             </div>
//           ) : filteredReports.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-500">No {filterStatus} reports</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {filteredReports.map(report => (
//                 <div key={report._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
//                   <div className="flex items-start justify-between gap-4">
//                     <div className="flex-1">
//                       <div className="flex items-center gap-2 mb-2">
//                         <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
//                           {report.reportType.replace('-', ' ')}
//                         </span>
//                         <span className="text-xs text-gray-500">
//                           {new Date(report.createdAt).toLocaleDateString()}
//                         </span>
//                       </div>
//                       <p className="text-sm text-gray-700 mb-2">{report.description}</p>
//                       <p className="text-xs text-gray-600">
//                         <span className="font-medium">Reporter:</span> {report.reporterName || report.reporterEmail || 'Anonymous'}
//                       </p>
//                       {report.sectionId && (
//                         <p className="text-xs text-gray-600">
//                           <span className="font-medium">Section:</span> {report.sectionId.title}
//                         </p>
//                       )}
//                     </div>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => {
//                           setSelectedReport(report)
//                           setShowActionForm(true)
//                         }}
//                         className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
//                       >
//                         Take Action
//                       </button>
//                       {filterStatus === 'pending' && (
//                         <button
//                           onClick={() => handleDismissReport(report)}
//                           disabled={actingOnId === report._id}
//                           className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
//                         >
//                           {actingOnId === report._id ? (
//                             <FiLoader className="w-4 h-4 animate-spin inline" />
//                           ) : (
//                             'Dismiss'
//                           )}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Action Form */}
//         {showActionForm && selectedReport && (
//           <div className="border-t border-gray-200 p-6 bg-gray-50">
//             <h3 className="font-medium text-gray-900 mb-4">Take Action on Report</h3>
//             <form onSubmit={handleTakeAction} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
//                 <select
//                   value={actionType}
//                   onChange={(e) => setActionType(e.target.value)}
//                   className="input-field"
//                 >
//                   <option value="warning">Send Warning to Website Owner</option>
//                   <option value="account-suspended">Suspend Website</option>
//                   <option value="deleted">Delete Website Permanently</option>
//                   <option value="disabled">Disable Content/Section</option>
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
//                 <textarea
//                   value={actionReason}
//                   onChange={(e) => setActionReason(e.target.value)}
//                   placeholder="Explain the action taken..."
//                   className="input-field"
//                   rows="3"
//                   required
//                 />
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowActionForm(false)
//                     setSelectedReport(null)
//                   }}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={actingOnId === selectedReport._id}
//                   className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
//                 >
//                   {actingOnId === selectedReport._id ? (
//                     <>
//                       <FiLoader className="w-4 h-4 animate-spin" /> Processing...
//                     </>
//                   ) : (
//                     <>
//                       <FiCheck className="w-4 h-4" /> Take Action
//                     </>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }







// import { useState, useEffect } from 'react'
// import { FiX, FiLoader, FiCheck, FiTrendingUp } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'

// export default function ReportsModal({ isOpen, website, onClose }) {
//   const [reports, setReports] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [filterStatus, setFilterStatus] = useState('pending')
//   const [actingOnId, setActingOnId] = useState(null)
//   const [selectedReport, setSelectedReport] = useState(null)
//   const [actionType, setActionType] = useState('warning')
//   const [actionReason, setActionReason] = useState('')
//   const [showActionForm, setShowActionForm] = useState(false)

//   useEffect(() => {
//     if (isOpen && website) {
//       fetchReports()
//     }
//   }, [isOpen, website, filterStatus])

//   const fetchReports = async () => {
//     try {
//       setLoading(true)
//       const response = await axios.get(`/global-admin/websites/${website._id}/reports`, {
//         params: { status: filterStatus }
//       })
//       setReports(response.data.reports || [])
//     } catch (error) {
//       console.error('Error fetching reports:', error)
//       toast.error('Failed to load reports')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleTakeAction = async (e) => {
//     e.preventDefault()
//     if (!selectedReport || !actionType || !actionReason.trim()) {
//       alert('Please fill all fields')
//       return
//     }

//     setActingOnId(selectedReport._id)
//     try {
//       await axios.put(`/global-admin/reports/${selectedReport.reportId}/resolve`, {
//         actionType,
//         reason: actionReason
//       })
//       toast.success('Action taken on report')
//       setSelectedReport(null)
//       setShowActionForm(false)
//       setActionType('warning')
//       setActionReason('')
//       fetchReports()
//     } catch (error) {
//       console.error('Error taking action:', error)
//       toast.error('Failed to take action')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   const handleDismissReport = async (report) => {
//     if (!window.confirm('Dismiss this report? It will be marked as resolved.')) return
//     setActingOnId(report._id)
//     try {
//       await axios.put(`/global-admin/reports/${report.reportId}/dismiss`)
//       toast.success('Report dismissed')
//       fetchReports()
//     } catch (error) {
//       console.error('Error dismissing report:', error)
//       toast.error('Failed to dismiss report')
//     } finally {
//       setActingOnId(null)
//     }
//   }

//   if (!isOpen || !website) return null

//   const filteredReports = reports.filter(r => r.status === filterStatus)

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-96 flex flex-col">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-200">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900">Reports for {website.name}</h2>
//             <p className="text-sm text-gray-600 mt-1">Content reports and moderation actions</p>
//           </div>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
//             <FiX className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-gray-200 px-6 bg-gray-50">
//           {['pending', 'investigating', 'resolved', 'dismissed'].map(status => (
//             <button
//               key={status}
//               onClick={() => setFilterStatus(status)}
//               className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
//                 filterStatus === status
//                   ? 'border-primary-600 text-primary-600'
//                   : 'border-transparent text-gray-600 hover:text-gray-900'
//               }`}
//             >
//               {status.charAt(0).toUpperCase() + status.slice(1)}
//               {reports.filter(r => r.status === status).length > 0 && (
//                 <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
//                   {reports.filter(r => r.status === status).length}
//                 </span>
//               )}
//             </button>
//           ))}
//         </div>

//         {/* Content */}
//         <div className="flex-1 overflow-y-auto p-6">
//           {loading ? (
//             <div className="flex justify-center py-8">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
//             </div>
//           ) : filteredReports.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-500">No {filterStatus} reports</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {filteredReports.map(report => (
//                 <div key={report._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
//                   <div className="flex items-start justify-between gap-4">
//                     <div className="flex-1">
//                       <div className="flex items-center gap-2 mb-2">
//                         <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
//                           {report.reportType.replace('-', ' ')}
//                         </span>
//                         <span className="text-xs text-gray-500">
//                           {new Date(report.createdAt).toLocaleDateString()}
//                         </span>
//                       </div>
//                       <p className="text-sm text-gray-700 mb-2">{report.description}</p>
//                       <p className="text-xs text-gray-600">
//                         <span className="font-medium">Reporter:</span> {report.reporterName || report.reporterEmail || 'Anonymous'}
//                       </p>
//                       {report.sectionId && (
//                         <p className="text-xs text-gray-600">
//                           <span className="font-medium">Section:</span> {report.sectionId.title}
//                         </p>
//                       )}
//                     </div>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => {
//                           setSelectedReport(report)
//                           setShowActionForm(true)
//                         }}
//                         className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
//                       >
//                         Take Action
//                       </button>
//                       {filterStatus === 'pending' && (
//                         <button
//                           onClick={() => handleDismissReport(report)}
//                           disabled={actingOnId === report._id}
//                           className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
//                         >
//                           {actingOnId === report._id ? (
//                             <FiLoader className="w-4 h-4 animate-spin inline" />
//                           ) : (
//                             'Dismiss'
//                           )}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Action Form */}
//         {showActionForm && selectedReport && (
//           <div className="border-t border-gray-200 p-6 bg-gray-50">
//             <h3 className="font-medium text-gray-900 mb-4">Take Action on Report</h3>
//             <form onSubmit={handleTakeAction} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
//                 <select
//                   value={actionType}
//                   onChange={(e) => setActionType(e.target.value)}
//                   className="input-field"
//                 >
//                   <option value="warning">Send Warning</option>
//                   <option value="disabled">Disable Content</option>
//                   <option value="deleted">Delete Content</option>
//                   <option value="account-suspended">Suspend Account</option>
//                   <option value="account-banned">Ban Account</option>
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
//                 <textarea
//                   value={actionReason}
//                   onChange={(e) => setActionReason(e.target.value)}
//                   placeholder="Explain the action taken..."
//                   className="input-field"
//                   rows="3"
//                   required
//                 />
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowActionForm(false)
//                     setSelectedReport(null)
//                   }}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={actingOnId === selectedReport._id}
//                   className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
//                 >
//                   {actingOnId === selectedReport._id ? (
//                     <>
//                       <FiLoader className="w-4 h-4 animate-spin" /> Processing...
//                     </>
//                   ) : (
//                     <>
//                       <FiCheck className="w-4 h-4" /> Take Action
//                     </>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }








// // import { useState, useEffect } from 'react'
// // import { FiX, FiLoader, FiCheck, FiTrendingUp } from 'react-icons/fi'
// // import axios from 'axios'
// // import toast from 'react-hot-toast'

// // export default function ReportsModal({ isOpen, website, onClose }) {
// //   const [reports, setReports] = useState([])
// //   const [loading, setLoading] = useState(false)
// //   const [filterStatus, setFilterStatus] = useState('pending')
// //   const [actingOnId, setActingOnId] = useState(null)
// //   const [selectedReport, setSelectedReport] = useState(null)
// //   const [actionType, setActionType] = useState('warning')
// //   const [actionReason, setActionReason] = useState('')
// //   const [showActionForm, setShowActionForm] = useState(false)

// //   useEffect(() => {
// //     if (isOpen && website) {
// //       fetchReports()
// //     }
// //   }, [isOpen, website, filterStatus])

// //   const fetchReports = async () => {
// //     try {
// //       setLoading(true)
// //       const response = await axios.get(`/global-admin/websites/${website._id}/reports`, {
// //         params: { status: filterStatus }
// //       })
// //       setReports(response.data.reports || [])
// //     } catch (error) {
// //       console.error('Error fetching reports:', error)
// //       toast.error('Failed to load reports')
// //     } finally {
// //       setLoading(false)
// //     }
// //   }

// //   const handleTakeAction = async (e) => {
// //     e.preventDefault()
// //     if (!selectedReport || !actionType || !actionReason.trim()) {
// //       alert('Please fill all fields')
// //       return
// //     }

// //     setActingOnId(selectedReport._id)
// //     try {
// //       await axios.put(`/global-admin/reports/${selectedReport._id}/resolve`, {
// //         actionType,
// //         reason: actionReason
// //       })
// //       toast.success('Action taken on report')
// //       setSelectedReport(null)
// //       setShowActionForm(false)
// //       setActionType('warning')
// //       setActionReason('')
// //       fetchReports()
// //     } catch (error) {
// //       console.error('Error taking action:', error)
// //       toast.error('Failed to take action')
// //     } finally {
// //       setActingOnId(null)
// //     }
// //   }

// //   const handleDismissReport = async (report) => {
// //     if (!window.confirm('Dismiss this report? It will be marked as resolved.')) return
// //     setActingOnId(report._id)
// //     try {
// //       await axios.put(`/global-admin/reports/${report._id}/dismiss`)
// //       toast.success('Report dismissed')
// //       fetchReports()
// //     } catch (error) {
// //       console.error('Error dismissing report:', error)
// //       toast.error('Failed to dismiss report')
// //     } finally {
// //       setActingOnId(null)
// //     }
// //   }

// //   if (!isOpen || !website) return null

// //   const filteredReports = reports.filter(r => r.status === filterStatus)

// //   return (
// //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
// //       <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-96 flex flex-col">
// //         {/* Header */}
// //         <div className="flex items-center justify-between p-6 border-b border-gray-200">
// //           <div>
// //             <h2 className="text-xl font-bold text-gray-900">Reports for {website.name}</h2>
// //             <p className="text-sm text-gray-600 mt-1">Content reports and moderation actions</p>
// //           </div>
// //           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
// //             <FiX className="w-6 h-6" />
// //           </button>
// //         </div>

// //         {/* Tabs */}
// //         <div className="flex border-b border-gray-200 px-6 bg-gray-50">
// //           {['pending', 'investigating', 'resolved', 'dismissed'].map(status => (
// //             <button
// //               key={status}
// //               onClick={() => setFilterStatus(status)}
// //               className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
// //                 filterStatus === status
// //                   ? 'border-primary-600 text-primary-600'
// //                   : 'border-transparent text-gray-600 hover:text-gray-900'
// //               }`}
// //             >
// //               {status.charAt(0).toUpperCase() + status.slice(1)}
// //               {reports.filter(r => r.status === status).length > 0 && (
// //                 <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
// //                   {reports.filter(r => r.status === status).length}
// //                 </span>
// //               )}
// //             </button>
// //           ))}
// //         </div>

// //         {/* Content */}
// //         <div className="flex-1 overflow-y-auto p-6">
// //           {loading ? (
// //             <div className="flex justify-center py-8">
// //               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
// //             </div>
// //           ) : filteredReports.length === 0 ? (
// //             <div className="text-center py-8">
// //               <p className="text-gray-500">No {filterStatus} reports</p>
// //             </div>
// //           ) : (
// //             <div className="space-y-4">
// //               {filteredReports.map(report => (
// //                 <div key={report._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
// //                   <div className="flex items-start justify-between gap-4">
// //                     <div className="flex-1">
// //                       <div className="flex items-center gap-2 mb-2">
// //                         <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
// //                           {report.reportType.replace('-', ' ')}
// //                         </span>
// //                         <span className="text-xs text-gray-500">
// //                           {new Date(report.createdAt).toLocaleDateString()}
// //                         </span>
// //                       </div>
// //                       <p className="text-sm text-gray-700 mb-2">{report.description}</p>
// //                       <p className="text-xs text-gray-600">
// //                         <span className="font-medium">Reporter:</span> {report.reporterName || report.reporterEmail || 'Anonymous'}
// //                       </p>
// //                       {report.sectionId && (
// //                         <p className="text-xs text-gray-600">
// //                           <span className="font-medium">Section:</span> {report.sectionId.title}
// //                         </p>
// //                       )}
// //                     </div>
// //                     <div className="flex gap-2">
// //                       <button
// //                         onClick={() => {
// //                           setSelectedReport(report)
// //                           setShowActionForm(true)
// //                         }}
// //                         className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
// //                       >
// //                         Take Action
// //                       </button>
// //                       {filterStatus === 'pending' && (
// //                         <button
// //                           onClick={() => handleDismissReport(report)}
// //                           disabled={actingOnId === report._id}
// //                           className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
// //                         >
// //                           {actingOnId === report._id ? (
// //                             <FiLoader className="w-4 h-4 animate-spin inline" />
// //                           ) : (
// //                             'Dismiss'
// //                           )}
// //                         </button>
// //                       )}
// //                     </div>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>

// //         {/* Action Form */}
// //         {showActionForm && selectedReport && (
// //           <div className="border-t border-gray-200 p-6 bg-gray-50">
// //             <h3 className="font-medium text-gray-900 mb-4">Take Action on Report</h3>
// //             <form onSubmit={handleTakeAction} className="space-y-4">
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
// //                 <select
// //                   value={actionType}
// //                   onChange={(e) => setActionType(e.target.value)}
// //                   className="input-field"
// //                 >
// //                   <option value="warning">Send Warning</option>
// //                   <option value="disabled">Disable Content</option>
// //                   <option value="deleted">Delete Content</option>
// //                   <option value="account-suspended">Suspend Account</option>
// //                   <option value="account-banned">Ban Account</option>
// //                 </select>
// //               </div>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
// //                 <textarea
// //                   value={actionReason}
// //                   onChange={(e) => setActionReason(e.target.value)}
// //                   placeholder="Explain the action taken..."
// //                   className="input-field"
// //                   rows="3"
// //                   required
// //                 />
// //               </div>
// //               <div className="flex gap-3">
// //                 <button
// //                   type="button"
// //                   onClick={() => {
// //                     setShowActionForm(false)
// //                     setSelectedReport(null)
// //                   }}
// //                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   type="submit"
// //                   disabled={actingOnId === selectedReport._id}
// //                   className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
// //                 >
// //                   {actingOnId === selectedReport._id ? (
// //                     <>
// //                       <FiLoader className="w-4 h-4 animate-spin" /> Processing...
// //                     </>
// //                   ) : (
// //                     <>
// //                       <FiCheck className="w-4 h-4" /> Take Action
// //                     </>
// //                   )}
// //                 </button>
// //               </div>
// //             </form>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   )
// // }
