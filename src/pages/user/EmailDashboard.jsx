import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import EmailCompose from './EmailCompose';
import EmailSettings from './EmailSettings';

// ============================================================
// DEFENSIVE HELPER: Safely convert FileList or any array-like
// object to a real JavaScript array
// ============================================================
function safeConvertToArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  
  // Try converting array-like objects (FileList, etc)
  try {
    // Check if it has length property and is iterable
    if (typeof obj === 'object' && 'length' in obj) {
      return Array.from(obj);
    }
  } catch (e) {
    console.warn('[EmailDashboard] Failed to convert to array:', e.message);
  }
  
  return [];
}

async function waitForSocketConnection(socket, timeoutMs = 2500) {
  if (!socket) return false;
  if (socket.connected) return true;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(socket.connected);
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    const onConnect = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);
    socket.connect();
  });
}

export default function EmailDashboard({ user }) {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [smtpLogs, setSmtpLogs] = useState([]);
  const [activeLogTab, setActiveLogTab] = useState('email'); // 'email' or 'smtp'
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingSmtpLogs, setLoadingSmtpLogs] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const [sendEvents, setSendEvents] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [liveSendInProgress, setLiveSendInProgress] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState('All');
  const [emailFromDate, setEmailFromDate] = useState('');
  const [emailToDate, setEmailToDate] = useState('');
  const [emailPage, setEmailPage] = useState(1);
  const [emailLimit, setEmailLimit] = useState(25);
  const [emailTotal, setEmailTotal] = useState(0);
  const [emailTotalPages, setEmailTotalPages] = useState(0);
  const activeSessionIdRef = useRef(null);
  const activeLogTabRef = useRef(activeLogTab);
  const emailPageRef = useRef(emailPage);
  const emailLimitRef = useRef(emailLimit);
  const socketRef = useRef(null);
  const hasLiveSocket = useRef(false);

  const normalizeRecipients = (recipients) => {
    if (Array.isArray(recipients)) return recipients;
    if (typeof recipients === 'string') {
      return recipients.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const mergeLiveActivityRecord = (prevLogs, payload) => {
    const lastEmail = payload.lastEmail || '';
    const normalizedTo = normalizeRecipients(payload.to || [lastEmail]);
    const existingIndex = prevLogs.findIndex((record) => {
      const recordTo = normalizeRecipients(record.to);
      return recordTo.some((email) => email.toLowerCase() === lastEmail.toLowerCase());
    });

    const liveRecord = {
      to: normalizedTo.length ? normalizedTo : [lastEmail],
      bcc: normalizeRecipients(payload.bcc || []),
      subject: payload.subject || `(live email activity) ${payload.lastResult || 'processing'}`,
      sentAt: new Date(payload.timestamp || Date.now()).toISOString(),
      smtpUsed: payload.smtpUsed || 'live',
      status: payload.lastResult === 'sent' ? 'Success' : payload.lastResult === 'failed' ? 'Failed' : payload.status === 'completed' ? 'Success' : 'Processing',
      error: payload.lastError || '',
    };

    if (existingIndex >= 0) {
      const updated = [...prevLogs];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...liveRecord,
      };
      return updated;
    }

    return [liveRecord, ...prevLogs].slice(0, emailLimitRef.current);
  };

  useEffect(() => {
    fetchSettings();
    fetchLogs();
    fetchSmtpLogs();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('globalAdminToken');
    if (!token) return;

    const socketBaseUrl = axios.defaults.baseURL
      ? axios.defaults.baseURL.replace(/\/api\/?$/, '') || window.location.origin
      : window.location.origin;

    const socket = io(socketBaseUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[EmailDashboard] Socket CONNECTED', { socketId: socket.id, userId: user?._id || user?.id });
      setSocketConnected(true);
      hasLiveSocket.current = true;
      if (user?.id || user?._id) {
        console.log('[EmailDashboard] Emitting join-room', { userId: user._id || user.id });
        socket.emit('join-room', user._id || user.id);
      }
    });

    socket.on('disconnect', () => {
      console.log('[EmailDashboard] Socket DISCONNECTED');
      setSocketConnected(false);
      hasLiveSocket.current = false;
    });

    socket.on('connect_error', (err) => {
      console.error('[EmailDashboard] socket connect_error:', err);
      setSocketConnected(false);
      hasLiveSocket.current = false;
    });

    const handleEmailSendProgress = (payload) => {
      console.log('[EmailDashboard] RECEIVED email-send-progress EVENT', {
        payloadSessionId: payload?.sessionId,
        activeSessionId: activeSessionIdRef.current,
        matched: payload?.sessionId === activeSessionIdRef.current,
        successful: payload?.successful,
        failed: payload?.failed,
        lastEmail: payload?.lastEmail,
      });
      if (!payload || !payload.sessionId) {
        console.log('[EmailDashboard] IGNORED: missing sessionId');
        return;
      }
      const isActiveSession = payload.sessionId === activeSessionIdRef.current;
      if (!isActiveSession) {
        console.log('[EmailDashboard] Non-active session activity received, updating feed if visible', {
          active: activeSessionIdRef.current,
          payload: payload.sessionId,
        });
      }

      const { total, successful, failed, pending, status, lastEmail, lastResult, lastError, timestamp, subject } = payload;
      const formattedStatus = lastResult === 'sent' ? 'Success' : lastResult === 'failed' ? 'Failed' : status === 'completed' ? 'Success' : 'Processing';
      const effectiveTimestamp = timestamp || new Date().toISOString();

      if (isActiveSession) {
        setSendProgress({ total, successful, failed, pending, status, lastEmail, lastResult, lastError, timestamp: effectiveTimestamp });

        if (lastEmail) {
          const event = {
            email: lastEmail,
            status: lastResult || 'processing',
            error: lastError || null,
            timestamp: effectiveTimestamp,
          };
          setSendEvents((prev) => [event, ...prev].slice(0, 200));
        }
      }

      if (lastEmail && activeLogTabRef.current === 'email' && emailPageRef.current === 1) {
        setLogs((prev) => mergeLiveActivityRecord(prev, { ...payload, subject, timestamp: effectiveTimestamp }));
      }

      if (status === 'completed') {
        if (isActiveSession) {
          setLiveSendInProgress(false);
          setActiveSessionId(null);
          activeSessionIdRef.current = null;
        }
        if (activeLogTabRef.current === 'email' && emailPageRef.current === 1) {
          fetchLogs();
        }
      } else if (isActiveSession) {
        setLiveSendInProgress(true);
      }
    };

    console.log('[EmailDashboard] Registering email-send-progress listener');
    socket.on('email-send-progress', handleEmailSendProgress);

    return () => {
      console.log('[EmailDashboard] Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.off('email-send-progress', handleEmailSendProgress);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      hasLiveSocket.current = false;
      setSocketConnected(false);
    };
  }, [user]);

  useEffect(() => {
    activeLogTabRef.current = activeLogTab;
  }, [activeLogTab]);

  useEffect(() => {
    emailPageRef.current = emailPage;
  }, [emailPage]);

  useEffect(() => {
    emailLimitRef.current = emailLimit;
  }, [emailLimit]);

  useEffect(() => {
    if (activeLogTab === 'smtp') {
      fetchSmtpLogs();
    }
  }, [activeLogTab]);

  useEffect(() => {
    if (activeLogTab === 'email') {
      fetchLogs();
    }
  }, [activeLogTab, emailPage, emailLimit, emailStatusFilter, emailSearch, emailFromDate, emailToDate]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await axios.get('/email/settings');
      setSettings(res.data.settings);
    } catch {}
    setLoadingSettings(false);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get('/email/logs', {
        params: {
          page: emailPage,
          limit: emailLimit,
          status: emailStatusFilter,
          search: emailSearch,
          fromDate: emailFromDate,
          toDate: emailToDate,
        },
      });
      const newLogs = res.data.logs || [];
      const total = res.data.pagination?.total || 0;
      const totalPages = res.data.pagination?.totalPages || Math.ceil(total / emailLimit);

      setLogs(newLogs);
      setEmailTotal(total);
      setEmailTotalPages(totalPages);

      if (res.data.pagination?.page && res.data.pagination.page !== emailPage) {
        setEmailPage(res.data.pagination.page);
      }

      if (totalPages > 0 && emailPage > totalPages) {
        setEmailPage(totalPages);
      }
    } catch (err) {
      console.error('[EmailDashboard] Failed to load email logs', err);
    }
    setLoadingLogs(false);
  };

  const fetchSmtpLogs = async () => {
    setLoadingSmtpLogs(true);
    try {
      const res = await axios.get('/email/smtp-logs');
      setSmtpLogs(res.data.logs || []);
    } catch {}
    setLoadingSmtpLogs(false);
  };

  const handleSend = async (emailData) => {
    const sessionId = emailData.sendSessionId || `send-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.log('[EmailDashboard] handleSend START', { sessionId, socketConnected: socketRef.current?.connected });
    setLogTab('email');
    setActiveSessionId(sessionId);
    activeSessionIdRef.current = sessionId;
    console.log('[EmailDashboard] Set activeSessionIdRef.current =', sessionId);
    setLiveSendInProgress(true);
    setSendProgress({
      sessionId,
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      status: 'starting',
      lastEmail: null,
      lastResult: null,
      lastError: null,
      timestamp: new Date().toISOString(),
    });
    setSendEvents([]);

    if (socketRef.current) {
      console.log('[EmailDashboard] Waiting for socket connection...');
      const connected = await waitForSocketConnection(socketRef.current, 2500);
      hasLiveSocket.current = connected;
      console.log('[EmailDashboard] Socket ready:', { connected, socketId: socketRef.current.id });
      if (connected && (user?.id || user?._id)) {
        console.log('[EmailDashboard] Emitting join-room before send');
        socketRef.current.emit('join-room', user._id || user.id);
      }
    } else {
      console.warn('[EmailDashboard] Socket not available for live updates');
    }

    try {
      // CRITICAL: Log incoming emailData with complete attachment details
      console.log('[EmailDashboard] handleSend() ENTRY - emailData Details:', {
        to: emailData.to,
        subject: emailData.subject,
        bodyPlainText: emailData.bodyPlainText || 'EMPTY/AUTO-GENERATED',
        bodyPlainTextLength: emailData.bodyPlainText?.length || 0,
        ctaText: emailData.ctaText || 'NOT PROVIDED',
        ctaLink: emailData.ctaLink || 'NOT PROVIDED',
        attachmentsType: typeof emailData.attachments,
        attachmentsIsArray: Array.isArray(emailData.attachments),
        attachmentsValue: emailData.attachments,
        attachmentsLength: emailData.attachments?.length || 0,
      });
      
      // Validate attachments before processing
      if (emailData.attachments && typeof emailData.attachments !== 'object') {
        console.error('[EmailDashboard] CRITICAL ERROR: attachments is not an object:', typeof emailData.attachments, emailData.attachments);
        throw new Error('Invalid attachments format');
      }
      
      const formData = new FormData();
      // Convert arrays to comma-separated strings for FormData
      formData.append('to', Array.isArray(emailData.to) ? emailData.to.join(',') : emailData.to);
      formData.append('bcc', Array.isArray(emailData.bcc) ? emailData.bcc.join(',') : emailData.bcc);
      formData.append('replyTo', emailData.replyTo || '');
      formData.append('subject', emailData.subject);
      formData.append('body', emailData.body || '');
      formData.append('bodyPlainText', emailData.bodyPlainText || '');
      formData.append('ctaText', emailData.ctaText || '');
      formData.append('ctaLink', emailData.ctaLink || '');
      formData.append('htmlAlignment', emailData.htmlAlignment || 'center');
      formData.append('htmlMarginTop', emailData.htmlMarginTop || 24);
      formData.append('htmlMarginBottom', emailData.htmlMarginBottom || 16);
      formData.append('fromName', emailData.fromName || '');
      formData.append('fromEmail', emailData.fromEmail || '');
      
      console.log('[EmailDashboard] FormData appended - Full Details:');
      console.log('[EmailDashboard]   bodyPlainText:', formData.get('bodyPlainText') || 'EMPTY');
      console.log('[EmailDashboard]   ctaText:', formData.get('ctaText') || 'NOT PROVIDED');
      console.log('[EmailDashboard]   ctaLink:', formData.get('ctaLink') || 'NOT PROVIDED');
      
      // Append bodyImage if present
      if (emailData.bodyImage) {
        formData.append('bodyImage', JSON.stringify(emailData.bodyImage));
      }

      formData.append('sendSessionId', sessionId);
      
      // Safely handle attachments with comprehensive error handling
      let attachmentsArray = [];
      try {
        // Use safe conversion helper
        attachmentsArray = safeConvertToArray(emailData.attachments);
        
        if (attachmentsArray.length > 0) {
          console.log('[EmailDashboard] Processing attachments - count:', attachmentsArray.length);
          console.log('[EmailDashboard] Attachments converted successfully:', attachmentsArray.map(a => ({ name: a.name, size: a.size })));
          
          attachmentsArray.forEach((file, idx) => {
            if (!file || !file.name) {
              console.warn(`[EmailDashboard] ⚠️ Attachment ${idx} is invalid:`, file);
              return;
            }
            console.log(`[EmailDashboard] Appending attachment ${idx}:`, { name: file.name, size: file.size, type: file.type });
            formData.append('attachments', file);
          });
          console.log(`[EmailDashboard] ✅ Successfully appended ${attachmentsArray.length} attachments`);
        } else {
          console.log('[EmailDashboard] No attachments to process');
        }
      } catch (attachmentError) {
        console.error('[EmailDashboard] ❌ ERROR processing attachments:', {
          message: attachmentError.message,
          stack: attachmentError.stack,
          attachmentsType: typeof emailData.attachments,
          attachmentsValue: emailData.attachments,
        });
        throw new Error(`Failed to process attachments: ${attachmentError.message}`);
      }
      
      console.log('[Email Send] FormData contents - FULL DETAILS:', {
        sessionId,
        to: formData.get('to'),
        bcc: formData.get('bcc'),
        subject: formData.get('subject'),
        body: formData.get('body')?.substring(0, 50) || 'EMPTY',
        bodyPlainText: formData.get('bodyPlainText') || 'EMPTY/AUTO-GENERATED',
        bodyPlainTextLength: formData.get('bodyPlainText')?.length || 0,
        ctaText: formData.get('ctaText') || 'NOT PROVIDED',
        ctaLink: formData.get('ctaLink') || 'NOT PROVIDED',
        hasBodyImage: !!formData.get('bodyImage'),
        attachmentFiles: attachmentsArray.map(f => ({ name: f.name, size: f.size })),
      });
      
      // ✅ CRITICAL: When sending FormData, DO NOT set Content-Type header
      // Let axios/browser automatically set it with the correct multipart/form-data boundary
      console.log('[EmailDashboard] POST /email/send with sessionId:', sessionId);
      const response = await axios.post('/email/send', formData);
      console.log('[EmailDashboard] POST /email/send RESPONSE received', {
        success: response.data.success,
        summaryTotal: response.data.summary?.total,
        summarySuccessful: response.data.summary?.successful,
      });
      
      // display delivery summary toast if available
      if (response.data.summary) {
        const { total, successful, failed } = response.data.summary;
        toast.success(`Delivery report: ${successful}/${total} sent, ${failed} failed`);
      }
      
      // Ensure response includes `success` property
      if (typeof response.data.success === 'undefined') {
        console.warn('[EmailDashboard] Response missing success field:', response.data);
        // treat as failure but allow caller to inspect data
      }
      
      if (!response.data.success) {
        // we no longer throw default error; return data so caller can decide
        return response.data;
      }
      fetchLogs();
      return response.data;
    } catch (error) {
      const respData = error?.response?.data;
      const status = error?.response?.status;
      let readable = error?.message || 'Unknown error';
      try {
        if (respData) {
          readable = typeof respData === 'string' ? respData : JSON.stringify(respData);
        }
      } catch (e) {
        // ignore stringify errors
      }
      console.error('[Email Send] Full Error Details - status:', status, 'data:', respData, 'message:', error?.message);
      // Return server error payload when available so callers can handle partial failures
      if (respData && typeof respData === 'object') {
        return respData;
      }
      return { success: false, error: readable };
    } finally {
      if (!hasLiveSocket.current) {
        setLiveSendInProgress(false);
      }
    }
  };

  const handleSaveSettings = async (form) => {
    // Map frontend form to backend expected structure
    const provider = form.provider;
    const smtp = provider === 'smtp' ? form.smtp : null;
    const aws = provider === 'aws' ? form.aws : null;
    const resend = provider === 'resend' ? form.resend : null;

    console.log('[EmailDashboard] handleSaveSettings called, provider=', provider, { smtp, aws, resend });

    try {
      console.log('[EmailDashboard] Saving settings to backend...');
      const res = await axios.post('/email/settings', { provider, smtp, aws, resend, fromEmail: form.fromEmail }, { timeout: 20000 });
      console.log('[EmailDashboard] Save settings response:', res.data);
      // Optimistically update local settings so UI reflects new values immediately
      setSettings(res.data.settings);
      toast.success('Settings saved successfully');
    } catch (saveErr) {
      const msg = saveErr?.response?.data?.message || saveErr.message || 'Unknown save error';
      console.error('[EmailDashboard] Save settings failed:', msg, saveErr);
      toast.error(`Save failed: ${msg}`);
      // propagate so the form component shows error
      throw new Error(`Save failed: ${msg}`);
    }

    // make sure latest settings are fetched before closing modal
    await fetchSettings();
    setShowSettings(false);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all email logs?')) return;
    await axios.delete('/email/logs');
    fetchLogs();
  };

  const handleClearSmtpLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all SMTP failover logs?')) return;
    await axios.delete('/email/smtp-logs');
    fetchSmtpLogs();
  };

  const setLogTab = (tab) => {
    setActiveLogTab(tab);
    setEmailPage(1);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {showSettings ? (
        loadingSettings ? (
          <div>Loading settings...</div>
        ) : (
          <EmailSettings onSave={handleSaveSettings} onCancel={() => setShowSettings(false)} initialSettings={settings} />
        )
      ) : (
        <>
          <EmailCompose
            onSend={handleSend}
            onOpenSettings={() => setShowSettings(true)}
            fromEmailDefault={settings?.fromEmail || ''}
          />

          {(sendProgress || liveSendInProgress) && (
            <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Live send progress</h2>
                  <p className="text-sm text-gray-500">Track your email batch in real time while send activity is ongoing.</p>
                </div>
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${socketConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {socketConnected ? 'Live socket connected' : 'Live updates unavailable'}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm text-gray-500">Queued</div>
                  <div className="text-2xl font-semibold text-gray-900">{sendProgress?.total ?? 0}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm text-gray-500">Sent</div>
                  <div className="text-2xl font-semibold text-emerald-600">{sendProgress?.successful ?? 0}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm text-gray-500">Failed</div>
                  <div className="text-2xl font-semibold text-rose-600">{sendProgress?.failed ?? 0}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm text-gray-500">Pending</div>
                  <div className="text-2xl font-semibold text-gray-900">{sendProgress?.pending ?? 0}</div>
                </div>
              </div>

              <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${sendProgress?.total ? Math.round(((sendProgress?.successful ?? 0) + (sendProgress?.failed ?? 0)) / sendProgress.total * 100) : 0}%` }}
                />
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Status: <span className="font-semibold text-gray-800">{sendProgress?.status || 'waiting'}</span>
                {sendProgress?.lastEmail && (
                  <span> — Last: <span className="font-medium">{sendProgress.lastEmail}</span> ({sendProgress.lastResult})</span>
                )}
              </div>

              <div className="space-y-2">
                {sendEvents.length === 0 ? (
                  <div className="text-sm text-gray-500">No live activity yet.</div>
                ) : (
                  sendEvents.map((event, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between text-sm text-gray-700">
                        <span className="font-medium">{event.email}</span>
                        <span className={event.status === 'sent' ? 'text-emerald-600' : 'text-rose-600'}>{event.status}</span>
                      </div>
                      <div className="text-xs text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}</div>
                      {event.error && <div className="text-xs text-red-500 mt-1">{event.error}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLogTab('email')}
                  className={`px-3 py-1 rounded text-sm font-semibold ${activeLogTab === 'email' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Email Activity
                </button>
                <button
                  type="button"
                  onClick={() => setLogTab('smtp')}
                  className={`px-3 py-1 rounded text-sm font-semibold ${activeLogTab === 'smtp' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  SMTP Failover
                </button>
              </div>
              <div className="flex items-center gap-2">
                {activeLogTab === 'email' && (
                  <button
                    type="button"
                    onClick={fetchLogs}
                    className="bg-sky-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Refresh
                  </button>
                )}
                <button
                  onClick={activeLogTab === 'smtp' ? handleClearSmtpLogs : handleClearLogs}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            {activeLogTab === 'email' && (
              <div className="mb-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                      value={emailSearch}
                      onChange={(e) => {
                        setEmailSearch(e.target.value);
                        setEmailPage(1);
                      }}
                      placeholder="Search subject, recipient, error"
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={emailStatusFilter}
                      onChange={(e) => {
                        setEmailStatusFilter(e.target.value);
                        setEmailPage(1);
                      }}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    >
                      <option>All</option>
                      <option>Success</option>
                      <option>Failed</option>
                      <option>Pending</option>
                      <option>Processing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input
                      type="date"
                      value={emailFromDate}
                      onChange={(e) => {
                        setEmailFromDate(e.target.value);
                        setEmailPage(1);
                      }}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="date"
                      value={emailToDate}
                      onChange={(e) => {
                        setEmailToDate(e.target.value);
                        setEmailPage(1);
                      }}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {logs.length} of {emailTotal} matching records
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="text-sm font-medium text-gray-700">Rows per page</label>
                    <select
                      value={emailLimit}
                      onChange={(e) => {
                        setEmailLimit(parseInt(e.target.value, 10));
                        setEmailPage(1);
                      }}
                      className="rounded border border-gray-300 px-3 py-2"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              {activeLogTab === 'email' ? (
                loadingLogs ? (
                  <div>Loading email logs...</div>
                ) : (
                  <>
                    <table className="min-w-full bg-white border">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 border">To</th>
                          <th className="px-4 py-2 border">BCC</th>
                          <th className="px-4 py-2 border">Subject</th>
                          <th className="px-4 py-2 border">Date</th>
                          <th className="px-4 py-2 border">SMTP</th>
                          <th className="px-4 py-2 border">Status</th>
                          <th className="px-4 py-2 border">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-gray-500">No emails sent yet.</td>
                          </tr>
                        ) : (
                          logs.map((log, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 border">{normalizeRecipients(log.to).join(', ')}</td>
                              <td className="px-4 py-2 border">{normalizeRecipients(log.bcc).join(', ')}</td>
                              <td className="px-4 py-2 border">{log.subject}</td>
                              <td className="px-4 py-2 border">{new Date(log.sentAt).toLocaleString()}</td>
                              <td className="px-4 py-2 border">{log.smtpUsed || '—'}</td>
                              <td className={`px-4 py-2 border font-semibold ${log.status === 'Success' ? 'text-green-600' : log.status === 'Failed' ? 'text-red-600' : 'text-amber-600'}`}>{log.status || 'Pending'}</td>
                              <td className="px-4 py-2 border text-red-500">{log.error}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {emailTotalPages > 1 && (
                      <div className="mt-4 flex flex-col gap-3 items-start justify-between rounded-lg border border-gray-200 bg-white p-3 md:flex-row">
                        <div className="text-sm text-gray-600">
                          Page {emailPage} of {emailTotalPages}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setEmailPage(Math.max(1, emailPage - 1))}
                            disabled={emailPage === 1}
                            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>
                          {Array.from({ length: Math.min(7, emailTotalPages) }, (_, idx) => {
                            const startPage = Math.max(1, Math.min(emailPage - 3, emailTotalPages - 6));
                            const pageNumber = startPage + idx;
                            return pageNumber <= emailTotalPages ? (
                              <button
                                key={pageNumber}
                                onClick={() => setEmailPage(pageNumber)}
                                className={`rounded border px-3 py-1 text-sm ${pageNumber === emailPage ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
                              >
                                {pageNumber}
                              </button>
                            ) : null;
                          })}
                          <button
                            onClick={() => setEmailPage(Math.min(emailTotalPages, emailPage + 1))}
                            disabled={emailPage === emailTotalPages}
                            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : (
                loadingSmtpLogs ? (
                  <div>Loading SMTP logs...</div>
                ) : (
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 border">Date</th>
                        <th className="px-4 py-2 border">Action</th>
                        <th className="px-4 py-2 border">SMTP Config</th>
                        <th className="px-4 py-2 border">Host</th>
                        <th className="px-4 py-2 border">Recipients</th>
                        <th className="px-4 py-2 border">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smtpLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-gray-500">No SMTP failover logs yet.</td>
                        </tr>
                      ) : (
                        smtpLogs.map((log, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 border">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-2 border">{log.action}</td>
                            <td className="px-4 py-2 border">{log.smtpName || '—'}</td>
                            <td className="px-4 py-2 border">{log.smtpHost ? `${log.smtpHost}:${log.smtpPort}` : '—'}</td>
                            <td className="px-4 py-2 border">{log.recipientCount || 0}</td>
                            <td className="px-4 py-2 border text-red-500">{log.error}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
