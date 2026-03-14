import { useState, useEffect } from 'react';
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

export default function EmailDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [smtpLogs, setSmtpLogs] = useState([]);
  const [activeLogTab, setActiveLogTab] = useState('email'); // 'email' or 'smtp'
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingSmtpLogs, setLoadingSmtpLogs] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
    fetchSmtpLogs();
  }, []);

  useEffect(() => {
    if (activeLogTab === 'smtp') {
      fetchSmtpLogs();
    }
  }, [activeLogTab]);

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
      const res = await axios.get('/email/logs');
      setLogs(res.data.logs || []);
    } catch {}
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
      
      // ✅ CRITICAL: When sending FormData, DO NOT set Content-Type header
      // Let axios/browser automatically set it with the correct multipart/form-data boundary
      const response = await axios.post('/email/send', formData);
      console.log('[Email Send] Response:', response.data);
      
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
    fetchLogs();
  };

  const handleClearSmtpLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all SMTP failover logs?')) return;
    await axios.delete('/email/smtp-logs');
    fetchSmtpLogs();
  };

  const setLogTab = (tab) => {
    setActiveLogTab(tab);
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
              <button
                onClick={activeLogTab === 'smtp' ? handleClearSmtpLogs : handleClearLogs}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm"
              >
                Clear
              </button>
            </div>
            <div className="overflow-x-auto">
              {activeLogTab === 'email' ? (
                loadingLogs ? (
                  <div>Loading email logs...</div>
                ) : (
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
