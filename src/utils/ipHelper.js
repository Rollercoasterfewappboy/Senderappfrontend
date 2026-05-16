// Utility to fetch the user's real public IP address
// This is used for IP-based access control validation

const IP_SERVICES = [
  'https://api.ipify.org?format=json',
  'https://ipapi.co/json/',
  'https://api.ip.sb/jsonip'
];

let cachedIP = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the user's real public IP address
 * Uses multiple fallback services for reliability
 * @returns {Promise<string>} The public IP address
 */
export async function getPublicIP() {
  // Return cached IP if still valid
  if (cachedIP && Date.now() < cacheExpiry) {
    return cachedIP;
  }

  for (const serviceUrl of IP_SERVICES) {
    try {
      const response = await fetch(serviceUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; IP-Checker/1.0)'
        },
        // Add timeout
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extract IP from different service response formats
      let ip = null;
      if (data.ip) {
        ip = data.ip;
      } else if (data.query) {
        ip = data.query;
      }

      if (ip && isValidIP(ip)) {
        cachedIP = ip;
        cacheExpiry = Date.now() + CACHE_DURATION;
        console.log(`Fetched public IP: ${ip} from ${serviceUrl}`);
        return ip;
      }
    } catch (error) {
      console.warn(`Failed to fetch IP from ${serviceUrl}:`, error.message);
      continue;
    }
  }

  throw new Error('Unable to determine public IP address from any service');
}

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IPv4 address
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;

  const ipv4Regex = /^(25[0-5]|2[0-4]\d|[01]?\d\d?)(\.(25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/;
  return ipv4Regex.test(ip.trim());
}

/**
 * Clear the cached IP (useful for testing or forced refresh)
 */
export function clearIPCache() {
  cachedIP = null;
  cacheExpiry = 0;
}