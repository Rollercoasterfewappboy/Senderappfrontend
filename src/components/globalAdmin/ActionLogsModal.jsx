import { useState, useEffect } from 'react'
import { FiX, FiLoader, FiDownload } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ActionLogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, filterType, page])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/global-admin/action-logs', {
        params: {
          actionType: filterType !== 'all' ? filterType : undefined,
          page,
          limit: 10
        }
      })
      setLogs(response.data.logs || [])
      setPagination(response.data.pagination || {})
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast.error('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await axios.get('/global-admin/action-logs/export', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `action-logs-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentElement.removeChild(link)
      toast.success('Logs exported successfully')
    } catch (error) {
      console.error('Error exporting logs:', error)
      toast.error('Failed to export logs')
    }
  }

  if (!isOpen) return null

  const actionTypes = [
    'all',
    'disable-website',
    'enable-website',
    'delete-website',
    'disable-section',
    'enable-section',
    'delete-section',
    'suspend-account',
    'ban-account',
    'resolve-report',
    'dismiss-report'
  ]

  const getActionColor = (actionType) => {
    if (actionType.includes('disable') || actionType.includes('suspend') || actionType.includes('ban')) {
      return 'bg-red-100 text-red-800'
    }
    if (actionType.includes('enable') || actionType.includes('resolve')) {
      return 'bg-green-100 text-green-800'
    }
    if (actionType.includes('delete')) {
      return 'bg-orange-100 text-orange-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Admin Action Logs</h2>
            <p className="text-sm text-gray-600 mt-1">Immutable record of all moderation actions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" /> Export
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value)
              setPage(1)
            }}
            className="input-field text-sm"
          >
            {actionTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Actions' : type.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No action logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map(log => (
                <div key={log._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.actionType)}`}>
                          {log.actionType.replace('-', ' ')}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800`}>
                          {log.targetType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">
                        <span className="font-medium">Target:</span> {log.targetDetails?.name || log.targetId}
                      </p>
                      {log.targetDetails?.email && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">User:</span> {log.targetDetails.email}
                        </p>
                      )}
                      {log.reason && (
                        <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded mt-2">
                          <span className="font-medium">Reason:</span> {log.reason}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {log.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-medium">Log ID</p>
                      <p className="text-xs text-gray-700 font-mono">{log.logId.slice(-8)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
