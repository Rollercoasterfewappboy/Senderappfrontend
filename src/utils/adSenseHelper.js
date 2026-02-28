/**
 * AdSense Helper Utility
 * 
 * Manages page eligibility for Google AdSense ads
 * Ensures ads only appear on public, eligible pages
 * 
 * REQUIREMENTS:
 * - Production-only rendering (process.env.NODE_ENV === 'production')
 * - NO ads on: Login, Register, Dashboard, Admin, Settings, Private pages
 * - YES ads on: Public pages, About, Landing pages, Auth modals
 */

/**
 * Determines if current page is eligible for AdSense ads
 * @param {string} pathname - Current route path from useLocation().pathname
 * @returns {boolean} - True if ads should display on this page
 */
export function isAdEligiblePage(pathname) {
  // Define routes that should NOT have ads (private/authenticated pages)
  const RESTRICTED_ROUTES = [
    '/dashboard',       // User dashboard
    '/profile',         // User profile
    '/notepad',         // Private notepad
    '/admin-access',    // Admin access page
    '/user-admin',      // Admin dashboard routes
    '/global-admin',    // Global admin routes
    '/settings',        // Settings pages
  ]

  // Define routes that SHOULD have ads (public pages)
  const PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/global-admin-login',
    '/confirm-email',
    '/reset-password',
    '/about',
  ]

  // Check if on a restricted route
  const isRestricted = RESTRICTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // If restricted, don't show ads
  if (isRestricted) {
    return false
  }

  // If explicitly public or root, allow ads
  return true
}

/**
 * Initialize AdSense on component mount
 * Safe wrapper for window.adsbygoogle.push()
 */
export function initializeAdSense() {
  try {
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      // Push ad configuration - may trigger ad rendering
      window.adsbygoogle.push({})
      return true
    }
  } catch (error) {
    // Silent failure - don't spam console
  }
  return false
}

/**
 * Check if AdSense script is loaded
 * @returns {boolean} - True if adsbygoogle is available
 */
export function isAdSenseLoaded() {
  return typeof window !== 'undefined' && !!window.adsbygoogle
}

/**
 * Ad configuration constants
 */
export const AD_CONFIG = {
  PUBLISHER_ID: 'ca-pub-7613296594285114',
  AD_SLOT: '9229384378',
  AD_FORMAT: 'auto',
  RESPONSIVE: 'true',
}
