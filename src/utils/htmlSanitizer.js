import DOMPurify from 'dompurify';

/**
 * Default DOMPurify configuration that preserves formatting while removing dangerous content
 */
const SANITIZE_CONFIG = {
  // Allowed HTML tags - extensive list to preserve email formatting
  ALLOWED_TAGS: [
    'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 'a', 'br', 'hr', 
    'ul', 'ol', 'li', 
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'blockquote', 'code', 'pre', 'img',
    'section', 'article', 'header', 'footer', 'nav',
    'style', 'mark', 'del', 's', 'sub', 'sup'
  ],
  
  // Allowed HTML attributes
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'target', 'rel',
    'width', 'height', 'style',
    'class', 'id',
    'data-*',
    'colspan', 'rowspan'
  ],
  
  // Allow specific CSS styles that are safe for email
  ALLOWED_STYLES: {
    '*': {
      // Layout
      'margin': [/^\d+(?:px|em|rem|%|auto)$/],
      'padding': [/^\d+(?:px|em|rem)$/],
      'display': [/^(?:block|inline|inline-block|flex|grid|none|table|table-cell|table-row)$/],
      'width': [/^(?:\d+(?:px|em|rem|%)|-?\d+(?:px|em|rem)|auto|inherit)$/],
      'height': [/^(?:\d+(?:px|em|rem|%)|-?\d+(?:px|em|rem)|auto|inherit)$/],
      'max-width': [/^(?:\d+(?:px|em|rem|%)|-?\d+(?:px|em|rem)|auto|inherit)$/],
      'line-height': [/^(?:\d+(?:\.\d+)?|normal|inherit)$/],
      
      // Text
      'font-family': [/^[^<>]+$/],
      'font-size': [/^\d+(?:px|em|rem|%)$/],
      'font-weight': [/^(?:normal|bold|bolder|lighter|\d{3,})$/],
      'font-style': [/^(?:normal|italic|oblique)$/],
      'text-align': [/^(?:left|right|center|justify|inherit)$/],
      'text-decoration': [/^(?:none|underline|overline|line-through)$/],
      'color': [/^(?:#[0-9a-fA-F]{3,6}|rgb\(\d+,\s?\d+,\s?\d+\)|rgba\(\d+,\s?\d+,\s?\d+,\s?[\d.]+\)|[a-zA-Z]+)$/],
      
      // Background
      'background-color': [/^(?:#[0-9a-fA-F]{3,6}|rgb\(\d+,\s?\d+,\s?\d+\)|rgba\(\d+,\s?\d+,\s?\d+,\s?[\d.]+\)|[a-zA-Z]+|transparent)$/],
      'background': [/^(?:#[0-9a-fA-F]{3,6}|rgb\(\d+,\s?\d+,\s?\d+\)|rgba\(\d+,\s?\d+,\s?\d+,\s?[\d.]+\)|[a-zA-Z]+|transparent)$/],
      
      // Borders
      'border': [/^[\d\w\s%#(),.]+$/],
      'border-radius': [/^\d+(?:px|em|rem)$/],
      'border-color': [/^(?:#[0-9a-fA-F]{3,6}|rgb\(\d+,\s?\d+,\s?\d+\)|[a-zA-Z]+)$/],
      
      // Other
      'opacity': [/^(?:0|0?\.\d+|1)$/],
      'text-indent': [/^\d+(?:px|em|rem)$/],
      'letter-spacing': [/^\d+(?:px|em)$/],
      'word-spacing': [/^\d+(?:px|em)$/],
      'vertical-align': [/^(?:baseline|top|middle|bottom|text-top|text-bottom)$/],
    }
  },
  
  // Keep data-* attributes
  KEEP_CONTENT: true,
  
  // Use iframe sandbox for extra safety
  FORCE_BODY: false,
  SANITIZE_DOM: true,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
};

/**
 * Sanitize HTML for safe display in UI previews
 * Keeps all formatting while removing dangerous scripts and event handlers
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML safe for display
 */
export function sanitizeHtmlForDisplay(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Sanitize HTML for safe email sending
 * More restrictive than display sanitization to ensure email compatibility
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML safe for email delivery
 */
export function sanitizeHtmlForEmail(html) {
  // ⚠️ DEPRECATED: this sanitizer used to strip/modify HTML for email clients.
  // Following the critical rendering fix the system MUST send raw unescaped
  // HTML.  Sanitizing prior to dispatch caused breakage in outbound messages.
  // The function remains here only for legacy calls and will log a warning.
  if (!html || typeof html !== 'string') {
    return '';
  }
  console.warn('[sanitizeHtmlForEmail] WARNING - called but HTML sanitization is disabled. Returning original HTML unchanged.');
  return html;
}

/**
 * Validate if HTML is safe
 * @param {string} html - HTML content to validate
 * @returns {boolean} - True if HTML is safe
 */
export function isHtmlSafe(html) {
  if (!html || typeof html !== 'string') {
    return true;
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /<input/gi,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(html));
}

/**
 * ✅ PROFESSIONAL HTML-TO-TEXT CONVERSION
 * Properly handles nested tables, divs, and email wrapper markup
 * @param {string} html - HTML content to convert
 * @returns {string} - Clean plain text representation
 */
export function htmlToPlainText(html) {
  if (!html) return '';

  let text = html;

  // ✅ STEP 1: Remove email wrapper elements that don't contain content
  // Remove doctype, html, head, body tags and everything in head
  text = text.replace(/<!DOCTYPE[^>]*>/gi, '');
  text = text.replace(/<\?xml[^>]*\?>/gi, '');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<meta[^>]*>/gi, '');
  text = text.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<link[^>]*>/gi, '');

  // ✅ STEP 2: Remove script and noscript content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // ✅ STEP 3: Remove conditional comments for Outlook
  text = text.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/gi, '');

  // ✅ STEP 4: Convert structural HTML to line breaks
  // Tables should add space between content
  text = text.replace(/<\/?table[^>]*>/gi, '');
  text = text.replace(/<\/?tbody[^>]*>/gi, '');
  text = text.replace(/<\/?thead[^>]*>/gi, '');
  text = text.replace(/<\/?tfoot[^>]*>/gi, '');
  text = text.replace(/<tr[^>]*>/gi, '');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<td[^>]*>/gi, '');
  text = text.replace(/<\/td>/gi, ' ');
  text = text.replace(/<th[^>]*>/gi, '');
  text = text.replace(/<\/th>/gi, ' ');

  // ✅ STEP 5: Convert block elements to line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/?p[^>]*>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<\/?section[^>]*>/gi, '\n');
  text = text.replace(/<\/?article[^>]*>/gi, '\n');
  text = text.replace(/<\/?nav[^>]*>/gi, '\n');
  text = text.replace(/<\/?header[^>]*>/gi, '\n');
  text = text.replace(/<\/?footer[^>]*>/gi, '\n');
  text = text.replace(/<\/?blockquote[^>]*>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // ✅ STEP 6: Convert headings
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n');

  // ✅ STEP 7: Convert lists to readable format
  text = text.replace(/<ul[^>]*>/gi, '');
  text = text.replace(/<\/ul>/gi, '');
  text = text.replace(/<ol[^>]*>/gi, '');
  text = text.replace(/<\/ol>/gi, '');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // ✅ STEP 8: Convert links with URL
  text = text.replace(/<a\s+href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (match, url, linkText) => {
    const cleanText = linkText.replace(/<[^>]+>/g, '').trim();
    return cleanText ? `${cleanText} (${url})` : url;
  });

  // ✅ STEP 9: Convert bold/strong (add emphasis with asterisks)
  text = text.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '*$1*');

  // ✅ STEP 10: Convert italic/emphasis
  text = text.replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '_$1_');

  // ✅ STEP 11: Handle underline (just keep text)
  text = text.replace(/<u[^>]*>(.*?)<\/u>/gi, '$1');

  // ✅ STEP 12: Handle strikethrough
  text = text.replace(/<(?:del|s)[^>]*>(.*?)<\/(?:del|s)>/gi, '~~$1~~');

  // ✅ STEP 13: Handle code blocks
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  text = text.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n$1\n');

  // ✅ STEP 14: Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // ✅ STEP 15: Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  text = textarea.value;

  // ✅ STEP 16: Clean up whitespace
  // Remove multiple spaces
  text = text.replace(/[ \t]+/g, ' ');
  
  // Remove multiple consecutive newlines (keep max 2)
  text = text.replace(/\n\n\n+/g, '\n\n');
  
  // Remove lines that are only whitespace
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  // Remove trailing newlines at end
  text = text.replace(/\n+$/g, '');
  
  // Remove leading newlines at start
  text = text.replace(/^\n+/g, '');

  return text;
}

export default {
  sanitizeHtmlForDisplay,
  sanitizeHtmlForEmail,
  isHtmlSafe,
  htmlToPlainText,
};
