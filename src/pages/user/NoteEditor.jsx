import { useState, useEffect } from 'react'
import { FiX, FiSave, FiTrash2, FiUpload, FiLoader, FiFile } from 'react-icons/fi'
import toast from 'react-hot-toast'
import axios from 'axios'
import PlaceholderInsertModal from '../../components/common/PlaceholderInsertModal'

export default function NoteEditor({ note, isNew, onSave, onClose, isAdmin, user, passwordUnlocked = true }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPlaceholderModal, setShowPlaceholderModal] = useState(false)
  
  // Media upload states
  const [uploadedImages, setUploadedImages] = useState([])
  const [uploadedVideo, setUploadedVideo] = useState(null)
  const [uploadedPDFs, setUploadedPDFs] = useState([])
  // ✨ Attachment filenames in notes can include placeholders like {RECIPIENT_EMAIL}, {CURRENT_DATE}
  // Examples: document_{RECIPIENT_EMAIL}.pdf | contract_{CURRENT_DATE}.pdf | report_{RECIPIENT_NAME}.docx
  // When the note is sent via email, placeholders are rendered per recipient.
  // Edit attachment names via the editable input fields in the attachments list.
  
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (note && !isNew) {
      setTitle(note.title)
      setContent(note.content)
      
      // Load existing media
      if (note.images) {
        setUploadedImages(note.images)
      }
      if (note.video && note.video.length > 0) {
        setUploadedVideo(Array.isArray(note.video) ? note.video : [note.video])
      } else {
        setUploadedVideo([])
      }
      if (note.attachments) {
        setUploadedPDFs(note.attachments)
      }
    } else if (isNew) {
      setTitle('')
      setContent('')
      
      // Clear media
      setUploadedImages([])
      setUploadedVideo([])
      setUploadedPDFs([])
    }
  }, [note, isNew, user])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a note title')
      return
    }
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        content
      }
      // send attachments metadata (may include renamed filenames)
      if (uploadedPDFs && uploadedPDFs.length > 0) {
        data.attachments = uploadedPDFs
      }
      await onSave(data)
    } finally { setSaving(false) }
  }

  // Helper to get password verification headers
  const getPasswordHeaders = () => {
    const headers = {}
    if (passwordUnlocked) {
      headers['x-notepad-password-verified'] = 'true'
    }
    return headers
  }

  // Helper: check if current user is owner of a note (robust across shapes)
  const isOwner = (note) => {
    if (!note || !user) return false
    const ownerId = note.userId && (note.userId._id ? note.userId._id : note.userId)
    const currentUserId = user._id || user.id || user
    return String(ownerId) === String(currentUserId)
  }

  // Handle image/video/pdf file selection
  const handleMediaSelect = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!note || !note._id) {
      toast.error('Please save the note first before adding media')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('media', file)
      })

      const response = await axios.post(`/notes/${note._id}/media`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          ...getPasswordHeaders()
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      // Update media state with response
      setUploadedImages(response.data.note.images || [])
      setUploadedVideo(response.data.note.video || [])
      setUploadedPDFs(response.data.note.attachments || [])
      
      toast.success(`Media uploaded successfully`)
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error(error.response?.data?.message || 'Failed to upload media')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle media deletion
  const handleDeleteMedia = async (mediaId) => {
    if (!note || !note._id) return

    try {
      // URL-encode mediaId in case it contains slashes (from Cloudinary folder paths)
      const encodedMediaId = encodeURIComponent(mediaId)
      const response = await axios.delete(`/notes/${note._id}/media/${encodedMediaId}`, {
        headers: getPasswordHeaders()
      })
      
      setUploadedImages(response.data.note.images || [])
      setUploadedVideo(response.data.note.video || [])
      setUploadedPDFs(response.data.note.attachments || [])
      
      toast.success('Media deleted successfully')
    } catch (error) {
      console.error('Error deleting media:', error)
      toast.error(error.response?.data?.message || 'Failed to delete media')
    }
  }

  const canEdit = isAdmin || isNew || isOwner(note)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{isNew ? 'New Note' : 'Edit Note'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="input-field text-lg"
              maxLength={255}
              disabled={!canEdit}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/255</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="input-field min-h-64 p-4 font-mono text-sm resize-none"
              disabled={!canEdit}
            />
            <p className="text-xs text-gray-500 mt-1">{content.length} characters</p>
          </div>

          <div>
            <button 
              onClick={() => setShowPlaceholderModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Insert placeholders
            </button>
          </div>

          {/* Media Upload Section */}
          {canEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">📸 Media & Attachments</label>
              
              {isNew && (
                <p className="text-xs text-amber-600 mb-3 p-2 bg-amber-50 rounded border border-amber-200">
                  💡 Create and save your note first, then you can add images, videos, and attachments.
                </p>
              )}
              
              {/* Upload Input - only show if note exists */}
              {!isNew && (
                <>
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <label onClick={e => e.stopPropagation()} className="flex-1 cursor-pointer">
                        <div onClick={e => e.stopPropagation()} className={`border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:bg-blue-50 transition-colors ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}>
                          <FiUpload className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Click to upload media</p>
                          <p className="text-xs text-gray-500 mt-1">Images: JPG, PNG, WEBP</p>
                          <p className="text-xs text-gray-500">Videos: MP4, MOV, WEBM</p>
                          <p className="text-xs text-gray-500">Attachments: PDF</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,application/pdf"
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.preventDefault(); handleMediaSelect(e) }}
                          disabled={uploading || !canEdit}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {uploading && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <FiLoader className="w-4 h-4 animate-spin" /> Uploading media... {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">📸 Images ({uploadedImages.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedImages.map((img) => (
                          <div key={img.publicId} className="relative group">
                            <img 
                              src={img.url} 
                              alt="Uploaded" 
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => handleDeleteMedia(img.publicId)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete image"
                            >
                              <FiTrash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos List */}
                  {uploadedVideo && uploadedVideo.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">🎥 Videos ({uploadedVideo.length})</p>
                      <div className="space-y-2">
                        {uploadedVideo.map((vid, index) => (
                          <div key={vid.publicId || index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="text-sm text-gray-700">Video {index + 1}</span>
                            <button
                              onClick={() => handleDeleteMedia(vid.publicId)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Delete video"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDFs/Attachments List */}
                  {uploadedPDFs && uploadedPDFs.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">📎 Attachments ({uploadedPDFs.length})</p>
                      <p className="text-xs text-gray-500 mb-3">
                        💡 Rename attachments with placeholders: <code className="bg-gray-100 px-1">document_{`{RECIPIENT_EMAIL}`}.pdf</code> | <code className="bg-gray-100 px-1">contract_{`{CURRENT_DATE}`}.pdf</code> | <code className="bg-gray-100 px-1">report_{`{RECIPIENT_NAME}`}.docx</code>
                      </p>
                      <div className="space-y-2">
                        {uploadedPDFs.map((pdf, index) => (
                          <div key={pdf.publicId || index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2">
                              <FiFile className="w-4 h-4 text-blue-600" />
                              {/* allow renaming filename */}
                              <input
                                type="text"
                                value={pdf.filename || `Attachment ${index + 1}`}
                                onChange={(e) => {
                                  const newName = e.target.value
                                  setUploadedPDFs(prev => prev.map(p => {
                                    if (p.publicId === pdf.publicId) {
                                      return { ...p, filename: newName }
                                    }
                                    return p
                                  }))
                                }}
                                className="text-sm text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-500"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteMedia(pdf.publicId)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Delete attachment"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!canEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                ℹ️ You cannot edit this note. Only admins can edit and delete existing notes.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Placeholder Modal */}
      {showPlaceholderModal && (
        <PlaceholderInsertModal
          onClose={() => setShowPlaceholderModal(false)}
          onInsert={(placeholder) => {
            setContent(content + placeholder)
            setShowPlaceholderModal(false)
          }}
        />
      )}
    </div>
  )
}