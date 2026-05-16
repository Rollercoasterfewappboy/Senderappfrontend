import { FiLogOut } from 'react-icons/fi'

export default function GlobalAdminLayout({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">inboxguaranteed</h1>
              <p className="text-xs sm:text-sm text-gray-400">Global Administration Panel</p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}