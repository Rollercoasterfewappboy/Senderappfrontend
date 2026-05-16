import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import EmailCompose from './EmailCompose';
import EmailSettings from './EmailSettings';
import { getPublicIP } from '../../utils/ipHelper';
import { io as ioClient } from 'socket.io-client';

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

export default function EmailDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [smtpLogs, setSmtpLogs] = useState([]);
  const [activeLogTab, setActiveLogTab] = useState('email'); // 'email' or 'smtp'
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingSmtpLogs, setLoadingSmtpLogs] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [emailPage, setEmailPage] = useState(1);
  const [emailLimit, setEmailLimit] = useState(25);
  const [emailPagination, setEmailPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 });
  const [smtpPage, setSmtpPage] = useState(1);
  const [smtpLimit, setSmtpLimit] = useState(25);
  const [smtpPagination, setSmtpPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 });
  const emailPageRef = useRef(emailPage);
  const emailLimitRef = useRef(emailLimit);
  const smtpPageRef = useRef(smtpPage);
  const smtpLimitRef = useRef(smtpLimit);
  // Live send progress
  const [queuedTotal, setQueuedTotal] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);
  const [liveActivities, setLiveActivities] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchLogs(emailPage, emailLimit);
    fetchSmtpLogs(smtpPage, smtpLimit);
    // Setup Socket.IO listener for real-time email progress
    let socket;
    (async () => {
      try {
        const profileRes = await axios.get('/auth/profile');
        const userId = profileRes.data?.user?.id || profileRes.data?.user?._id;
        if (!userId) return;
        let backendOrigin = '';
        if (axios.defaults.baseURL) {
          backendOrigin = axios.defaults.baseURL.replace(/\/api$/,'');
        }
        if (!backendOrigin || backendOrigin === 'null') {
          backendOrigin = window.location.origin || undefined;
        }

        socket = ioClient(backendOrigin || undefined, {
          auth: { token: localStorage.getItem('token') || localStorage.getItem('globalAdminToken') },
          transports: ['websocket', 'polling'],
          timeout: 30000,
        });

        socket.on('connect', () => {
          try { socket.emit('join-room', userId); } catch (e) {}
        });
        socket.on('connect_error', (err) => {
          console.warn('[EmailDashboard] Socket connect_error:', err?.message || err);
        });
        socket.on('connect_failed', (err) => {
          console.warn('[EmailDashboard] Socket connect_failed:', err?.message || err);
        });
        socket.on('error', (err) => {
          console.warn('[EmailDashboard] Socket error:', err?.message || err);
        });

        socket.on('email-send-start', (data) => {
          setQueuedTotal(data.total || 0);
          setSentCount(0);
          setFailedCount(0);
          setRemainingCount(typeof data.remaining === 'number' ? data.remaining : (data.total || 0));
          setLiveActivities((prev) => [{ type: 'start', ...data }, ...prev].slice(0, 100));
        });

        socket.on('email-send-progress', (data) => {
          setQueuedTotal(data.total || 0);
          setSentCount(data.successful || 0);
          setFailedCount(data.failed || 0);
          setRemainingCount(typeof data.remaining === 'number' ? data.remaining : Math.max(0, (data.total || 0) - ((data.successful || 0) + (data.failed || 0))));
          if (data.last) {
            const last = data.last;
            const activityEntry = {
              email: last.email,
              subject: last.subject || '(live)',
              smtpUsed: last.smtpUsed || null,
              success: typeof last.success === 'boolean' ? last.success : undefined,
              error: last.error || null,
              sentAt: last.sentAt || new Date().toISOString(),
            };
            setLiveActivities((prev) => [activityEntry, ...prev].slice(0, 100));
            // If user is viewing first page, optimistically prepend the live entry into the table
            setLogs((prevLogs) => {
              try {
                if (emailPageRef.current !== 1) return prevLogs;
                const liveLog = {
                  to: [(activityEntry.email || '').toString()],
                  bcc: [],
                  subject: activityEntry.subject || '(live)',
                  sentAt: activityEntry.sentAt,
                  smtpUsed: activityEntry.smtpUsed || '—',
                  status: activityEntry.success === false ? 'Failed' : 'Success',
                  error: activityEntry.error || null,
                };
                const newLogs = [liveLog, ...prevLogs];
                // keep page size consistent
                return newLogs.slice(0, emailLimitRef.current);
              } catch (e) {
                return prevLogs;
              }
            });
            // adjust total count so footer shows accurate numbers
            setEmailPagination((p) => ({ ...p, total: (p.total || 0) + (emailPageRef.current === 1 ? 1 : 0) }));
          }
        });

        socket.on('email-send-complete', (data) => {
          setQueuedTotal(data.total || 0);
          setSentCount(data.successful || 0);
          setFailedCount(data.failed || 0);
          setRemainingCount(0);
          setLiveActivities((prev) => [{ type: 'complete', ...data }, ...prev].slice(0, 100));
          fetchLogs(emailPageRef.current, emailLimitRef.current);
        });
      } catch (e) {
        console.warn('[EmailDashboard] Socket setup failed:', e.message || e);
      }
    })();
    return () => {
      try { if (socket) socket.disconnect(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    emailPageRef.current = emailPage;
  }, [emailPage]);

  useEffect(() => {
    emailLimitRef.current = emailLimit;
  }, [emailLimit]);

  useEffect(() => {
    smtpPageRef.current = smtpPage;
  }, [smtpPage]);

  useEffect(() => {
    smtpLimitRef.current = smtpLimit;
  }, [smtpLimit]);

  useEffect(() => {
    if (activeLogTab === 'smtp') {
      fetchSmtpLogs();
    }
  }, [activeLogTab]);

  useEffect(() => {
    fetchLogs(emailPage, emailLimit);
  }, [emailPage, emailLimit]);

  useEffect(() => {
    if (activeLogTab === 'smtp') {
      fetchSmtpLogs(smtpPage, smtpLimit);
    }
  }, [smtpPage, smtpLimit, activeLogTab]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await axios.get('/email/settings');
      setSettings(res.data.settings);
    } catch {}
    setLoadingSettings(false);
  };

  const fetchLogs = async (page = 1, limit = emailLimit) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get('/email/logs', {
        params: { page, limit },
      });
      setLogs(res.data.logs || []);
      setEmailPagination(res.data.pagination || { total: 0, page, limit, totalPages: 0 });
    } catch (err) {
      console.warn('[EmailDashboard] fetchLogs failed:', err?.message || err);
      setLogs([]);
    }
    setLoadingLogs(false);
  };

  const fetchSmtpLogs = async (page = 1, limit = smtpLimit) => {
    setLoadingSmtpLogs(true);
    try {
      const res = await axios.get('/email/smtp-logs', {
        params: { page, limit },
      });
      setSmtpLogs(res.data.logs || []);
      setSmtpPagination(res.data.pagination || { total: 0, page, limit, totalPages: 0 });
    } catch (err) {
      console.warn('[EmailDashboard] fetchSmtpLogs failed:', err?.message || err);
      setSmtpLogs([]);
    }
    setLoadingSmtpLogs(false);
  };

  const handleSend = async (emailData) => {
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
        to: formData.get('to'),
        bcc: formData.get('bcc'),
        subject: formData.get('subject'),
        body: formData.get('body')?.substring(0, 50) || 'EMPTY',
        bodyPlainText: formData.get('bodyPlainText') || 'EMPTY/AUTO-GENERATED',
        bodyPlainTextLength: formData.get('bodyPlainText')?.length || 0,
        ctaText: formData.get('ctaText') || 'NOT PROVIDED',
        ctaLink: formData.get('ctaLink') || 'NOT PROVIDED',
        hasBodyImage: !!formData.get('bodyImage'),
        attachmentFiles: attachmentsArray.map(f => ({ name: f.name, size: f.size }))
      });

      // Fetch real public IP for IP validation
      console.log('[Email Send] Fetching public IP for validation...');
      let clientPublicIP;
      try {
        clientPublicIP = await getPublicIP();
      } catch (ipError) {
        console.error('[Email Send] Failed to fetch public IP:', ipError);
        toast.error('Unable to verify your IP address. Please check your internet connection and try again.');
        return;
      }
      console.log('[Email Send] Detected user public IP:', clientPublicIP);

      // ✅ CRITICAL: When sending FormData, DO NOT set Content-Type header
      // Let axios/browser automatically set it with the correct multipart/form-data boundary
      // BUT DO send the detected public IP in a custom header for server-side IP validation
      const response = await axios.post('/email/send', formData, {
        headers: {
          'x-user-public-ip': clientPublicIP  // Backend expects this header for IP validation
        }
      });
      console.log('[Email Send] Response:', response.data);
      
      if (response.data.summary) {
        const { total, successful, failed } = response.data.summary;
        setQueuedTotal(total || 0);
        setSentCount(successful || 0);
        setFailedCount(failed || 0);
        setRemainingCount(Math.max(0, (total || 0) - ((successful || 0) + (failed || 0))));
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
      fetchLogs(emailPage, emailLimit);
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
      // Throw a readable Error so EmailCompose can display it
      throw new Error(readable);
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
    fetchLogs(emailPage, emailLimit);
  };

  const handleClearSmtpLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all SMTP failover logs?')) return;
    await axios.delete('/email/smtp-logs');
    fetchSmtpLogs(smtpPage, smtpLimit);
  };

  const setLogTab = (tab) => {
    setActiveLogTab(tab);
  };

  const buildPageNumbers = (current, total) => {
    const delta = 2;
    const pages = [];
    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);

    if (end - start < delta * 2) {
      start = Math.max(1, Math.min(start, total - delta * 2));
      end = Math.min(total, Math.max(end, delta * 2 + 1));
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
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
          
          {/* Live sending progress */}
          {queuedTotal > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Live Sending Progress</div>
                <div className="text-sm text-gray-600">{sentCount}/{queuedTotal} sent</div>
              </div>
              <div className="w-full bg-gray-200 h-3 rounded overflow-hidden">
                <div
                  className="bg-green-500 h-3"
                  style={{ width: `${Math.round((sentCount / (queuedTotal || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                <div>Total: {queuedTotal}</div>
                <div>Sent: {sentCount}</div>
                <div>Failed: {failedCount}</div>
                <div>Remaining: {remainingCount}</div>
              </div>
              {liveActivities.length > 0 && (
                <div className="mt-3 text-xs">
                  <div className="font-semibold">Recent activity</div>
                  <ul className="list-disc ml-5 mt-1 max-h-32 overflow-y-auto">
                    {liveActivities.map((act, i) => (
                      <li key={i} className={`${act.success === false ? 'text-red-600' : 'text-gray-800'}`}>
                        <span className="font-medium">{act.email}</span>
                        {act.subject ? <span className="mx-1">— {act.subject.length > 60 ? act.subject.substring(0, 57) + '...' : act.subject}</span> : null}
                        <span className="ml-2 text-xs text-gray-500">{act.sentAt ? new Date(act.sentAt).toLocaleTimeString() : ''}</span>
                        <span className="ml-2">{act.success === false ? `failed: ${act.error || 'error'}` : 'sent'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="mt-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex flex-wrap gap-2 items-center">
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
              <button
                onClick={activeLogTab === 'smtp' ? handleClearSmtpLogs : handleClearLogs}
                className="w-full sm:w-auto bg-red-500 text-white px-3 py-2 rounded text-sm"
              >
                Clear
              </button>
            </div>
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
                            <td className="px-4 py-2 border">{(log.to || []).join(', ')}</td>
                            <td className="px-4 py-2 border">{(log.bcc || []).join(', ')}</td>
                            <td className="px-4 py-2 border">{log.subject}</td>
                            <td className="px-4 py-2 border">{new Date(log.sentAt).toLocaleString()}</td>
                            <td className="px-4 py-2 border">{log.smtpUsed || '—'}</td>
                            <td className={`px-4 py-2 border font-semibold ${log.status === 'Success' ? 'text-green-600' : 'text-red-600'}`}>{log.status}</td>
                            <td className="px-4 py-2 border text-red-500">{log.error}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
                    <div className="text-sm text-gray-600">
                      Showing {logs.length} of {emailPagination.total || 0} email activity entries
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-sm text-gray-700">Rows:</label>
                      <select
                        value={emailLimit}
                        onChange={(e) => {
                          setEmailLimit(Number(e.target.value));
                          setEmailPage(1);
                        }}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {[10, 25, 50, 100].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEmailPage(Math.max(1, emailPage - 1))}
                        disabled={emailPage === 1}
                        className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {buildPageNumbers(emailPage, emailPagination.totalPages || 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setEmailPage(page)}
                          className={`px-3 py-1 rounded text-sm ${page === emailPage ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setEmailPage(Math.min(emailPagination.totalPages || 1, emailPage + 1))}
                        disabled={emailPage >= (emailPagination.totalPages || 1)}
                        className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  </>
                )
              ) : (
                loadingSmtpLogs ? (
                  <div>Loading SMTP logs...</div>
                ) : (
                  <>
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
                    <div className="text-sm text-gray-600">
                      Showing {smtpLogs.length} of {smtpPagination.total || 0} SMTP activity entries
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-sm text-gray-700">Rows:</label>
                      <select
                        value={smtpLimit}
                        onChange={(e) => {
                          setSmtpLimit(Number(e.target.value));
                          setSmtpPage(1);
                        }}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {[10, 25, 50, 100].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSmtpPage(Math.max(1, smtpPage - 1))}
                        disabled={smtpPage === 1}
                        className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {buildPageNumbers(smtpPage, smtpPagination.totalPages || 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setSmtpPage(page)}
                          className={`px-3 py-1 rounded text-sm ${page === smtpPage ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setSmtpPage(Math.min(smtpPagination.totalPages || 1, smtpPage + 1))}
                        disabled={smtpPage >= (smtpPagination.totalPages || 1)}
                        className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  </>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
