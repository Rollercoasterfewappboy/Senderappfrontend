import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { isAdEligiblePage, AD_CONFIG } from '../../utils/adSenseHelper'

/**
 * AdUnit Component - Renders Google AdSense ads on eligible pages
 * 
 * FEATURES:
 * - Production-only rendering (disabled in development)
 * - Page eligibility filtering (blocks ads on private pages)
 * - Single initialization per page (prevents duplicate ads)
 * - Silent error handling (no console spam)
 * - Responsive design
 * - Non-blocking rendering
 * 
 * USAGE:
 * <AdUnit />
 * 
 * ELIGIBILITY:
 * Only displays on: Public pages, login pages, registration pages, about pages
 * Never displays on: Authenticated dashboards, admin pages, settings pages
 */
export default function AdUnit() {
  const location = useLocation()
  const adRef = useRef(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    // 1. ENVIRONMENT CONTROL: Only run in production
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    // 2. PAGE ELIGIBILITY FILTER: Check if current page allows ads
    if (!isAdEligiblePage(location.pathname)) {
      return
    }

    // 3. PREVENT DUPLICATE INITIALIZATION
    if (hasInitialized.current) {
      return
    }

    try {
      // 4. CHECK IF ADSENSE SCRIPT IS LOADED
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        // 5. PUSH AD CONFIGURATION
        window.adsbygoogle.push({})
        hasInitialized.current = true
      }
    } catch (error) {
      // 6. SILENT ERROR HANDLING - Suppress errors silently
      // No console logging to prevent spam
    }
  }, [location.pathname])

  // 7. RENDER NOTHING IN DEVELOPMENT
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  // 8. RENDER NOTHING IF PAGE NOT ELIGIBLE
  if (!isAdEligiblePage(location.pathname)) {
    return null
  }

  return (
    <div 
      ref={adRef}
      className="my-8 flex justify-center"
      style={{ minHeight: '100px' }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CONFIG.PUBLISHER_ID}
        data-ad-slot={AD_CONFIG.AD_SLOT}
        data-ad-format={AD_CONFIG.AD_FORMAT}
        data-full-width-responsive={AD_CONFIG.RESPONSIVE}
      ></ins>
    </div>
  )
}
