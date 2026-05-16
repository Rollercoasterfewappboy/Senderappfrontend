import { useState } from 'react'
import { FiLogOut, FiMenu, FiX, FiUsers, FiFileText, FiSearch } from 'react-icons/fi'
import { Link } from 'react-router-dom'

export default function GlobalAdminLayout({ children, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', to: '/global-admin', icon: FiFileText },
    { name: 'Users', to: '/global-admin/users', icon: FiUsers },
    { name: 'Logs', to: '/global-admin/logs', icon: FiSearch },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
                aria-label="Open menu"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold">inboxguaranteed</h1>
                <p className="text-xs text-gray-500">Global Administration Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-gray-600">Admin</div>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-sm rounded-md text-red-600 hover:bg-red-50"
              >
                <FiLogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-6 space-y-4">
              <nav className="bg-white border rounded-lg p-3 shadow-sm space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.to}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    <item.icon className="w-4 h-4 text-gray-600" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile off-canvas menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-80 max-w-full bg-white shadow-xl">
            <div className="p-4 flex items-center justify-between border-b">
              <div className="text-lg font-semibold">Menu</div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"
                >
                  <item.icon className="w-4 h-4 text-gray-600" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}