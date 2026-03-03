import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import PlaceholderInsertModal from '../../components/common/PlaceholderInsertModal';
import { htmlToPlainText as sanitizeHtmlToPlainText } from '../../utils/htmlSanitizer';
import { FiImage, FiTrash2, FiLink } from 'react-icons/fi';

// ============================================================
// DEFENSIVE HELPER: Safely convert FileList or array-like objects
// ============================================================
function safeConvertToArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  
  try {
    if (typeof obj === 'object' && 'length' in obj) {
      return Array.from(obj);
    }
  } catch (e) {
    console.warn('[EmailCompose] Failed to convert to array:', e.message);
  }
  
  return [];
}

// Helper to extract body content from HTML if it's a full document
const extractBodyContent = (html) => {
  if (!html) return '';
  
  // Check if this is a full HTML document
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    // Extract content between <body> tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }
  }
  
  return html;
};

// Helper: Detect placeholders in text
const detectPlaceholders = (text) => {
  if (!text) return [];
  const regex = /\[([A-Za-z0-9_]+)(?:\|([^\]]*))\]/g;
  const placeholders = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const placeholder = `[${match[1]}]`;
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  return placeholders;
};

// Suppress findDOMNode warning for react-quill by patching console.error
const originalError = console.error;
const patchedError = (...args) => {
  if (args[0]?.includes?.('findDOMNode') || (typeof args[0] === 'string' && args[0].includes('findDOMNode'))) {
    return;
  }
  originalError(...args);
};
console.error = patchedError;

// =====================
// Utility: Convert HTML to Plain Text
// =====================
const htmlToPlainText = (html) => {
  if (!html) return '';
  
  // First, try the sanitizer utility
  let plainText = sanitizeHtmlToPlainText(html);
  
  // CRITICAL: Strip remaining HTML tags and decode entities
  plainText = plainText
    .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  
  return plainText;
};

export default function EmailCompose({ onSend, onOpenSettings, fromEmailDefault }) {
  const [form, setForm] = useState({
    to: '',
    bcc: '',
    replyTo: '',
    subject: '',
    fromName: '',
    fromEmail: '',
    body: '', // HTML version
    bodyPlainText: '', // Plain text version
    ctaText: '', // Call-to-Action text (optional)
    ctaLink: '', // Call-to-Action link (optional)
    attachments: [], // Initialize as empty array, not null
    // attachments are File objects; you can rename them (including placeholders) below
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  // ✨ Attachment filenames can include placeholders like {RECIPIENT_EMAIL}, {RECIPIENT_NAME}, {CURRENT_DATE}
  // Examples: invoice_{RECIPIENT_EMAIL}.pdf | report_{CURRENT_DATE}_{RECIPIENT_NAME}.docx | statement_{RECIPIENT_DOMAIN}.pdf
  // Placeholders are rendered per recipient when the email is sent.
  
  const [showPlaceholderModal, setShowPlaceholderModal] = useState(false);
  const [placeholderInsertMode, setPlaceholderInsertMode] = useState('subject'); // 'subject', 'body', 'plainText', 'ctaText', or 'ctaLink'
  const [showPlaceholderConfirm, setShowPlaceholderConfirm] = useState(false);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState([]);
  const fileInputRef = useRef();
  
  // Image in email body
  const [bodyImage, setBodyImage] = useState(null);

  // allow attachment renaming (we keep previews and form attachments in sync)
  const handleRenameAttachment = (idx, newName) => {
    setAttachmentPreviews(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], name: newName };
      return copy;
    });
    setForm(prev => {
      const copy = [...prev.attachments];
      if (copy[idx]) {
        const file = copy[idx];
        const renamedFile = new File([file], newName, { type: file.type });
        copy[idx] = renamedFile;
      }
      return { ...prev, attachments: copy };
    });
  };

  // Remove an attachment by index (update previews and form.attachments)
  const handleRemoveAttachment = (idx) => {
    setAttachmentPreviews((prev) => {
      const copy = [...prev];
      const removed = copy.splice(idx, 1)[0];
      // Revoke any object URL to avoid memory leak
      if (removed && removed.url) {
        try { URL.revokeObjectURL(removed.url); } catch (e) {}
      }
      return copy;
    });

    setForm((prev) => {
      const copy = Array.isArray(prev.attachments) ? [...prev.attachments] : [];
      copy.splice(idx, 1);
      // Reset the file input so it doesn't hold the old FileList
      try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch (e) {}
      return { ...prev, attachments: copy };
    });
  };

  const [bodyImagePreview, setBodyImagePreview] = useState(null);
  const [bodyImageLink, setBodyImageLink] = useState('');
  const bodyImageInputRef = useRef();
  const quillRef = useRef(null);

  // Helper to auto-generate plain text from HTML if empty
  const getAutoPlainText = (htmlContent, manualPlainText) => {
    // ✅ CRITICAL FIX: ALWAYS clean plain text through htmlToPlainText
    // This removes extra whitespace, blank lines, and HTML markup
    // whether the text is user-provided or auto-generated
    
    let plainTextToClean = manualPlainText && manualPlainText.trim() 
      ? manualPlainText 
      : htmlToPlainText(htmlContent);
    
    // Apply aggressive whitespace cleanup
    plainTextToClean = plainTextToClean
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)  // Remove blank lines
      .join('\n\n');  // Join with max 2 newlines
    
    // Final cleanup: max 2 consecutive newlines
    plainTextToClean = plainTextToClean.replace(/\n\n\n+/g, '\n\n');
    
    return plainTextToClean.trim();
  };
  // track whether user wants to include an HTML body
  const [useHtml, setUseHtml] = useState(true);
  
  // ✅ NEW: Toggle between rich text editor (Quill) and raw HTML paste mode
  const [useRawHtml, setUseRawHtml] = useState(false);
  
  // Alignment and spacing controls for HTML body
  const [htmlAlignment, setHtmlAlignment] = useState('center'); // 'left', 'center', 'right'
  const [htmlMarginTop, setHtmlMarginTop] = useState(24);
  const [htmlMarginBottom, setHtmlMarginBottom] = useState(16);

  // Set default From Email from settings
  useEffect(() => {
    if (fromEmailDefault && !form.fromEmail) {
      setForm((prev) => ({ ...prev, fromEmail: fromEmailDefault }));
    }
  }, [fromEmailDefault]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachments') {
      // Use safe conversion helper
      const attachmentsArray = safeConvertToArray(files);
      setForm((prev) => ({ ...prev, attachments: attachmentsArray }));
      // Preview attachments
      const previews = [];
      if (attachmentsArray.length > 0) {
        attachmentsArray.forEach((file) => {
          if (file.type.startsWith('image/')) {
            previews.push({ type: 'image', url: URL.createObjectURL(file), name: file.name });
          } else if (file.type === 'application/pdf') {
            previews.push({ type: 'pdf', url: URL.createObjectURL(file), name: file.name });
          } else {
            previews.push({ type: 'file', name: file.name });
          }
        });
      }
      setAttachmentPreviews(previews);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleInsertPlaceholder = (placeholder) => {
    if (placeholderInsertMode === 'subject') {
      setForm((prev) => ({
        ...prev,
        subject: prev.subject + placeholder,
      }));
    } else if (placeholderInsertMode === 'body') {
      // Insert placeholder into ReactQuill editor
      setForm((prev) => ({
        ...prev,
        body: prev.body + placeholder,
      }));
    } else if (placeholderInsertMode === 'plainText') {
      setForm((prev) => ({
        ...prev,
        bodyPlainText: prev.bodyPlainText + placeholder,
      }));
    } else if (placeholderInsertMode === 'ctaText') {
      setForm((prev) => ({
        ...prev,
        ctaText: prev.ctaText + placeholder,
      }));
    } else if (placeholderInsertMode === 'ctaLink') {
      setForm((prev) => ({
        ...prev,
        ctaLink: prev.ctaLink + placeholder,
      }));
    }
    setShowPlaceholderModal(false);
  };

  const openPlaceholderModal = (mode) => {
    setPlaceholderInsertMode(mode);
    setShowPlaceholderModal(true);
  };

  const handleBodyImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setBodyImage(file);
      setBodyImagePreview(event.target.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBodyImage = () => {
    setBodyImage(null);
    setBodyImagePreview(null);
    setBodyImageLink('');
    if (bodyImageInputRef.current) {
      bodyImageInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: at least one recipient
    if (!form.to && !form.bcc) {
      setError('Please provide at least one recipient (To or BCC).');
      return;
    }

    // Validate content: require at least one of: HTML body, plain text, image, or CTA link
    const hasHtmlBody = form.body && form.body.trim().length > 0 && form.body.trim() !== '<p><br></p>';
    const hasPlainTextBody = form.bodyPlainText && form.bodyPlainText.trim().length > 0;
    const hasImage = bodyImage && bodyImagePreview;
    const hasCtaLink = form.ctaLink && form.ctaLink.trim().length > 0;
    
    const hasValidContent = hasHtmlBody || hasPlainTextBody || hasImage || hasCtaLink;

    if (!hasValidContent) {
      setError('Please provide at least one of: email body, plain text, image, or CTA link.');
      return;
    }

    // =====================
    // DETECT PLACEHOLDERS
    // =====================
    const bodyContentForDetection = extractBodyContent(form.body);
    const placeholders = [
      ...detectPlaceholders(form.subject),
      ...(bodyContentForDetection ? detectPlaceholders(bodyContentForDetection) : []),
      ...(form.bodyPlainText ? detectPlaceholders(form.bodyPlainText) : []),
      ...(form.ctaText ? detectPlaceholders(form.ctaText) : []),
      ...(form.ctaLink ? detectPlaceholders(form.ctaLink) : []),
      ...(bodyImageLink ? detectPlaceholders(bodyImageLink) : []),
    ];
    const uniquePlaceholders = [...new Set(placeholders)];

    // If placeholders detected, show confirmation dialog
    if (uniquePlaceholders.length > 0) {
      setDetectedPlaceholders(uniquePlaceholders);
      setShowPlaceholderConfirm(true);
      return; // Wait for user confirmation
    }

    // No placeholders, proceed with send
    await performSend();
  };

  const performSend = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    setShowPlaceholderConfirm(false);
    
    try {
      // Extract body content if user pasted a full HTML document
      const bodyContent = extractBodyContent(form.body);
      
      // Auto-generate plain text if not provided
      const plainTextVersion = getAutoPlainText(bodyContent, form.bodyPlainText);

      // ⚠️ DO NOT sanitize HTML before sending.  Raw HTML must be preserved
      // exactly as provided to avoid the rendering bugs described in the
      // critical fix documentation.  We'll use `bodyContent` directly.
      const sanitizedHtml = bodyContent; // kept variable name for backwards compatibility

      // CONDITIONAL: If user enabled raw HTML mode, send as-is without template wrapping.
      // Otherwise, wrap in professional email template.
      let fullHtmlDocument;
      
      if (useRawHtml) {
        // Raw HTML mode: Send the user's HTML completely unchanged.
        // The user has pasted a complete document (with <!DOCTYPE>, <html>, <body>, etc.)
        // and we respect it as-is.
        fullHtmlDocument = sanitizedHtml;
        console.log('[EmailCompose] RAW HTML MODE: Sending HTML without template wrapping');
      } else {
        // Rich text mode: Wrap in professional table-based template
        // (same template as before for backward compatibility)
// ✅ PROFESSIONAL EMAIL TEMPLATE: Industry-standard structure
// Uses table-based layout with INLINE CSS ONLY (no <style> blocks)
// Compatible with Gmail, Outlook, Yahoo, iOS Mail, Android Mail
fullHtmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="date=no">
  <meta name="format-detection" content="address=no">
  <meta name="format-detection" content="email=no">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;min-width:100%!important;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Main wrapper table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background-color:#ffffff;margin:0;padding:0;border-collapse:collapse;">
    <tbody>
      <tr>
        <td align="center" style="padding:0;margin:0;background-color:#ffffff;">
          <!-- Content wrapper table (600px for optimal width) -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;margin:0;padding:0;background-color:#ffffff;border-collapse:collapse;">
            <tbody>
              <!-- Header spacer -->
              <tr>
                <td style="padding:0;margin:0;height:0;width:100%;border-collapse:collapse;"></td>
              </tr>
              
              <!-- Main content cell -->
              <tr>
                <td style="padding:24px 16px;margin:0;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;-webkit-hyphens:auto;-moz-hyphens:auto;hyphens:auto;border-collapse:collapse;text-align:${htmlAlignment};">
                  <!-- Content with inline styles for email clients -->
                  <div style="max-width:600px;width:100%;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;word-wrap:break-word;margin-top:${htmlMarginTop}px;margin-bottom:${htmlMarginBottom}px;">
                    ${sanitizedHtml}
                  </div>
                </td>
              </tr>
              
              <!-- Footer spacer -->
              <tr>
                <td style="padding:0;margin:0;height:0;width:100%;border-collapse:collapse;"></td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
      }


console.log('[EmailCompose] About to build email payload:', {
        useHtml: useHtml,
        useRawHtml: useRawHtml,
        mode: useRawHtml ? 'RAW_HTML_UNMODIFIED' : 'RICH_TEXT_WITH_TEMPLATE',
        quillContent: form.body?.substring(0, 200) || 'EMPTY',
        plainTextProvided: !!form.bodyPlainText,
      });

      // Ensure attachments is always an array
      const attachmentsArray = safeConvertToArray(form.attachments);
      
      console.log('[EmailCompose] performSend() - Attachment Details:', {
        attachmentsType: typeof form.attachments,
        attachmentsIsArray: Array.isArray(form.attachments),
        attachmentsLength: attachmentsArray.length,
        attachmentDetails: attachmentsArray.map(a => ({ name: a.name, size: a.size, type: a.type })),
      });
      
      const emailPayload = {
        to: form.to.split(',').map((s) => s.trim()).filter(Boolean),
        bcc: form.bcc.split(/,|\n/).map((s) => s.trim()).filter(Boolean),
        subject: form.subject,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        body: useHtml ? fullHtmlDocument : null,
        bodyPlainText: plainTextVersion,
        ctaText: form.ctaText.trim() || null,
        ctaLink: form.ctaLink.trim() || null,
        attachments: attachmentsArray, // Always pass as array
        bodyImage: bodyImage && bodyImagePreview ? {
          base64: bodyImagePreview,
          filename: bodyImage.name,
          link: bodyImageLink.trim() || null,
        } : null,
        htmlAlignment: htmlAlignment,
        htmlMarginTop: htmlMarginTop,
        htmlMarginBottom: htmlMarginBottom,
        useRawHtmlMode: useRawHtml, // Pass flag to backend to prevent re-wrapping
      };
      
      console.log('[EmailCompose] performSend() - Email Payload Details:', {
        mode: useRawHtml ? 'RAW_HTML' : 'TEMPLATE_WRAPPED',
        htmlStructure: emailPayload.body?.substring(0, 150) || 'EMPTY',
        hasDoctype: emailPayload.body?.includes('<!DOCTYPE') ? 'YES' : 'NO',
        hasBodyTag: emailPayload.body?.includes('<body') ? 'YES' : 'NO',
        bodyLength: emailPayload.body?.length || 0,
        bodyPlainText: emailPayload.bodyPlainText?.substring(0, 100) || 'EMPTY/AUTO-GENERATED',
        bodyPlainTextLength: emailPayload.bodyPlainText?.length || 0,
        ctaText: emailPayload.ctaText,
        ctaLink: emailPayload.ctaLink,
        alignment: emailPayload.htmlAlignment,
        marginTop: emailPayload.htmlMarginTop,
        marginBottom: emailPayload.htmlMarginBottom,
      });
      
      const result = await onSend(emailPayload);
      // `handleSend` now returns the raw response data from server, even on partial failure.
      if (result && result.success) {
        setSuccess('Email sent successfully!');
      } else if (result && result.error) {
        // partial or complete failure
        setError(result.error);
        console.error('[EmailCompose] Server indicated failure details:', result);
      } else {
        // Unknown response shape
        setError('Failed to send email');
        console.error('[EmailCompose] Unexpected response from onSend():', result);
      }
    } catch (err) {
      console.error('[EmailCompose] performSend() caught error:', err);
      setError(err.message || 'Failed to send email.');
    }
    setSending(false);
  };

  // Apply alignment and spacing to the Quill editor content (.ql-editor)
  useEffect(() => {
    try {
      const quill = quillRef.current?.getEditor && quillRef.current.getEditor();
      if (!quill) return;
      const range = quill.getSelection();
      // If there's no selection, apply as editor-wide default (affects typing and wrapper)
      if (!range || range.length === 0) {
        const editorRoot = quill.root;
        if (editorRoot) {
          editorRoot.style.textAlign = htmlAlignment;
          editorRoot.style.marginTop = `${htmlMarginTop}px`;
          editorRoot.style.marginBottom = `${htmlMarginBottom}px`;
        }
      }
      // If there is a selection we do not override here — selection-based handlers apply styles.
    } catch (err) {
      // non-fatal
    }
  }, [htmlAlignment, htmlMarginTop, htmlMarginBottom, useHtml]);

  // Apply alignment to selected text or whole editor when nothing selected
  const applyAlignment = (align) => {
    setHtmlAlignment(align);
    try {
      const quill = quillRef.current?.getEditor && quillRef.current.getEditor();
      if (!quill) return;
      
      const range = quill.getSelection();
      if (range && range.length > 0) {
        // Get all lines in selection
        const lines = quill.getLines(range.index, range.length);
        
        // Apply alignment format to EACH line individually
        lines.forEach((line) => {
          const lineIndex = quill.getIndex(line);
          const lineLength = line.length();
          
          // Remove any existing alignment first
          quill.removeFormat(lineIndex, lineLength, 'align');
          
          // Now apply the new alignment
          quill.formatText(lineIndex, lineLength, 'align', align);
          
          // Also apply to the line element's DOM directly for immediate visual feedback
          if (line.domNode) {
            line.domNode.style.textAlign = align;
            // Update div wrapper if it exists
            const parentDiv = line.domNode.parentElement;
            if (parentDiv && parentDiv.style) {
              parentDiv.style.textAlign = align;
            }
          }
        });
        
        // Force Quill to update and sync HTML
        setTimeout(() => {
          setForm((prev) => ({ ...prev, body: quill.root.innerHTML }));
        }, 0);
      } else {
        const editorRoot = quill.root;
        if (editorRoot) {
          editorRoot.style.textAlign = align;
        }
      }
    } catch (err) {
      console.error('Error applying alignment:', err);
    }
  };

  // Apply top/bottom margins to selected lines or whole editor when nothing selected
  const applyMargins = (top, bottom) => {
    setHtmlMarginTop(top);
    setHtmlMarginBottom(bottom);
    try {
      const quill = quillRef.current?.getEditor && quillRef.current.getEditor();
      if (!quill) return;
      const range = quill.getSelection();
      if (range && range.length > 0) {
        const lines = quill.getLines(range.index, range.length);
        lines.forEach((line) => {
          if (line && line.domNode) {
            line.domNode.style.marginTop = `${top}px`;
            line.domNode.style.marginBottom = `${bottom}px`;
          }
        });
        // Sync edited HTML back to form state so sent HTML contains the margin styles
        setForm((prev) => ({ ...prev, body: quill.root.innerHTML }));
      } else {
        const editorRoot = quill.root;
        if (editorRoot) {
          editorRoot.style.marginTop = `${top}px`;
          editorRoot.style.marginBottom = `${bottom}px`;
        }
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Compose Email</h2>
        <button className="text-blue-600 underline" onClick={onOpenSettings}>Settings</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            name="to"
            value={form.to}
            onChange={handleChange}
            className="border p-2 flex-1"
            placeholder="To (comma separated)"
          />
          <textarea
            name="bcc"
            value={form.bcc}
            onChange={handleChange}
            className="border p-2 flex-1 min-h-[48px]"
            placeholder="BCC (comma or newline separated)"
          />
        </div>
        <input
          type="text"
          name="fromName"
          value={form.fromName}
          onChange={handleChange}
          className="border p-2 w-full"
          placeholder="From Name (displayed to recipient)"
        />
        <input
          type="email"
          name="fromEmail"
          value={form.fromEmail}
          onChange={handleChange}
          className="border p-2 w-full"
          placeholder="From Email (default from settings)"
          required
        />
        <input
          type="text"
          name="replyTo"
          value={form.replyTo}
          onChange={handleChange}
          className="border p-2 w-full"
          placeholder="Reply-To (optional)"
        />
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className="border p-2 w-full"
              placeholder="Subject"
            />
          </div>
          <button
            type="button"
            onClick={() => openPlaceholderModal('subject')}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
            title="Insert placeholder in subject"
          >
            + Placeholder
          </button>
        </div>

        {/* Info: Multipart/Alternative Email Format */}
        <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-900">
          <strong>✉️ Multipart Email:</strong> Emails are sent with both HTML and plain text versions. Recipients' email clients will automatically display the best version.
        </div>

        {/* HTML Editor Section */}
        <div>
          <div className="mb-3 flex gap-2 items-center">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">📧 Email as HTML</label>
              <div className="text-sm text-black bg-gray-50 p-2 rounded border border-gray-200">
                <strong>💡 Tip:</strong> Use the formatting buttons to style your email, OR paste complete HTML documents directly.
              </div>
            </div>
            <button
              type="button"
              onClick={() => openPlaceholderModal('body')}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap h-fit"
              title="Insert placeholder in HTML body"
            >
              + Placeholder
            </button>
          </div>
          <div className="mb-3 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <input id="useHtml" type="checkbox" checked={useHtml} onChange={(e) => setUseHtml(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="useHtml" className="text-sm font-semibold">Use HTML body (optional)</label>
            </div>
            {!useHtml && <div className="text-sm text-gray-500">HTML disabled — sending plain text only.</div>}
          </div>
          
          {/* ✅ NEW: Raw HTML Mode Toggle */}
          {useHtml && (
            <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200 flex items-center gap-2">
              <input
                id="useRawHtml"
                type="checkbox"
                checked={useRawHtml}
                onChange={(e) => setUseRawHtml(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="useRawHtml" className="text-sm font-semibold text-blue-900">
                📋 Paste Raw HTML (paste complete documents without Rich Text formatting)
              </label>
            </div>
          )}
          
          {/* Alignment & Spacing Controls - HIDDEN in raw HTML mode */}
          {useHtml && !useRawHtml && (
            <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200 flex gap-4 items-end flex-wrap">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">📍 Alignment:</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => applyAlignment('left')}
                    className={`px-3 py-1 text-sm border rounded font-medium transition ${
                      htmlAlignment === 'left' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-blue-50'
                    }`}
                    title="Align Left"
                  >
                    ⬅️ Left
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAlignment('center')}
                    className={`px-3 py-1 text-sm border rounded font-medium transition ${
                      htmlAlignment === 'center' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-blue-50'
                    }`}
                    title="Align Center"
                  >
                    ⬆️⬇️ Center
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAlignment('right')}
                    className={`px-3 py-1 text-sm border rounded font-medium transition ${
                      htmlAlignment === 'right' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-blue-50'
                    }`}
                    title="Align Right"
                  >
                    ➡️ Right
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">📏 Top Margin:</label>
                <select 
                  value={htmlMarginTop} 
                  onChange={(e) => applyMargins(Number(e.target.value), htmlMarginBottom)}
                  className="px-2 py-1 text-sm border rounded"
                >
                  <option value="0">None (0px)</option>
                  <option value="8">Extra Small (8px)</option>
                  <option value="16">Small (16px)</option>
                  <option value="24">Medium (24px)</option>
                  <option value="32">Large (32px)</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">📏 Bottom Margin:</label>
                <select 
                  value={htmlMarginBottom}
                  onChange={(e) => applyMargins(htmlMarginTop, Number(e.target.value))}
                  className="px-2 py-1 text-sm border rounded"
                >
                  <option value="0">None (0px)</option>
                  <option value="8">Extra Small (8px)</option>
                  <option value="16">Small (16px)</option>
                  <option value="24">Medium (24px)</option>
                  <option value="32">Large (32px)</option>
                </select>
              </div>
            </div>
          )}
          
          {/* ✅ Raw HTML Textarea (if user selected raw mode) */}
          {useHtml && useRawHtml && (
            <textarea
              name="bodyRawHtml"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              className="border p-2 w-full min-h-[200px] font-mono text-sm mb-3"
              placeholder="Paste complete HTML documents here (including <!DOCTYPE>, <html>, <body> tags). Raw HTML will be sent without modification."
            />
          )}
          
          {/* Rich Text Editor (if user did NOT select raw mode) */}
          {useHtml && !useRawHtml && (
            <ReactQuill
              ref={quillRef}
              value={form.body}
              onChange={(value) => setForm((prev) => ({ ...prev, body: value }))}
              theme="snow"
              className="bg-white"
              style={{ minHeight: 120 }}
              readOnly={!useHtml}
              modules={useHtml ? undefined : { toolbar: false }}
            />
          )}
        </div>

        {/* Call-to-Action (CTA) Section */}
        <div className="border-t pt-4">
          {/* CTA Text Field */}
          <div className="mb-4 pb-4 border-b">
            <div className="mb-3 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">📝 CTA Text (Optional)</label>
                <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded border border-purple-200 mb-2">
                  <strong>💡 Usage:</strong> The text displayed on the CTA button/link (e.g., "Click Here", "Learn More", "Claim Offer"). Supports placeholders like {`{RECIPIENT_NAME}`}.
                </div>
              </div>
              <button
                type="button"
                onClick={() => openPlaceholderModal('ctaText')}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap h-fit"
                title="Insert placeholder in CTA text"
              >
                + Placeholder
              </button>
            </div>
            <input
              type="text"
              name="ctaText"
              value={form.ctaText}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              placeholder="e.g., Click Here | Learn More | Claim Your Offer | {RECIPIENT_NAME}, Join Now"
            />
            <p className="text-xs text-gray-500 mt-2">
              Examples: Click Here | Learn More | Claim Offer | Join {`{RECIPIENT_NAME}`}
            </p>
          </div>

          {/* CTA Link Field */}
          <div className="mb-3 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">🔗 CTA Link (Optional)</label>
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mb-2">
                <strong>💡 Usage:</strong> The URL that the CTA text links to. Supports placeholders like {`{RECIPIENT_EMAIL}`}.
              </div>
            </div>
            <button
              type="button"
              onClick={() => openPlaceholderModal('ctaLink')}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap h-fit"
              title="Insert placeholder in CTA link"
            >
              + Placeholder
            </button>
          </div>
          <input
            type="text"
            name="ctaLink"
            value={form.ctaLink}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            placeholder="https://example.com/page or https://example.com/user/[RECIPIENT_EMAIL]"
          />
          <p className="text-xs text-gray-500 mt-2">
            Examples: https://example.com/offer | https://example.com/user/{`{RECIPIENT_EMAIL}`} | https://example.com/code/{`{RANDOM_CODE}`}
          </p>
        </div>

        {/* Preview removed — previews disabled in this UI. */}
        <div className="mb-4 text-sm text-gray-500">Preview panes removed. Emails will be sent with the selected HTML/plain text content.</div>
        <input
          type="file"
          name="attachments"
          multiple
          onChange={handleChange}
          className="border p-2 w-full"
          ref={fileInputRef}
        />
        <p className="text-xs text-gray-500 mt-2 mb-3">
          💡 <strong>Attachment Placeholders:</strong> Examples: <code className="bg-gray-100 px-1">invoice_{`{RECIPIENT_EMAIL}`}.pdf</code> | <code className="bg-gray-100 px-1">report_{`{CURRENT_DATE}`}_{`{RECIPIENT_NAME}`}.docx</code> | <code className="bg-gray-100 px-1">statement_{`{RECIPIENT_DOMAIN}`}.pdf</code>
        </p>
        {attachmentPreviews.length > 0 && (
          <div className="mt-2">
            <div className="font-semibold text-xs text-gray-500 mb-1">Attachment Preview:</div>
            <div className="flex gap-4 flex-wrap">
              {attachmentPreviews.map((file, idx) => (
                <div key={idx} className="border rounded p-2 bg-gray-50 flex flex-col items-center">
                  {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="max-h-24 max-w-xs mb-1" />
                  ) : file.type === 'pdf' ? (
                    <object data={file.url} type="application/pdf" width="120" height="160">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>
                    </object>
                  ) : (
                    <span>{file.name}</span>
                  )}
                  {/* rename input */}
                  <input
                    type="text"
                    value={file.name}
                    onChange={(e) => handleRenameAttachment(idx, e.target.value)}
                    className="mt-1 text-xs border-b border-gray-300 focus:outline-none focus:border-gray-500"
                  />

                  {/* remove attachment button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs flex items-center gap-1"
                    title="Remove attachment"
                  >
                    <FiTrash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image in Email Body */}
        <div className="border-t pt-4 mt-4">
          <label className="block font-semibold text-gray-700 mb-2">
            <FiImage className="inline mr-2" /> Image in Email Body (Optional)
          </label>
          <p className="text-sm text-gray-600 mb-3">Add an image directly in your email message. The image will appear within the email body, not as an attachment.</p>
          
          {!bodyImagePreview ? (
            <button
              type="button"
              onClick={() => bodyImageInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              + Upload Image
            </button>
          ) : (
            <div className="space-y-3">
              <div className="border rounded-lg p-3 bg-gray-50">
                <img src={bodyImagePreview} alt="Body image preview" className="max-h-48 max-w-xs mx-auto rounded" />
                <p className="text-xs text-gray-600 mt-2 text-center">{bodyImage?.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiLink className="inline mr-1" /> Image Link (Optional)
                </label>
                <input
                  type="text"
                  value={bodyImageLink}
                  onChange={(e) => setBodyImageLink(e.target.value)}
                  placeholder="https://example.com (leave blank if no link)"
                  className="border p-2 w-full rounded text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">When a link is provided, clicking the image will open this URL.</p>
              </div>
              
              <button
                type="button"
                onClick={handleRemoveBodyImage}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center gap-1"
              >
                <FiTrash2 size={14} /> Remove Image
              </button>
            </div>
          )}
          
          <input
            type="file"
            ref={bodyImageInputRef}
            onChange={handleBodyImageSelect}
            accept="image/*"
            className="hidden"
          />
        </div>

        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        
        {/* Placeholder Confirmation Dialog */}
        {showPlaceholderConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-black">✨ Personalization Detected</h3>
              <p className="text-gray-700 mb-4">
                Your email contains <strong>{detectedPlaceholders.length}</strong> placeholder(s) that will be automatically replaced for each recipient:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
                <div className="space-y-1">
                  {detectedPlaceholders.map((placeholder, idx) => (
                    <div key={idx} className="text-sm font-mono text-black">
                      {placeholder}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                <p className="text-sm text-green-900">
                  ✓ Each recipient will receive an <strong>individually personalized</strong> email with their specific values.
                </p>
                <p className="text-sm text-green-900 mt-2">
                  Example: "{detectedPlaceholders[0]}" will be replaced with the recipient's actual value.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlaceholderConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performSend}
                  className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-60"
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Send Personalized Emails'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send Email'}
        </button>
      </form>

      {/* Placeholder Insert Modal */}
      {showPlaceholderModal && (
        <PlaceholderInsertModal
          onInsert={handleInsertPlaceholder}
          onClose={() => setShowPlaceholderModal(false)}
        />
      )}
    </div>
  );
}




// import { useState, useEffect, useRef } from 'react';
// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css';
// import PlaceholderInsertModal from '../../components/common/PlaceholderInsertModal';
// import { htmlToPlainText as sanitizeHtmlToPlainText } from '../../utils/htmlSanitizer';
// import { FiImage, FiTrash2, FiLink } from 'react-icons/fi';

// // ============================================================
// // DEFENSIVE HELPER: Safely convert FileList or array-like objects
// // ============================================================
// function safeConvertToArray(obj) {
//   if (!obj) return [];
//   if (Array.isArray(obj)) return obj;
  
//   try {
//     if (typeof obj === 'object' && 'length' in obj) {
//       return Array.from(obj);
//     }
//   } catch (e) {
//     console.warn('[EmailCompose] Failed to convert to array:', e.message);
//   }
  
//   return [];
// }

// // Helper to extract body content from HTML if it's a full document
// const extractBodyContent = (html) => {
//   if (!html) return '';
  
//   // Check if this is a full HTML document
//   if (html.includes('<!DOCTYPE') || html.includes('<html')) {
//     // Extract content between <body> tags
//     const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
//     if (bodyMatch && bodyMatch[1]) {
//       return bodyMatch[1].trim();
//     }
//   }
  
//   return html;
// };

// // Helper: Detect placeholders in text
// const detectPlaceholders = (text) => {
//   if (!text) return [];
//   const regex = /\[([A-Za-z0-9_]+)(?:\|([^\]]*))\]/g;
//   const placeholders = [];
//   let match;
//   while ((match = regex.exec(text)) !== null) {
//     const placeholder = `[${match[1]}]`;
//     if (!placeholders.includes(placeholder)) {
//       placeholders.push(placeholder);
//     }
//   }
//   return placeholders;
// };

// // Suppress findDOMNode warning for react-quill by patching console.error
// const originalError = console.error;
// const patchedError = (...args) => {
//   if (args[0]?.includes?.('findDOMNode') || (typeof args[0] === 'string' && args[0].includes('findDOMNode'))) {
//     return;
//   }
//   originalError(...args);
// };
// console.error = patchedError;

// // =====================
// // Utility: Convert HTML to Plain Text
// // =====================
// const htmlToPlainText = (html) => {
//   if (!html) return '';
  
//   // First, try the sanitizer utility
//   let plainText = sanitizeHtmlToPlainText(html);
  
//   // CRITICAL: Strip remaining HTML tags and decode entities
//   plainText = plainText
//     .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
//     .replace(/&nbsp;/g, ' ')
//     .replace(/&lt;/g, '<')
//     .replace(/&gt;/g, '>')
//     .replace(/&amp;/g, '&')
//     .replace(/&quot;/g, '"')
//     .replace(/&#39;/g, "'")
//     .trim();
  
//   return plainText;
// };

// export default function EmailCompose({ onSend, onOpenSettings, fromEmailDefault }) {
//   const [form, setForm] = useState({
//     to: '',
//     bcc: '',
//     replyTo: '',
//     subject: '',
//     fromName: '',
//     fromEmail: '',
//     body: '', // HTML version
//     bodyPlainText: '', // Plain text version
//     ctaText: '', // Call-to-Action text (optional)
//     ctaLink: '', // Call-to-Action link (optional)
//     attachments: [], // Initialize as empty array, not null
//     // attachments are File objects; you can rename them (including placeholders) below
//   });
//   const [sending, setSending] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [attachmentPreviews, setAttachmentPreviews] = useState([]);
//   // ✨ Attachment filenames can include placeholders like {RECIPIENT_EMAIL}, {RECIPIENT_NAME}, {CURRENT_DATE}
//   // Examples: invoice_{RECIPIENT_EMAIL}.pdf | report_{CURRENT_DATE}_{RECIPIENT_NAME}.docx | statement_{RECIPIENT_DOMAIN}.pdf
//   // Placeholders are rendered per recipient when the email is sent.
  
//   const [showPlaceholderModal, setShowPlaceholderModal] = useState(false);
//   const [placeholderInsertMode, setPlaceholderInsertMode] = useState('subject'); // 'subject', 'body', 'plainText', 'ctaText', or 'ctaLink'
//   const [showPlaceholderConfirm, setShowPlaceholderConfirm] = useState(false);
//   const [detectedPlaceholders, setDetectedPlaceholders] = useState([]);
//   const fileInputRef = useRef();
  
//   // Image in email body
//   const [bodyImage, setBodyImage] = useState(null);

//   // allow attachment renaming (we keep previews and form attachments in sync)
//   const handleRenameAttachment = (idx, newName) => {
//     setAttachmentPreviews(prev => {
//       const copy = [...prev];
//       copy[idx] = { ...copy[idx], name: newName };
//       return copy;
//     });
//     setForm(prev => {
//       const copy = [...prev.attachments];
//       if (copy[idx]) {
//         const file = copy[idx];
//         const renamedFile = new File([file], newName, { type: file.type });
//         copy[idx] = renamedFile;
//       }
//       return { ...prev, attachments: copy };
//     });
//   };
//   const [bodyImagePreview, setBodyImagePreview] = useState(null);
//   const [bodyImageLink, setBodyImageLink] = useState('');
//   const bodyImageInputRef = useRef();
//   const quillRef = useRef(null);

//   // Helper to auto-generate plain text from HTML if empty
//   const getAutoPlainText = (htmlContent, manualPlainText) => {
//     // ✅ CRITICAL FIX: ALWAYS clean plain text through htmlToPlainText
//     // This removes extra whitespace, blank lines, and HTML markup
//     // whether the text is user-provided or auto-generated
    
//     let plainTextToClean = manualPlainText && manualPlainText.trim() 
//       ? manualPlainText 
//       : htmlToPlainText(htmlContent);
    
//     // Apply aggressive whitespace cleanup
//     plainTextToClean = plainTextToClean
//       .split('\n')
//       .map(line => line.trim())
//       .filter(line => line.length > 0)  // Remove blank lines
//       .join('\n\n');  // Join with max 2 newlines
    
//     // Final cleanup: max 2 consecutive newlines
//     plainTextToClean = plainTextToClean.replace(/\n\n\n+/g, '\n\n');
    
//     return plainTextToClean.trim();
//   };
//   // track whether user wants to include an HTML body
//   const [useHtml, setUseHtml] = useState(true);
  
//   // ✅ NEW: Toggle between rich text editor (Quill) and raw HTML paste mode
//   const [useRawHtml, setUseRawHtml] = useState(false);
  
//   // Alignment and spacing controls for HTML body
//   const [htmlAlignment, setHtmlAlignment] = useState('center'); // 'left', 'center', 'right'
//   const [htmlMarginTop, setHtmlMarginTop] = useState(24);
//   const [htmlMarginBottom, setHtmlMarginBottom] = useState(16);

//   // Set default From Email from settings
//   useEffect(() => {
//     if (fromEmailDefault && !form.fromEmail) {
//       setForm((prev) => ({ ...prev, fromEmail: fromEmailDefault }));
//     }
//   }, [fromEmailDefault]);

//   const handleChange = (e) => {
//     const { name, value, files } = e.target;
//     if (name === 'attachments') {
//       // Use safe conversion helper
//       const attachmentsArray = safeConvertToArray(files);
//       setForm((prev) => ({ ...prev, attachments: attachmentsArray }));
//       // Preview attachments
//       const previews = [];
//       if (attachmentsArray.length > 0) {
//         attachmentsArray.forEach((file) => {
//           if (file.type.startsWith('image/')) {
//             previews.push({ type: 'image', url: URL.createObjectURL(file), name: file.name });
//           } else if (file.type === 'application/pdf') {
//             previews.push({ type: 'pdf', url: URL.createObjectURL(file), name: file.name });
//           } else {
//             previews.push({ type: 'file', name: file.name });
//           }
//         });
//       }
//       setAttachmentPreviews(previews);
//     } else {
//       setForm((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleInsertPlaceholder = (placeholder) => {
//     if (placeholderInsertMode === 'subject') {
//       setForm((prev) => ({
//         ...prev,
//         subject: prev.subject + placeholder,
//       }));
//     } else if (placeholderInsertMode === 'body') {
//       // Insert placeholder into ReactQuill editor
//       setForm((prev) => ({
//         ...prev,
//         body: prev.body + placeholder,
//       }));
//     } else if (placeholderInsertMode === 'plainText') {
//       setForm((prev) => ({
//         ...prev,
//         bodyPlainText: prev.bodyPlainText + placeholder,
//       }));
//     } else if (placeholderInsertMode === 'ctaText') {
//       setForm((prev) => ({
//         ...prev,
//         ctaText: prev.ctaText + placeholder,
//       }));
//     } else if (placeholderInsertMode === 'ctaLink') {
//       setForm((prev) => ({
//         ...prev,
//         ctaLink: prev.ctaLink + placeholder,
//       }));
//     }
//     setShowPlaceholderModal(false);
//   };

//   const openPlaceholderModal = (mode) => {
//     setPlaceholderInsertMode(mode);
//     setShowPlaceholderModal(true);
//   };

//   const handleBodyImageSelect = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     // Validate file size (max 5MB)
//     if (file.size > 5 * 1024 * 1024) {
//       setError('Image size must be less than 5MB.');
//       return;
//     }

//     // Validate file type
//     if (!file.type.startsWith('image/')) {
//       setError('Please select a valid image file.');
//       return;
//     }

//     // Read file as base64
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       setBodyImage(file);
//       setBodyImagePreview(event.target.result);
//       setError(null);
//     };
//     reader.readAsDataURL(file);
//   };

//   const handleRemoveBodyImage = () => {
//     setBodyImage(null);
//     setBodyImagePreview(null);
//     setBodyImageLink('');
//     if (bodyImageInputRef.current) {
//       bodyImageInputRef.current.value = '';
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     // Validation: at least one recipient
//     if (!form.to && !form.bcc) {
//       setError('Please provide at least one recipient (To or BCC).');
//       return;
//     }

//     // Validate content: require at least one of: HTML body, plain text, image, or CTA link
//     const hasHtmlBody = form.body && form.body.trim().length > 0 && form.body.trim() !== '<p><br></p>';
//     const hasPlainTextBody = form.bodyPlainText && form.bodyPlainText.trim().length > 0;
//     const hasImage = bodyImage && bodyImagePreview;
//     const hasCtaLink = form.ctaLink && form.ctaLink.trim().length > 0;
    
//     const hasValidContent = hasHtmlBody || hasPlainTextBody || hasImage || hasCtaLink;

//     if (!hasValidContent) {
//       setError('Please provide at least one of: email body, plain text, image, or CTA link.');
//       return;
//     }

//     // =====================
//     // DETECT PLACEHOLDERS
//     // =====================
//     const bodyContentForDetection = extractBodyContent(form.body);
//     const placeholders = [
//       ...detectPlaceholders(form.subject),
//       ...(bodyContentForDetection ? detectPlaceholders(bodyContentForDetection) : []),
//       ...(form.bodyPlainText ? detectPlaceholders(form.bodyPlainText) : []),
//       ...(form.ctaText ? detectPlaceholders(form.ctaText) : []),
//       ...(form.ctaLink ? detectPlaceholders(form.ctaLink) : []),
//       ...(bodyImageLink ? detectPlaceholders(bodyImageLink) : []),
//     ];
//     const uniquePlaceholders = [...new Set(placeholders)];

//     // If placeholders detected, show confirmation dialog
//     if (uniquePlaceholders.length > 0) {
//       setDetectedPlaceholders(uniquePlaceholders);
//       setShowPlaceholderConfirm(true);
//       return; // Wait for user confirmation
//     }

//     // No placeholders, proceed with send
//     await performSend();
//   };

//   const performSend = async () => {
//     setSending(true);
//     setError(null);
//     setSuccess(null);
//     setShowPlaceholderConfirm(false);
    
//     try {
//       // Extract body content if user pasted a full HTML document
//       const bodyContent = extractBodyContent(form.body);
      
//       // Auto-generate plain text if not provided
//       const plainTextVersion = getAutoPlainText(bodyContent, form.bodyPlainText);

//       // ⚠️ DO NOT sanitize HTML before sending.  Raw HTML must be preserved
//       // exactly as provided to avoid the rendering bugs described in the
//       // critical fix documentation.  We'll use `bodyContent` directly.
//       const sanitizedHtml = bodyContent; // kept variable name for backwards compatibility

//       // CONDITIONAL: If user enabled raw HTML mode, send as-is without template wrapping.
//       // Otherwise, wrap in professional email template.
//       let fullHtmlDocument;
      
//       if (useRawHtml) {
//         // Raw HTML mode: Send the user's HTML completely unchanged.
//         // The user has pasted a complete document (with <!DOCTYPE>, <html>, <body>, etc.)
//         // and we respect it as-is.
//         fullHtmlDocument = sanitizedHtml;
//         console.log('[EmailCompose] RAW HTML MODE: Sending HTML without template wrapping');
//       } else {
//         // Rich text mode: Wrap in professional table-based template
//         // (same template as before for backward compatibility)
// // ✅ PROFESSIONAL EMAIL TEMPLATE: Industry-standard structure
// // Uses table-based layout with INLINE CSS ONLY (no <style> blocks)
// // Compatible with Gmail, Outlook, Yahoo, iOS Mail, Android Mail
// fullHtmlDocument = `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta http-equiv="X-UA-Compatible" content="IE=edge">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <meta name="format-detection" content="telephone=no">
//   <meta name="format-detection" content="date=no">
//   <meta name="format-detection" content="address=no">
//   <meta name="format-detection" content="email=no">
//   <title>Email</title>
// </head>
// <body style="margin:0;padding:0;min-width:100%!important;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
//   <!-- Main wrapper table -->
//   <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background-color:#ffffff;margin:0;padding:0;border-collapse:collapse;">
//     <tbody>
//       <tr>
//         <td align="center" style="padding:0;margin:0;background-color:#ffffff;">
//           <!-- Content wrapper table (600px for optimal width) -->
//           <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;margin:0;padding:0;background-color:#ffffff;border-collapse:collapse;">
//             <tbody>
//               <!-- Header spacer -->
//               <tr>
//                 <td style="padding:0;margin:0;height:0;width:100%;border-collapse:collapse;"></td>
//               </tr>
              
//               <!-- Main content cell -->
//               <tr>
//                 <td style="padding:24px 16px;margin:0;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;-webkit-hyphens:auto;-moz-hyphens:auto;hyphens:auto;border-collapse:collapse;text-align:${htmlAlignment};">
//                   <!-- Content with inline styles for email clients -->
//                   <div style="max-width:600px;width:100%;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;word-wrap:break-word;margin-top:${htmlMarginTop}px;margin-bottom:${htmlMarginBottom}px;">
//                     ${sanitizedHtml}
//                   </div>
//                 </td>
//               </tr>
              
//               <!-- Footer spacer -->
//               <tr>
//                 <td style="padding:0;margin:0;height:0;width:100%;border-collapse:collapse;"></td>
//               </tr>
//             </tbody>
//           </table>
//         </td>
//       </tr>
//     </tbody>
//   </table>
// </body>
// </html>`;
//       }


// console.log('[EmailCompose] About to build email payload:', {
//         useHtml: useHtml,
//         useRawHtml: useRawHtml,
//         mode: useRawHtml ? 'RAW_HTML_UNMODIFIED' : 'RICH_TEXT_WITH_TEMPLATE',
//         quillContent: form.body?.substring(0, 200) || 'EMPTY',
//         plainTextProvided: !!form.bodyPlainText,
//       });

//       // Ensure attachments is always an array
//       const attachmentsArray = safeConvertToArray(form.attachments);
      
//       console.log('[EmailCompose] performSend() - Attachment Details:', {
//         attachmentsType: typeof form.attachments,
//         attachmentsIsArray: Array.isArray(form.attachments),
//         attachmentsLength: attachmentsArray.length,
//         attachmentDetails: attachmentsArray.map(a => ({ name: a.name, size: a.size, type: a.type })),
//       });
      
//       const emailPayload = {
//         to: form.to.split(',').map((s) => s.trim()).filter(Boolean),
//         bcc: form.bcc.split(/,|\n/).map((s) => s.trim()).filter(Boolean),
//         subject: form.subject,
//         fromName: form.fromName,
//         fromEmail: form.fromEmail,
//         replyTo: form.replyTo,
//         body: useHtml ? fullHtmlDocument : null,
//         bodyPlainText: plainTextVersion,
//         ctaText: form.ctaText.trim() || null,
//         ctaLink: form.ctaLink.trim() || null,
//         attachments: attachmentsArray, // Always pass as array
//         bodyImage: bodyImage && bodyImagePreview ? {
//           base64: bodyImagePreview,
//           filename: bodyImage.name,
//           link: bodyImageLink.trim() || null,
//         } : null,
//         htmlAlignment: htmlAlignment,
//         htmlMarginTop: htmlMarginTop,
//         htmlMarginBottom: htmlMarginBottom,
//         useRawHtmlMode: useRawHtml, // Pass flag to backend to prevent re-wrapping
//       };
      
//       console.log('[EmailCompose] performSend() - Email Payload Details:', {
//         mode: useRawHtml ? 'RAW_HTML' : 'TEMPLATE_WRAPPED',
//         htmlStructure: emailPayload.body?.substring(0, 150) || 'EMPTY',
//         hasDoctype: emailPayload.body?.includes('<!DOCTYPE') ? 'YES' : 'NO',
//         hasBodyTag: emailPayload.body?.includes('<body') ? 'YES' : 'NO',
//         bodyLength: emailPayload.body?.length || 0,
//         bodyPlainText: emailPayload.bodyPlainText?.substring(0, 100) || 'EMPTY/AUTO-GENERATED',
//         bodyPlainTextLength: emailPayload.bodyPlainText?.length || 0,
//         ctaText: emailPayload.ctaText,
//         ctaLink: emailPayload.ctaLink,
//         alignment: emailPayload.htmlAlignment,
//         marginTop: emailPayload.htmlMarginTop,
//         marginBottom: emailPayload.htmlMarginBottom,
//       });
      
//       const result = await onSend(emailPayload);
//       // `handleSend` now returns the raw response data from server, even on partial failure.
//       if (result && result.success) {
//         setSuccess('Email sent successfully!');
//       } else if (result && result.error) {
//         // partial or complete failure
//         setError(result.error);
//         console.error('[EmailCompose] Server indicated failure details:', result);
//       } else {
//         // Unknown response shape
//         setError('Failed to send email');
//         console.error('[EmailCompose] Unexpected response from onSend():', result);
//       }
//     } catch (err) {
//       console.error('[EmailCompose] performSend() caught error:', err);
//       setError(err.message || 'Failed to send email.');
//     }
//     setSending(false);
//   };

//   // Apply alignment and spacing to the Quill editor content (.ql-editor)
//   useEffect(() => {
//     try {
//       const quill = quillRef.current?.getEditor && quillRef.current.getEditor();
//       if (!quill) return;
//       const range = quill.getSelection();
//       // If there's no selection, apply as editor-wide default (affects typing and wrapper)
//       if (!range || range.length === 0) {
//         const editorRoot = quill.root;
//         if (editorRoot) {
//           editorRoot.style.textAlign = htmlAlignment;
//           editorRoot.style.marginTop = `${htmlMarginTop}px`;
//           editorRoot.style.marginBottom = `${htmlMarginBottom}px`;
//         }
//       }
//       // If there is a selection we do not override here — selection-based handlers apply styles.
//     } catch (err) {
//       // non-fatal
//     }
//   }, [htmlAlignment, htmlMarginTop, htmlMarginBottom, useHtml]);

//   // Apply alignment to selected text or whole editor when nothing selected
//   const applyAlignment = (align) => {
//     setHtmlAlignment(align);
//     try {
//       const quill = quillRef.current?.getEditor && quillRef.current.getEditor();
//       if (!quill) return;
//       const range = quill.getSelection();
//       if (range && range.length > 0) {
//         quill.format('align', align);
//         // Sync edited HTML back to form state so sent HTML contains the alignment
//         setForm((prev) => ({ ...prev, body: quill.root.innerHTML }));
//       } else {
//         const editorRoot = quill.root;
//         if (editorRoot) editorRoot.style.textAlign = align;
//       }
//     } catch (err) {
//       // ignore
//     }
//   };

//   // Apply top/bottom margins to selected lines or whole editor when nothing selected
//   const applyMargins = (top, bottom) => {
//     setHtmlMarginTop(top);
//     setHtmlMarginBottom(bottom);
//     try {
//       const quill = quillRef.current?.getEditor && quillRef.current.getEditor();
//       if (!quill) return;
//       const range = quill.getSelection();
//       if (range && range.length > 0) {
//         const lines = quill.getLines(range.index, range.length);
//         lines.forEach((line) => {
//           if (line && line.domNode) {
//             line.domNode.style.marginTop = `${top}px`;
//             line.domNode.style.marginBottom = `${bottom}px`;
//           }
//         });
//         // Sync edited HTML back to form state so sent HTML contains the margin styles
//         setForm((prev) => ({ ...prev, body: quill.root.innerHTML }));
//       } else {
//         const editorRoot = quill.root;
//         if (editorRoot) {
//           editorRoot.style.marginTop = `${top}px`;
//           editorRoot.style.marginBottom = `${bottom}px`;
//         }
//       }
//     } catch (err) {
//       // ignore
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded shadow">
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-bold">Compose Email</h2>
//         <button className="text-blue-600 underline" onClick={onOpenSettings}>Settings</button>
//       </div>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div className="flex gap-4">
//           <input
//             type="text"
//             name="to"
//             value={form.to}
//             onChange={handleChange}
//             className="border p-2 flex-1"
//             placeholder="To (comma separated)"
//           />
//           <textarea
//             name="bcc"
//             value={form.bcc}
//             onChange={handleChange}
//             className="border p-2 flex-1 min-h-[48px]"
//             placeholder="BCC (comma or newline separated)"
//           />
//         </div>
//         <input
//           type="text"
//           name="fromName"
//           value={form.fromName}
//           onChange={handleChange}
//           className="border p-2 w-full"
//           placeholder="From Name (displayed to recipient)"
//         />
//         <input
//           type="email"
//           name="fromEmail"
//           value={form.fromEmail}
//           onChange={handleChange}
//           className="border p-2 w-full"
//           placeholder="From Email (default from settings)"
//           required
//         />
//         <input
//           type="text"
//           name="replyTo"
//           value={form.replyTo}
//           onChange={handleChange}
//           className="border p-2 w-full"
//           placeholder="Reply-To (optional)"
//         />
//         <div className="flex gap-2 items-end">
//           <div className="flex-1">
//             <input
//               type="text"
//               name="subject"
//               value={form.subject}
//               onChange={handleChange}
//               className="border p-2 w-full"
//               placeholder="Subject"
//             />
//           </div>
//           <button
//             type="button"
//             onClick={() => openPlaceholderModal('subject')}
//             className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
//             title="Insert placeholder in subject"
//           >
//             + Placeholder
//           </button>
//         </div>

//         {/* Info: Multipart/Alternative Email Format */}
//         <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-900">
//           <strong>✉️ Multipart Email:</strong> Emails are sent with both HTML and plain text versions. Recipients' email clients will automatically display the best version.
//         </div>

//         {/* HTML Editor Section */}
//         <div>
//           <div className="mb-3 flex gap-2 items-center">
//             <div className="flex-1">
//               <label className="block text-sm font-semibold mb-1">📧 Email as HTML</label>
//               <div className="text-sm text-black bg-gray-50 p-2 rounded border border-gray-200">
//                 <strong>💡 Tip:</strong> Use the formatting buttons to style your email, OR paste complete HTML documents directly.
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={() => openPlaceholderModal('body')}
//               className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap h-fit"
//               title="Insert placeholder in HTML body"
//             >
//               + Placeholder
//             </button>
//           </div>
//           <div className="mb-3 flex items-center gap-3 justify-between">
//             <div className="flex items-center gap-3">
//               <input id="useHtml" type="checkbox" checked={useHtml} onChange={(e) => setUseHtml(e.target.checked)} className="h-4 w-4" />
//               <label htmlFor="useHtml" className="text-sm font-semibold">Use HTML body (optional)</label>
//             </div>
//             {!useHtml && <div className="text-sm text-gray-500">HTML disabled — sending plain text only.</div>}
//           </div>
          
//           {/* ✅ NEW: Raw HTML Mode Toggle */}
//           {useHtml && (
//             <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200 flex items-center gap-2">
//               <input
//                 id="useRawHtml"
//                 type="checkbox"
//                 checked={useRawHtml}
//                 onChange={(e) => setUseRawHtml(e.target.checked)}
//                 className="h-4 w-4"
//               />
//               <label htmlFor="useRawHtml" className="text-sm font-semibold text-blue-900">
//                 📋 Paste Raw HTML (paste complete documents without Rich Text formatting)
//               </label>
//             </div>
//           )}
          
//           {/* Alignment & Spacing Controls - HIDDEN in raw HTML mode */}
//           {useHtml && !useRawHtml && (
//             <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200 flex gap-4 items-end flex-wrap">
//               <div>
//                 <label className="text-xs font-semibold text-gray-600 block mb-2">📍 Alignment:</label>
//                 <div className="flex gap-1">
//                   <button
//                     type="button"
//                     onClick={() => applyAlignment('left')}
//                     className={`px-3 py-1 text-sm border rounded font-medium transition ${
//                       htmlAlignment === 'left' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-blue-50'
//                     }`}
//                     title="Align Left"
//                   >
//                     ⬅️ Left
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => applyAlignment('center')}
//                     className={`px-3 py-1 text-sm border rounded font-medium transition ${
//                       htmlAlignment === 'center' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-blue-50'
//                     }`}
//                     title="Align Center"
//                   >
//                     ⬆️⬇️ Center
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => applyAlignment('right')}
//                     className={`px-3 py-1 text-sm border rounded font-medium transition ${
//                       htmlAlignment === 'right' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-blue-50'
//                     }`}
//                     title="Align Right"
//                   >
//                     ➡️ Right
//                   </button>
//                 </div>
//               </div>
              
//               <div>
//                 <label className="text-xs font-semibold text-gray-600 block mb-2">📏 Top Margin:</label>
//                 <select 
//                   value={htmlMarginTop} 
//                   onChange={(e) => applyMargins(Number(e.target.value), htmlMarginBottom)}
//                   className="px-2 py-1 text-sm border rounded"
//                 >
//                   <option value="0">None (0px)</option>
//                   <option value="8">Extra Small (8px)</option>
//                   <option value="16">Small (16px)</option>
//                   <option value="24">Medium (24px)</option>
//                   <option value="32">Large (32px)</option>
//                 </select>
//               </div>
              
//               <div>
//                 <label className="text-xs font-semibold text-gray-600 block mb-2">📏 Bottom Margin:</label>
//                 <select 
//                   value={htmlMarginBottom}
//                   onChange={(e) => applyMargins(htmlMarginTop, Number(e.target.value))}
//                   className="px-2 py-1 text-sm border rounded"
//                 >
//                   <option value="0">None (0px)</option>
//                   <option value="8">Extra Small (8px)</option>
//                   <option value="16">Small (16px)</option>
//                   <option value="24">Medium (24px)</option>
//                   <option value="32">Large (32px)</option>
//                 </select>
//               </div>
//             </div>
//           )}
          
//           {/* ✅ Raw HTML Textarea (if user selected raw mode) */}
//           {useHtml && useRawHtml && (
//             <textarea
//               name="bodyRawHtml"
//               value={form.body}
//               onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
//               className="border p-2 w-full min-h-[200px] font-mono text-sm mb-3"
//               placeholder="Paste complete HTML documents here (including <!DOCTYPE>, <html>, <body> tags). Raw HTML will be sent without modification."
//             />
//           )}
          
//           {/* Rich Text Editor (if user did NOT select raw mode) */}
//           {useHtml && !useRawHtml && (
//             <ReactQuill
//               ref={quillRef}
//               value={form.body}
//               onChange={(value) => setForm((prev) => ({ ...prev, body: value }))}
//               theme="snow"
//               className="bg-white"
//               style={{ minHeight: 120 }}
//               readOnly={!useHtml}
//               modules={useHtml ? undefined : { toolbar: false }}
//             />
//           )}
//         </div>

//         {/* Call-to-Action (CTA) Section */}
//         <div className="border-t pt-4">
//           {/* CTA Text Field */}
//           <div className="mb-4 pb-4 border-b">
//             <div className="mb-3 flex gap-2 items-end">
//               <div className="flex-1">
//                 <label className="block text-sm font-semibold mb-1">📝 CTA Text (Optional)</label>
//                 <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded border border-purple-200 mb-2">
//                   <strong>💡 Usage:</strong> The text displayed on the CTA button/link (e.g., "Click Here", "Learn More", "Claim Offer"). Supports placeholders like {`{RECIPIENT_NAME}`}.
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => openPlaceholderModal('ctaText')}
//                 className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap h-fit"
//                 title="Insert placeholder in CTA text"
//               >
//                 + Placeholder
//               </button>
//             </div>
//             <input
//               type="text"
//               name="ctaText"
//               value={form.ctaText}
//               onChange={handleChange}
//               className="border p-2 w-full rounded"
//               placeholder="e.g., Click Here | Learn More | Claim Your Offer | {RECIPIENT_NAME}, Join Now"
//             />
//             <p className="text-xs text-gray-500 mt-2">
//               Examples: Click Here | Learn More | Claim Offer | Join {`{RECIPIENT_NAME}`}
//             </p>
//           </div>

//           {/* CTA Link Field */}
//           <div className="mb-3 flex gap-2 items-end">
//             <div className="flex-1">
//               <label className="block text-sm font-semibold mb-1">🔗 CTA Link (Optional)</label>
//               <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mb-2">
//                 <strong>💡 Usage:</strong> The URL that the CTA text links to. Supports placeholders like {`{RECIPIENT_EMAIL}`}.
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={() => openPlaceholderModal('ctaLink')}
//               className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap h-fit"
//               title="Insert placeholder in CTA link"
//             >
//               + Placeholder
//             </button>
//           </div>
//           <input
//             type="text"
//             name="ctaLink"
//             value={form.ctaLink}
//             onChange={handleChange}
//             className="border p-2 w-full rounded"
//             placeholder="https://example.com/page or https://example.com/user/[RECIPIENT_EMAIL]"
//           />
//           <p className="text-xs text-gray-500 mt-2">
//             Examples: https://example.com/offer | https://example.com/user/{`{RECIPIENT_EMAIL}`} | https://example.com/code/{`{RANDOM_CODE}`}
//           </p>
//         </div>

//         {/* Preview removed — previews disabled in this UI. */}
//         <div className="mb-4 text-sm text-gray-500">Preview panes removed. Emails will be sent with the selected HTML/plain text content.</div>
//         <input
//           type="file"
//           name="attachments"
//           multiple
//           onChange={handleChange}
//           className="border p-2 w-full"
//           ref={fileInputRef}
//         />
//         <p className="text-xs text-gray-500 mt-2 mb-3">
//           💡 <strong>Attachment Placeholders:</strong> Examples: <code className="bg-gray-100 px-1">invoice_{`{RECIPIENT_EMAIL}`}.pdf</code> | <code className="bg-gray-100 px-1">report_{`{CURRENT_DATE}`}_{`{RECIPIENT_NAME}`}.docx</code> | <code className="bg-gray-100 px-1">statement_{`{RECIPIENT_DOMAIN}`}.pdf</code>
//         </p>
//         {attachmentPreviews.length > 0 && (
//           <div className="mt-2">
//             <div className="font-semibold text-xs text-gray-500 mb-1">Attachment Preview:</div>
//             <div className="flex gap-4 flex-wrap">
//               {attachmentPreviews.map((file, idx) => (
//                 <div key={idx} className="border rounded p-2 bg-gray-50 flex flex-col items-center">
//                   {file.type === 'image' ? (
//                     <img src={file.url} alt={file.name} className="max-h-24 max-w-xs mb-1" />
//                   ) : file.type === 'pdf' ? (
//                     <object data={file.url} type="application/pdf" width="120" height="160">
//                       <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>
//                     </object>
//                   ) : (
//                     <span>{file.name}</span>
//                   )}
//                   {/* rename input */}
//                   <input
//                     type="text"
//                     value={file.name}
//                     onChange={(e) => handleRenameAttachment(idx, e.target.value)}
//                     className="mt-1 text-xs border-b border-gray-300 focus:outline-none focus:border-gray-500"
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Image in Email Body */}
//         <div className="border-t pt-4 mt-4">
//           <label className="block font-semibold text-gray-700 mb-2">
//             <FiImage className="inline mr-2" /> Image in Email Body (Optional)
//           </label>
//           <p className="text-sm text-gray-600 mb-3">Add an image directly in your email message. The image will appear within the email body, not as an attachment.</p>
          
//           {!bodyImagePreview ? (
//             <button
//               type="button"
//               onClick={() => bodyImageInputRef.current?.click()}
//               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//             >
//               + Upload Image
//             </button>
//           ) : (
//             <div className="space-y-3">
//               <div className="border rounded-lg p-3 bg-gray-50">
//                 <img src={bodyImagePreview} alt="Body image preview" className="max-h-48 max-w-xs mx-auto rounded" />
//                 <p className="text-xs text-gray-600 mt-2 text-center">{bodyImage?.name}</p>
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   <FiLink className="inline mr-1" /> Image Link (Optional)
//                 </label>
//                 <input
//                   type="text"
//                   value={bodyImageLink}
//                   onChange={(e) => setBodyImageLink(e.target.value)}
//                   placeholder="https://example.com (leave blank if no link)"
//                   className="border p-2 w-full rounded text-sm"
//                 />
//                 <p className="text-xs text-gray-500 mt-1">When a link is provided, clicking the image will open this URL.</p>
//               </div>
              
//               <button
//                 type="button"
//                 onClick={handleRemoveBodyImage}
//                 className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center gap-1"
//               >
//                 <FiTrash2 size={14} /> Remove Image
//               </button>
//             </div>
//           )}
          
//           <input
//             type="file"
//             ref={bodyImageInputRef}
//             onChange={handleBodyImageSelect}
//             accept="image/*"
//             className="hidden"
//           />
//         </div>

//         {error && <div className="text-red-600">{error}</div>}
//         {success && <div className="text-green-600">{success}</div>}
        
//         {/* Placeholder Confirmation Dialog */}
//         {showPlaceholderConfirm && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
//               <h3 className="text-xl font-bold mb-4 text-black">✨ Personalization Detected</h3>
//               <p className="text-gray-700 mb-4">
//                 Your email contains <strong>{detectedPlaceholders.length}</strong> placeholder(s) that will be automatically replaced for each recipient:
//               </p>
//               <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
//                 <div className="space-y-1">
//                   {detectedPlaceholders.map((placeholder, idx) => (
//                     <div key={idx} className="text-sm font-mono text-black">
//                       {placeholder}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//               <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
//                 <p className="text-sm text-green-900">
//                   ✓ Each recipient will receive an <strong>individually personalized</strong> email with their specific values.
//                 </p>
//                 <p className="text-sm text-green-900 mt-2">
//                   Example: "{detectedPlaceholders[0]}" will be replaced with the recipient's actual value.
//                 </p>
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   type="button"
//                   onClick={() => setShowPlaceholderConfirm(false)}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={performSend}
//                   className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-60"
//                   disabled={sending}
//                 >
//                   {sending ? 'Sending...' : 'Send Personalized Emails'}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
        
//         <button
//           type="submit"
//           className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
//           disabled={sending}
//         >
//           {sending ? 'Sending...' : 'Send Email'}
//         </button>
//       </form>

//       {/* Placeholder Insert Modal */}
//       {showPlaceholderModal && (
//         <PlaceholderInsertModal
//           onInsert={handleInsertPlaceholder}
//           onClose={() => setShowPlaceholderModal(false)}
//         />
//       )}
//     </div>
//   );
// }



