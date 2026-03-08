import { useState, useEffect, useRef } from 'react'
import { FiX, FiMail, FiAlertCircle, FiLoader, FiSettings } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import PlaceholderInsertModal from './PlaceholderInsertModal'

export default function SendNoteModal({ isOpen, onClose, note }) {
  const [recipients, setRecipients] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingSettings, setLoadingSettings] = useState(false)
  
  // Email settings
  const [settings, setSettings] = useState(null)
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  
  // Call-to-action
  const [callToActionText, setCallToActionText] = useState('')
  const [callLink, setCallLink] = useState('')
  // Reply-To
  const [replyTo, setReplyTo] = useState('')
  // Placeholder modal
  const [showPlaceholderModal, setShowPlaceholderModal] = useState(false)
  const [activePlaceholderField, setActivePlaceholderField] = useState(null)

  // Refs for inserting placeholders at cursor position
  const fromNameRef = useRef(null)
  const callTextRef = useRef(null)
  const callLinkRef = useRef(null)
  const customMessageRef = useRef(null)

  // Load email settings on mount
  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen])

  const fetchSettings = async () => {
    setLoadingSettings(true)
    try {
      const res = await axios.get('/email/settings')
      setSettings(res.data.settings)
      if (res.data.settings?.provider) {
        setShowSettingsForm(false)
      } else {
        setShowSettingsForm(true)
      }
    } catch (err) {
      console.error('Error loading email settings:', err)
      setShowSettingsForm(true)
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate from name and email
    if (!fromName.trim()) {
      setError('Please enter a from name')
      return
    }
    if (!fromEmail.trim()) {
      setError('Please enter a from email')
      return
    }

    // Validate CTA - if text is provided, link is required and vice versa
    if ((callToActionText.trim() || callLink.trim()) && (!callToActionText.trim() || !callLink.trim())) {
      setError('Both call-to-action text and link are required if you add a CTA')
      return
    }

    // Validate CTA link is a valid URL if provided
    if (callLink.trim()) {
      try {
        new URL(callLink.trim())
      } catch (err) {
        setError('Invalid call-to-action link URL')
        return
      }
    }

    // Parse and validate recipient emails
    const emailList = recipients
      .split(/[,\n]+/)
      .map(email => email.trim())
      .filter(email => email)

    if (emailList.length === 0) {
      setError('Please enter at least one email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailList.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      setError(`Invalid email format: ${invalidEmails.join(', ')}`)
      return
    }

    // Validate reply-to email format if provided
    if (replyTo.trim() && !emailRegex.test(replyTo.trim())) {
      setError('Invalid reply-to email format')
      return
    }

    // Validate email settings are configured
    if (!settings?.provider) {
      setError('Email settings not configured. Please configure email settings first.')
      setShowSettingsForm(true)
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(`/notes/${note._id}/send`, {
        recipientEmails: emailList,
        customMessage: customMessage.trim() || null,
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim(),
        callToActionText: callToActionText.trim() || null,
        callLink: callLink.trim() || null,
        replyTo: replyTo.trim() || null
      })

      // Show success message
      const successMsg = `✅ Note sent successfully to ${response.data.results.successCount} recipient(s)`
      toast.success(successMsg)

      // Show failure details if any
      if (response.data.results.failureCount > 0) {
        const failures = response.data.results.failures || []
        const failureMsg = failures.map(f => `${f.email}: ${f.error}`).join('\n')
        toast.error(`Failed to send to ${response.data.results.failureCount} recipient(s):\n${failureMsg}`, { duration: 6000 })
      }

      // Show scheduled send info if applicable
      if (response.data.results.scheduledSendResults?.scheduled) {
        const scheduledMsg = `📅 ${response.data.results.scheduledSendResults.message}`
        toast.success(scheduledMsg, { duration: 5000 })
      }

      // Reset form and close
      setRecipients('')
      setCustomMessage('')
      setFromName('')
      setFromEmail('')
      setCallToActionText('')
      setCallLink('')
      setReplyTo('')
      setError('')
      onClose()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send note'
      console.error('SendNote Error:', err)
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !note) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiMail className="text-blue-600 text-xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Send Note via Email</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={loading}
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Note Title Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">Note:</p>
            <p className="text-gray-800 font-medium">{note.title}</p>
          </div>

          {/* Scheduled Send Info */}
          {note.scheduledUTC && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-semibold mb-2">⏰ Scheduled Send</p>
              <div className="text-xs text-blue-600 space-y-1">
                <p>✅ Note will be sent <strong>immediately</strong> to all recipients</p>
                <p>📅 Note will be sent again on <strong>{note.scheduleDate}</strong> at <strong>00:00</strong> ({note.timezone})</p>
              </div>
            </div>
          )}

          {!note.scheduledUTC && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">ℹ️ Note Info</p>
              <p className="text-xs text-gray-600 mt-1">This note will be sent once</p>
            </div>
          )}

          {/* Email Settings Status */}
          {loadingSettings ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiLoader className="animate-spin" />
              Loading email settings...
            </div>
          ) : !settings?.provider ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600 font-medium">⚠️ Email Settings Required</p>
              <p className="text-xs text-red-600 mt-1">Configure email settings to send notes</p>
              <button
                type="button"
                onClick={() => setShowSettingsForm(!showSettingsForm)}
                className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <FiSettings className="w-4 h-4" /> Configure Settings
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 font-medium">✅ Email Provider: {settings.provider.toUpperCase()}</p>
            </div>
          )}

          {/* From Name */}
          <div>
            <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 mb-2">
              From Name <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
            <input
              id="fromName"
              type="text"
              ref={fromNameRef}
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="e.g., Your Name or Company"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => { setActivePlaceholderField('fromName'); setShowPlaceholderModal(true) }}
              className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              Placeholders
            </button>
            </div>
          </div>

          {/* From Email */}
          <div>
            <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-2">
              From Email <span className="text-red-500">*</span>
            </label>
            <input
              id="fromEmail"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="sender@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Reply-To Email */}
          <div>
            <label htmlFor="replyTo" className="block text-sm font-medium text-gray-700 mb-2">
              Reply-To Email <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              id="replyTo"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="replies@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Recipients will reply to this email address instead of the From address</p>
          </div>

          {/* Call-to-Action Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <span>📢</span> Call-to-Action (Optional)
            </p>
            
            {/* CTA Text */}
            <div className="mb-3">
              <label htmlFor="callToActionText" className="block text-sm font-medium text-gray-700 mb-2">
                CTA Text <span className="text-gray-500 text-xs">(e.g., "View More", "Sign Up", "Download")</span>
              </label>
              <input
                id="callToActionText"
                type="text"
                ref={callTextRef}
                value={callToActionText}
                onChange={(e) => setCallToActionText(e.target.value)}
                placeholder="e.g., View Our Website or Learn More"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
                maxLength="100"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setActivePlaceholderField('callToActionText'); setShowPlaceholderModal(true) }}
                  className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50"
                >
                  Insert Placeholder
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{callToActionText.length}/100 characters</p>
            </div>

            {/* CTA Link */}
            <div>
              <label htmlFor="callLink" className="block text-sm font-medium text-gray-700 mb-2">
                CTA Link <span className="text-gray-500 text-xs">(URL recipients click on)</span>
              </label>
              <input
                id="callLink"
                type="url"
                ref={callLinkRef}
                value={callLink}
                onChange={(e) => setCallLink(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500">Both text and link must be provided to display the button</p>
                  <button
                    type="button"
                    onClick={() => { setActivePlaceholderField('callLink'); setShowPlaceholderModal(true) }}
                    className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Insert Placeholder
                  </button>
                </div>
            </div>
          </div>

          {/* Recipients Field */}
          <div>
            <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-2">
              Email Recipient(s) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter email addresses (comma or line separated)&#10;user@example.com&#10;another@example.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              rows="3"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">Separate multiple emails with commas or newlines</p>
          </div>

          {/* Custom Message Field */}
          <div>
            <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              id="customMessage"
              ref={customMessageRef}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to include in the email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              rows="3"
              disabled={loading}
              maxLength="500"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">{customMessage.length}/500 characters</p>
              <button
                type="button"
                onClick={() => { setActivePlaceholderField('customMessage'); setShowPlaceholderModal(true) }}
                className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50"
              >
                Insert Placeholder
              </button>
            </div>
          </div>

          {showPlaceholderModal && (
            <PlaceholderInsertModal
              onClose={() => setShowPlaceholderModal(false)}
              onInsert={(placeholder) => {
                // Insert placeholder into the active field at cursor position
                try {
                  if (activePlaceholderField === 'fromName' && fromNameRef.current) {
                    const el = fromNameRef.current
                    const start = el.selectionStart || el.value.length
                    const end = el.selectionEnd || start
                    const newVal = el.value.substring(0, start) + placeholder + el.value.substring(end)
                    setFromName(newVal)
                    // restore focus and cursor
                    setTimeout(() => {
                      el.focus()
                      const pos = start + placeholder.length
                      el.setSelectionRange(pos, pos)
                    }, 0)
                  } else if (activePlaceholderField === 'callToActionText' && callTextRef.current) {
                    const el = callTextRef.current
                    const start = el.selectionStart || el.value.length
                    const end = el.selectionEnd || start
                    const newVal = el.value.substring(0, start) + placeholder + el.value.substring(end)
                    setCallToActionText(newVal)
                    setTimeout(() => { el.focus(); const pos = start + placeholder.length; el.setSelectionRange(pos, pos) }, 0)
                  } else if (activePlaceholderField === 'callLink' && callLinkRef.current) {
                    const el = callLinkRef.current
                    const start = el.selectionStart || el.value.length
                    const end = el.selectionEnd || start
                    const newVal = el.value.substring(0, start) + placeholder + el.value.substring(end)
                    setCallLink(newVal)
                    setTimeout(() => { el.focus(); const pos = start + placeholder.length; el.setSelectionRange(pos, pos) }, 0)
                  } else if (activePlaceholderField === 'customMessage' && customMessageRef.current) {
                    const el = customMessageRef.current
                    const start = el.selectionStart || el.value.length
                    const end = el.selectionEnd || start
                    const newVal = el.value.substring(0, start) + placeholder + el.value.substring(end)
                    setCustomMessage(newVal)
                    setTimeout(() => { el.focus(); const pos = start + placeholder.length; el.setSelectionRange(pos, pos) }, 0)
                  }
                } catch (err) {
                  // Fallback: append at end
                  if (activePlaceholderField === 'fromName') setFromName((v) => v + placeholder)
                  if (activePlaceholderField === 'callToActionText') setCallToActionText((v) => v + placeholder)
                  if (activePlaceholderField === 'callLink') setCallLink((v) => v + placeholder)
                  if (activePlaceholderField === 'customMessage') setCustomMessage((v) => v + placeholder)
                } finally {
                  setShowPlaceholderModal(false)
                }
              }}
            />
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || recipients.trim() === '' || fromName.trim() === '' || fromEmail.trim() === '' || !settings?.provider}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FiMail />
                Send Note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
