





import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiTrash2, FiEdit2, FiArchive, FiShare2, FiLoader } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import { DateTime } from 'luxon'
import NoteEditor from './NoteEditor'
import NotepadPasswordModal from '../../components/common/NotepadPasswordModal'
import SendNoteModal from '../../components/common/SendNoteModal'

export default function Notepad({ user, isAdminMode = false }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isNewNote, setIsNewNote] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordUnlocked, setPasswordUnlocked] = useState(false)
  const [passwordCheckDone, setPasswordCheckDone] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [noteToSend, setNoteToSend] = useState(null)
  
  // Loading states for async button actions (Delete and Archive)
  const [archivingNoteId, setArchivingNoteId] = useState(null)
  const [deletingNoteId, setDeletingNoteId] = useState(null)
  const [sendingNoteId, setSendingNoteId] = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)

  // isAdminMode=true means user is in admin dashboard (allow all admin features)
  // isAdminMode=false means user is in regular dashboard (check if user.adminConfig.isAdmin)
  const isAdmin = isAdminMode || user?.adminConfig?.isAdmin === true
  const [hasNotepadPassword, setHasNotepadPassword] = useState(false)

  // Check password on component mount
  useEffect(() => {
    // Perform password check
    const checkPassword = async () => {
      try {
        // Check if user has notepad password set in their config
        const passwordIsSet = !!user?.adminConfig?.notepadPassword
        const passwordVerified = sessionStorage.getItem('notepadPasswordVerified')
        
        if (passwordVerified === 'true') {
          // Password was already verified in this session
          setPasswordUnlocked(true)
          setIsPasswordModalOpen(false)
          setPasswordCheckDone(true)
          setHasNotepadPassword(passwordIsSet)
          fetchNotes()
        } else if (passwordIsSet) {
          // Password is set but not verified - show modal immediately
          setPasswordUnlocked(false)
          setIsPasswordModalOpen(true)
          setPasswordCheckDone(true)
          setHasNotepadPassword(true)
          setLoading(false)
        } else {
          // No password set - load notes directly
          setPasswordUnlocked(true)
          setIsPasswordModalOpen(false)
          setPasswordCheckDone(true)
          setHasNotepadPassword(false)
          fetchNotes()
        }
      } catch (error) {
        console.error('Error checking password status:', error)
        // Fallback: assume no password if check fails
        setPasswordUnlocked(true)
        setIsPasswordModalOpen(false)
        setPasswordCheckDone(true)
        setHasNotepadPassword(false)
        fetchNotes()
      }
    }

    // Run check immediately
    checkPassword()
  }, [])

  useEffect(() => {
    // Refetch notes when toggling archived or search changes
    // But only if password check is done AND (no password exists OR password is unlocked)
    if (passwordCheckDone && (!hasNotepadPassword || passwordUnlocked)) {
      fetchNotes()
    }
  }, [showArchived, searchQuery, passwordCheckDone, hasNotepadPassword, passwordUnlocked])

  // Helper to get password verification headers
  const getPasswordHeaders = () => {
    const headers = {}
    if (hasNotepadPassword && passwordUnlocked) {
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

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/notes', {
        params: { archived: showArchived, search: searchQuery || undefined },
        headers: getPasswordHeaders()
      })
      setNotes(response.data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
      // If password protection error, show modal
      if (error.response?.status === 403 && error.response?.data?.requiresPassword) {
        setPasswordUnlocked(false)
        setIsPasswordModalOpen(true)
      } else {
        // display any server-provided message for easier debugging
        const msg = error.response?.data?.message || error.message || 'Failed to load notes'
        toast.error(`Failed to load notes: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = () => {
    setSelectedNote(null)
    setIsNewNote(true)
    setIsEditorOpen(true)
  }

  const handleEditNote = (note) => {
    // Allow admins or the note owner to edit; otherwise show permission message
    if (!isAdmin && !isOwner(note)) {
      toast.error('You do not have permission to edit this note')
      return
    }
    setEditingNoteId(note._id)
    setSelectedNote(note)
    setIsNewNote(false)
    setIsEditorOpen(true)
  }

  const handleDeleteNote = async (noteId) => {
    // Allow admins or the note owner to delete; otherwise show permission message
    const note = notes.find(n => n._id === noteId)
    if (!note) return
    if (!isAdmin && !isOwner(note)) {
      toast.error('You do not have permission to delete this note')
      return
    }
    if (!window.confirm('Are you sure you want to delete this note?')) return
    setDeletingNoteId(noteId)
    try {
      await axios.delete(`/notes/${noteId}`, { headers: getPasswordHeaders() })
      toast.success('Note deleted')
      setNotes(notes.filter(n => n._id !== noteId))
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Failed to delete note')
    } finally {
      setDeletingNoteId(null)
    }
  }

  const handleArchiveNote = async (note) => {
    // Allow admins or the note owner to archive/unarchive; otherwise show permission message
    if (!isAdmin && !isOwner(note)) {
      toast.error('You do not have permission to archive/unarchive this note')
      return
    }
    setArchivingNoteId(note._id)
    try {
      const response = await axios.put(`/notes/${note._id}/archive`, {
        isArchived: !note.isArchived
      }, { headers: getPasswordHeaders() })
      toast.success(note.isArchived ? 'Note unarchived' : 'Note archived')
      if (showArchived) {
        setNotes(notes.filter(n => n._id !== note._id))
      } else {
        setNotes(notes.map(n => n._id === note._id ? response.data.note : n))
      }
    } catch (error) {
      console.error('Error archiving note:', error)
      toast.error('Failed to archive note')
    } finally {
      setArchivingNoteId(null)
    }
  }

  const handleSaveNote = async (noteData) => {
    try {
      const headers = getPasswordHeaders()
      if (isNewNote) {
        const response = await axios.post('/notes', noteData, { headers })
        setNotes([response.data.note, ...notes])
        toast.success('Note created')
        // Dispatch event to refresh scheduled notes widget
        window.dispatchEvent(new Event('noteCreated'))
      } else {
        const response = await axios.put(`/notes/${selectedNote._id}`, noteData, { headers })
        setNotes(notes.map(n => n._id === selectedNote._id ? response.data.note : n))
        toast.success('Note saved')
        // Dispatch event to refresh scheduled notes widget
        window.dispatchEvent(new Event('noteUpdated'))
      }
      setIsEditorOpen(false)
      setSelectedNote(null)
      setEditingNoteId(null)
    } catch (error) {
      console.error('Error saving note:', error)
      const msg = error.response?.data?.message || error.message || 'Failed to save note'
      toast.error(`Failed to save note: ${msg}`)
      setEditingNoteId(null)
    }
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setSelectedNote(null)
    setEditingNoteId(null)
  }

  const handleSendNote = (note) => {
    setSendingNoteId(note._id)
    setNoteToSend(note)
    setIsSendModalOpen(true)
  }

  const handleCloseSendModal = () => {
    setIsSendModalOpen(false)
    setNoteToSend(null)
    setSendingNoteId(null)
  }

  // Format createdAt timestamp in user's timezone
  // CRITICAL: Convert UTC timestamp to user's local timezone before display
  const formatCreatedDate = (createdAtUTC, timezone) => {
    try {
      if (!createdAtUTC) return 'Unknown date'
      
      const tz = timezone || user?.preferredTimezone || 'UTC'
      
      // Parse UTC timestamp and convert to user's timezone
      const dt = DateTime.fromISO(createdAtUTC, { zone: 'UTC' })
        .setZone(tz)
      
      if (!dt.isValid) {
        console.warn('Invalid created date:', createdAtUTC)
        return 'Unknown date'
      }
      
      return dt.toFormat('MMM d, yyyy')
    } catch (error) {
      console.error('Error formatting created date:', error)
      return 'Unknown date'
    }
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const colorMap = {
    yellow: 'bg-yellow-100 border-yellow-300',
    blue: 'bg-blue-100 border-blue-300',
    red: 'bg-red-100 border-red-300',
    green: 'bg-green-100 border-green-300',
    purple: 'bg-purple-100 border-purple-300',
    pink: 'bg-pink-100 border-pink-300',
    orange: 'bg-orange-100 border-orange-300'
  }

  const textColorMap = {
    yellow: 'text-yellow-900',
    blue: 'text-blue-900',
    red: 'text-red-900',
    green: 'text-green-900',
    purple: 'text-purple-900',
    pink: 'text-pink-900',
    orange: 'text-orange-900'
  }

  return (
    <div className="space-y-6">
      {/* Show spinner while password check is in progress */}
      {!passwordCheckDone && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Show password modal if check is done and password exists but not unlocked */}
      {passwordCheckDone && hasNotepadPassword && !passwordUnlocked && (
        <NotepadPasswordModal
          isOpen={true}
          onClose={() => {
            // User can't close without entering password
          }}
          onSuccess={() => {
            setPasswordUnlocked(true)
            setIsPasswordModalOpen(false)
          }}
        />
      )}

      {/* Show notes content only after password check is done and (no password OR password unlocked) */}
      {passwordCheckDone && (!hasNotepadPassword || passwordUnlocked) && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notepad</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin
                  ? 'Create and manage your notes'
                  : 'View and create notes'}
              </p>
            </div>
            <button onClick={handleCreateNote} className="btn-primary flex items-center gap-2">
              <FiPlus className="w-5 h-5" /> New Note
            </button>
          </div>

          {/* Controls */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
                showArchived
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              {showArchived ? 'Archived' : 'Active'}
            </button>
          </div>

          {/* Notes Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {searchQuery
                  ? 'No notes found matching your search'
                  : showArchived
                  ? 'No archived notes'
                  : 'No notes yet. Create your first note!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
              {filteredNotes.map((note) => (
                <div
                  key={note._id}
                  className={`card p-5 border-2 ${colorMap[note.color] || colorMap.yellow} min-h-60 flex flex-col transition-all hover:shadow-lg group`}
                >
                  <h3 className={`font-semibold text-lg mb-3 line-clamp-2 ${textColorMap[note.color] || textColorMap.yellow}`}>
                    {note.title}
                  </h3>
                  <p className={`text-sm flex-1 line-clamp-6 whitespace-pre-wrap overflow-hidden ${textColorMap[note.color] || textColorMap.yellow}`}>
                    {note.content || '(No content)'}
                  </p>
                  
                  {/* Media indicators */}
                  {(note.images?.length > 0 || (Array.isArray(note.video) && note.video.length > 0)) && (
                    <div className="mt-2 pt-2 border-t border-current text-xs opacity-70 flex gap-2">
                      {note.images?.length > 0 && (
                        <span>📸 {note.images.length} image{note.images.length !== 1 ? 's' : ''}</span>
                      )}
                      {Array.isArray(note.video) && note.video.length > 0 && (
                        <span>🎥 {note.video.length} video{note.video.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}
                  
                  {note.scheduledUTC && (
                    <p className="text-xs mt-3 pt-3 border-t border-current opacity-70">
                      📅 Scheduled: {note.scheduleDate} at {note.scheduledTime || '00:00'} {note.timezone && `(${note.timezone})`}
                    </p>
                  )}
                  <p className="text-xs mt-2 opacity-50">
                    📅 Created: {formatCreatedDate(note.createdAt, note.timezone)}
                  </p>

                  {/* Action buttons: Send always available; Edit/Archive/Delete for owner or admin */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-current">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSendNote(note) }}
                      disabled={sendingNoteId === note._id}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-20 transition-colors text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingNoteId === note._id ? (
                        <>
                          <FiLoader className="w-4 h-4 animate-spin" /> Sending
                        </>
                      ) : (
                        <>
                          <FiShare2 className="w-4 h-4" /> Send
                        </>
                      )}
                    </button>

                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditNote(note) }}
                        disabled={editingNoteId === note._id}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingNoteId === note._id ? (
                          <>
                            <FiLoader className="w-4 h-4 animate-spin" /> Editing
                          </>
                        ) : (
                          <>
                            <FiEdit2 className="w-4 h-4" /> Edit
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchiveNote(note) }}
                        disabled={archivingNoteId === note._id}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {archivingNoteId === note._id ? (
                          <>
                            <FiLoader className="w-4 h-4 animate-spin" /> Archiving
                          </>
                        ) : (
                          <>
                            <FiArchive className="w-4 h-4" /> Archive
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id) }}
                        disabled={deletingNoteId === note._id}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-red-600 hover:bg-opacity-20 transition-colors text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingNoteId === note._id ? (
                          <>
                            <FiLoader className="w-4 h-4 animate-spin" /> Deleting
                          </>
                        ) : (
                          <>
                            <FiTrash2 className="w-4 h-4" /> Delete
                          </>
                        )}
                      </button>
                    </>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note Editor */}
          {isEditorOpen && (
            <NoteEditor
              note={selectedNote}
              isNew={isNewNote}
              onSave={handleSaveNote}
              onClose={handleCloseEditor}
              isAdmin={isAdmin}
              user={user}
              passwordUnlocked={passwordUnlocked}
            />
          )}

          {/* Send Note Modal */}
          <SendNoteModal
            isOpen={isSendModalOpen}
            onClose={handleCloseSendModal}
            note={noteToSend}
          />
        </>
      )}

      {/* Loading state while checking password */}
      {!passwordCheckDone && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  )
}
















// import { useState, useEffect } from 'react'
// import { FiPlus, FiSearch, FiTrash2, FiEdit2, FiArchive } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'
// import NoteEditor from './NoteEditor'
// import NotepadPasswordModal from '../../components/common/NotepadPasswordModal'

// export default function Notepad({ user }) {
//   const [notes, setNotes] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [searchQuery, setSearchQuery] = useState('')
//   const [selectedNote, setSelectedNote] = useState(null)
//   const [isEditorOpen, setIsEditorOpen] = useState(false)
//   const [isNewNote, setIsNewNote] = useState(false)
//   const [showArchived, setShowArchived] = useState(false)
//   const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
//   const [passwordUnlocked, setPasswordUnlocked] = useState(false)
//   const [passwordCheckDone, setPasswordCheckDone] = useState(false)

//   const isAdmin = user?.adminConfig?.isAdmin === true
//   const [hasNotepadPassword, setHasNotepadPassword] = useState(false)

//   // Check password on component mount
//   useEffect(() => {
//     // Perform password check
//     const checkPassword = async () => {
//       try {
//         // First, fetch from backend to get the current password status
//         const statusResponse = await axios.get('/admin/notepad-password/check')
//         const passwordIsSet = statusResponse.data.hasPassword

//         const passwordVerified = sessionStorage.getItem('notepadPasswordVerified')
        
//         if (passwordVerified === 'true') {
//           // Password was already verified in this session
//           setPasswordUnlocked(true)
//           setIsPasswordModalOpen(false)
//           setPasswordCheckDone(true)
//           setHasNotepadPassword(passwordIsSet)
//           fetchNotes()
//         } else if (passwordIsSet) {
//           // Password is set but not verified - show modal immediately
//           setPasswordUnlocked(false)
//           setIsPasswordModalOpen(true)
//           setPasswordCheckDone(true)
//           setHasNotepadPassword(true)
//           setLoading(false)
//         } else {
//           // No password set - load notes directly
//           setPasswordUnlocked(true)
//           setIsPasswordModalOpen(false)
//           setPasswordCheckDone(true)
//           setHasNotepadPassword(false)
//           fetchNotes()
//         }
//       } catch (error) {
//         console.error('Error checking password status:', error)
//         // Fallback: assume no password if check fails
//         setPasswordUnlocked(true)
//         setIsPasswordModalOpen(false)
//         setPasswordCheckDone(true)
//         setHasNotepadPassword(false)
//         fetchNotes()
//       }
//     }

//     // Run check immediately
//     checkPassword()
//   }, [])

//   useEffect(() => {
//     // Refetch notes when toggling archived or search changes
//     // But only if password check is done AND (no password exists OR password is unlocked)
//     if (passwordCheckDone && (!hasNotepadPassword || passwordUnlocked)) {
//       fetchNotes()
//     }
//   }, [showArchived, searchQuery, passwordCheckDone, hasNotepadPassword, passwordUnlocked])

//   // Helper to get password verification headers
//   const getPasswordHeaders = () => {
//     const headers = {}
//     if (hasNotepadPassword && passwordUnlocked) {
//       headers['x-notepad-password-verified'] = 'true'
//     }
//     return headers
//   }

//   const fetchNotes = async () => {
//     try {
//       setLoading(true)
//       const response = await axios.get('/notes', {
//         params: { archived: showArchived, search: searchQuery || undefined },
//         headers: getPasswordHeaders()
//       })
//       setNotes(response.data.notes || [])
//     } catch (error) {
//       console.error('Error fetching notes:', error)
//       // If password protection error, show modal
//       if (error.response?.status === 403 && error.response?.data?.requiresPassword) {
//         setPasswordUnlocked(false)
//         setIsPasswordModalOpen(true)
//       } else {
//         toast.error('Failed to load notes')
//       }
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleCreateNote = () => {
//     setSelectedNote(null)
//     setIsNewNote(true)
//     setIsEditorOpen(true)
//   }

//   const handleEditNote = (note) => {
//     if (!isAdmin) return // Non-admin cannot edit
//     setSelectedNote(note)
//     setIsNewNote(false)
//     setIsEditorOpen(true)
//   }

//   const handleDeleteNote = async (noteId) => {
//     if (!isAdmin) return
//     if (!window.confirm('Are you sure you want to delete this note?')) return
//     try {
//       await axios.delete(`/notes/${noteId}`, { headers: getPasswordHeaders() })
//       toast.success('Note deleted')
//       setNotes(notes.filter(n => n._id !== noteId))
//     } catch (error) {
//       console.error('Error deleting note:', error)
//       toast.error('Failed to delete note')
//     }
//   }

//   const handleArchiveNote = async (note) => {
//     if (!isAdmin) return
//     try {
//       const response = await axios.put(`/notes/${note._id}/archive`, {
//         isArchived: !note.isArchived
//       }, { headers: getPasswordHeaders() })
//       toast.success(note.isArchived ? 'Note unarchived' : 'Note archived')
//       if (showArchived) {
//         setNotes(notes.filter(n => n._id !== note._id))
//       } else {
//         setNotes(notes.map(n => n._id === note._id ? response.data.note : n))
//       }
//     } catch (error) {
//       console.error('Error archiving note:', error)
//       toast.error('Failed to archive note')
//     }
//   }

//   const handleSaveNote = async (noteData) => {
//     try {
//       const headers = getPasswordHeaders()
//       if (isNewNote) {
//         const response = await axios.post('/notes', noteData, { headers })
//         setNotes([response.data.note, ...notes])
//         toast.success('Note created')
//       } else {
//         const response = await axios.put(`/notes/${selectedNote._id}`, noteData, { headers })
//         setNotes(notes.map(n => n._id === selectedNote._id ? response.data.note : n))
//         toast.success('Note saved')
//       }
//       setIsEditorOpen(false)
//       setSelectedNote(null)
//     } catch (error) {
//       console.error('Error saving note:', error)
//       toast.error('Failed to save note')
//     }
//   }

//   const filteredNotes = notes.filter(note =>
//     note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     note.content.toLowerCase().includes(searchQuery.toLowerCase())
//   )

//   const colorMap = {
//     yellow: 'bg-yellow-100 border-yellow-300',
//     blue: 'bg-blue-100 border-blue-300',
//     red: 'bg-red-100 border-red-300',
//     green: 'bg-green-100 border-green-300',
//     purple: 'bg-purple-100 border-purple-300',
//     pink: 'bg-pink-100 border-pink-300',
//     orange: 'bg-orange-100 border-orange-300'
//   }

//   const textColorMap = {
//     yellow: 'text-yellow-900',
//     blue: 'text-blue-900',
//     red: 'text-red-900',
//     green: 'text-green-900',
//     purple: 'text-purple-900',
//     pink: 'text-pink-900',
//     orange: 'text-orange-900'
//   }

//   return (
//     <div className="space-y-6">
//       {/* Show spinner while password check is in progress */}
//       {!passwordCheckDone && (
//         <div className="flex justify-center py-12">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//         </div>
//       )}

//       {/* Show password modal if check is done and password exists but not unlocked */}
//       {passwordCheckDone && hasNotepadPassword && !passwordUnlocked && (
//         <NotepadPasswordModal
//           isOpen={true}
//           onClose={() => {
//             // User can't close without entering password
//           }}
//           onSuccess={() => {
//             setPasswordUnlocked(true)
//             setIsPasswordModalOpen(false)
//           }}
//         />
//       )}

//       {/* Show notes content only after password check is done and (no password OR password unlocked) */}
//       {passwordCheckDone && (!hasNotepadPassword || passwordUnlocked) && (
//         <>
//           {/* Header */}
//           <div className="flex justify-between items-center">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">Notepad</h1>
//               <p className="text-gray-600 mt-1">
//                 {isAdmin
//                   ? 'Create and manage your notes'
//                   : 'View and create notes'}
//               </p>
//             </div>
//             <button onClick={handleCreateNote} className="btn-primary flex items-center gap-2">
//               <FiPlus className="w-5 h-5" /> New Note
//             </button>
//           </div>

//           {/* Controls */}
//           <div className="flex gap-4 flex-wrap">
//             <div className="flex-1 min-w-64 relative">
//               <FiSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//               <input
//                 type="text"
//                 placeholder="Search notes..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="input-field pl-10"
//               />
//             </div>
//             <button
//               onClick={() => setShowArchived(!showArchived)}
//               className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
//                 showArchived
//                   ? 'bg-primary-600 text-white hover:bg-primary-700'
//                   : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
//               }`}
//             >
//               {showArchived ? 'Archived' : 'Active'}
//             </button>
//           </div>

//           {/* Notes Grid */}
//           {loading ? (
//             <div className="flex justify-center py-12">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//             </div>
//           ) : filteredNotes.length === 0 ? (
//             <div className="text-center py-12">
//               <p className="text-gray-500 text-lg">
//                 {searchQuery
//                   ? 'No notes found matching your search'
//                   : showArchived
//                   ? 'No archived notes'
//                   : 'No notes yet. Create your first note!'}
//               </p>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
//               {filteredNotes.map((note) => (
//                 <div
//                   key={note._id}
//                   className={`card p-5 border-2 ${colorMap[note.color] || colorMap.yellow} min-h-60 flex flex-col transition-all hover:shadow-lg`}
//                 >
//                   <h3 className={`font-semibold text-lg mb-3 line-clamp-2 ${textColorMap[note.color] || textColorMap.yellow}`}>
//                     {note.title}
//                   </h3>
//                   <p className={`text-sm flex-1 line-clamp-6 whitespace-pre-wrap overflow-hidden ${textColorMap[note.color] || textColorMap.yellow}`}>
//                     {note.content || '(No content)'}
//                   </p>
//                   {note.scheduledUTC && (
//                     <p className="text-xs mt-3 pt-3 border-t border-current opacity-70">
//                       📅 {new Date(note.scheduledUTC).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
//                       {note.scheduledTime && ` at ${note.scheduledTime}`} {note.timezone && `(${note.timezone})`}
//                     </p>
//                   )}
//                   <p className="text-xs mt-2 opacity-50">
//                     {new Date(note.createdAt).toLocaleDateString()}
//                   </p>

//                   {/* Admin-only buttons */}
//                   {isAdmin && (
//                     <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity pt-3 border-t border-current">
//                       <button
//                         onClick={(e) => { e.stopPropagation(); handleEditNote(note) }}
//                         className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-10 transition-colors"
//                       >
//                         <FiEdit2 className="w-4 h-4" /> Edit
//                       </button>
//                       <button
//                         onClick={(e) => { e.stopPropagation(); handleArchiveNote(note) }}
//                         className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-10 transition-colors"
//                       >
//                         <FiArchive className="w-4 h-4" /> Archive
//                       </button>
//                       <button
//                         onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id) }}
//                         className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-red-600 hover:bg-opacity-20 transition-colors text-red-600"
//                       >
//                         <FiTrash2 className="w-4 h-4" /> Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Note Editor */}
//           {isEditorOpen && (
//             <NoteEditor
//               note={selectedNote}
//               isNew={isNewNote}
//               onSave={handleSaveNote}
//               onClose={() => { setIsEditorOpen(false); setSelectedNote(null) }}
//               isAdmin={isAdmin}
//               user={user}
//             />
//           )}
//         </>
//       )}

//       {/* Loading state while checking password */}
//       {!passwordCheckDone && (
//         <div className="flex justify-center py-12">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//         </div>
//       )}
//     </div>
//   )
// }


// import { useState, useEffect } from 'react'
// import { FiPlus, FiSearch, FiTrash2, FiEdit2, FiArchive } from 'react-icons/fi'
// import axios from 'axios'
// import toast from 'react-hot-toast'
// import NoteEditor from './NoteEditor'

// export default function Notepad({ user }) {
//   const [notes, setNotes] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [searchQuery, setSearchQuery] = useState('')
//   const [selectedNote, setSelectedNote] = useState(null)
//   const [isEditorOpen, setIsEditorOpen] = useState(false)
//   const [isNewNote, setIsNewNote] = useState(false)
//   const [showArchived, setShowArchived] = useState(false)

//   const isAdmin = user?.adminConfig?.isAdmin === true

//   // Fetch notes
//   useEffect(() => {
//     fetchNotes()
//   }, [showArchived])

//   const fetchNotes = async () => {
//     try {
//       setLoading(true)
//       const response = await axios.get('/notes', {
//         params: {
//           archived: showArchived,
//           search: searchQuery || undefined
//         }
//       })
//       setNotes(response.data.notes || [])
//     } catch (error) {
//       console.error('Error fetching notes:', error)
//       toast.error('Failed to load notes')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleCreateNote = () => {
//     setSelectedNote(null)
//     setIsNewNote(true)
//     setIsEditorOpen(true)
//   }

//   const handleEditNote = (note) => {
//     // Allow admins to edit existing notes
//     // Allow all users to view/open existing notes in read-only mode
//     setSelectedNote(note)
//     setIsNewNote(false)
//     setIsEditorOpen(true)
//   }

//   const handleDeleteNote = async (noteId) => {
//     if (!window.confirm('Are you sure you want to delete this note?')) return

//     try {
//       await axios.delete(`/notes/${noteId}`)
//       toast.success('Note deleted')
//       setNotes(notes.filter(n => n._id !== noteId))
//     } catch (error) {
//       console.error('Error deleting note:', error)
//       toast.error('Failed to delete note')
//     }
//   }

//   const handleArchiveNote = async (note) => {
//     try {
//       const response = await axios.put(`/notes/${note._id}/archive`, {
//         isArchived: !note.isArchived
//       })
//       toast.success(note.isArchived ? 'Note unarchived' : 'Note archived')
      
//       // Update the notes list
//       if (showArchived) {
//         setNotes(notes.filter(n => n._id !== note._id))
//       } else {
//         setNotes(notes.map(n => n._id === note._id ? response.data.note : n))
//       }
//     } catch (error) {
//       console.error('Error archiving note:', error)
//       toast.error('Failed to archive note')
//     }
//   }

//   const handleSaveNote = async (noteData) => {
//     try {
//       if (isNewNote) {
//         const response = await axios.post('/notes', noteData)
//         setNotes([response.data.note, ...notes])
//         toast.success('Note created')
//       } else {
//         const response = await axios.put(`/notes/${selectedNote._id}`, noteData)
//         setNotes(notes.map(n => n._id === selectedNote._id ? response.data.note : n))
//         toast.success('Note saved')
//       }
//       setIsEditorOpen(false)
//       setSelectedNote(null)
//     } catch (error) {
//       console.error('Error saving note:', error)
//       toast.error('Failed to save note')
//     }
//   }

//   const filteredNotes = notes.filter(note =>
//     note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     note.content.toLowerCase().includes(searchQuery.toLowerCase())
//   )

//   const colorMap = {
//     yellow: 'bg-yellow-100 border-yellow-300',
//     blue: 'bg-blue-100 border-blue-300',
//     red: 'bg-red-100 border-red-300',
//     green: 'bg-green-100 border-green-300',
//     purple: 'bg-purple-100 border-purple-300',
//     pink: 'bg-pink-100 border-pink-300',
//     orange: 'bg-orange-100 border-orange-300'
//   }

//   const textColorMap = {
//     yellow: 'text-yellow-900',
//     blue: 'text-blue-900',
//     red: 'text-red-900',
//     green: 'text-green-900',
//     purple: 'text-purple-900',
//     pink: 'text-pink-900',
//     orange: 'text-orange-900'
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">Notepad</h1>
//           <p className="text-gray-600 mt-1">
//             {isAdmin ? 'Create and manage your notes' : 'View and create notes (admins can edit and delete)'}
//           </p>
//         </div>
//         <button
//           onClick={handleCreateNote}
//           className="btn-primary flex items-center gap-2"
//         >
//           <FiPlus className="w-5 h-5" />
//           New Note
//         </button>
//       </div>

//       {/* Controls */}
//       <div className="flex gap-4 flex-wrap">
//         <div className="flex-1 min-w-64">
//           <div className="relative">
//             <FiSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//             <input
//               type="text"
//               placeholder="Search notes..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="input-field pl-10"
//             />
//           </div>
//         </div>
//         <button
//           onClick={() => setShowArchived(!showArchived)}
//           className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
//             showArchived
//               ? 'bg-primary-600 text-white hover:bg-primary-700'
//               : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
//           }`}
//         >
//           {showArchived ? 'Archived' : 'Active'}
//         </button>
//       </div>

//       {/* Notes Grid */}
//       {loading ? (
//         <div className="flex justify-center py-12">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//         </div>
//       ) : filteredNotes.length === 0 ? (
//         <div className="text-center py-12">
//           <p className="text-gray-500 text-lg">
//             {searchQuery ? 'No notes found matching your search' : showArchived ? 'No archived notes' : 'No notes yet. Create your first note!'}
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
//           {filteredNotes.map((note) => (
//             <div
//               key={note._id}
//               className={`card p-5 border-2 ${colorMap[note.color] || colorMap.yellow} min-h-60 flex flex-col transition-all hover:shadow-lg group ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
//               onClick={() => isAdmin && handleEditNote(note)}
//             >
//               {/* Title */}
//               <h3 className={`font-semibold text-lg mb-3 line-clamp-2 ${textColorMap[note.color] || textColorMap.yellow}`}>
//                 {note.title}
//               </h3>

//               {/* Content Preview */}
//               <p className={`text-sm flex-1 line-clamp-6 whitespace-pre-wrap overflow-hidden ${textColorMap[note.color] || textColorMap.yellow}`}>
//                 {note.content || '(No content)'}
//               </p>

//               {/* Schedule info */}
//               {note.scheduleDate && (
//                 <p className="text-xs mt-3 pt-3 border-t border-current opacity-70">
//                   📅 {new Date(note.scheduleDate).toLocaleDateString()}
//                   {note.scheduledTime && ` at ${note.scheduledTime}`}
//                 </p>
//               )}

//               {/* Created date */}
//               <p className="text-xs mt-2 opacity-50">
//                 {new Date(note.createdAt).toLocaleDateString()}
//               </p>

//               {/* Admin actions - only visible to admins */}
//               {isAdmin && (
//                 <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity pt-3 border-t border-current">
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation()
//                       handleEditNote(note)
//                     }}
//                     className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-10 transition-colors"
//                   >
//                     <FiEdit2 className="w-4 h-4" />
//                     Edit
//                   </button>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation()
//                       handleArchiveNote(note)
//                     }}
//                     className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-black hover:bg-opacity-10 transition-colors"
//                   >
//                     <FiArchive className="w-4 h-4" />
//                     Archive
//                   </button>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation()
//                       handleDeleteNote(note._id)
//                     }}
//                     className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium hover:bg-red-600 hover:bg-opacity-20 transition-colors text-red-600"
//                   >
//                     <FiTrash2 className="w-4 h-4" />
//                     Delete
//                   </button>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Note Editor Modal */}
//       {isEditorOpen && (
//         <NoteEditor
//           note={selectedNote}
//           isNew={isNewNote}
//           onSave={handleSaveNote}
//           onClose={() => {
//             setIsEditorOpen(false)
//             setSelectedNote(null)
//           }}
//           isAdmin={isAdmin}
//         />
//       )}
//     </div>
//   )
// }