import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getPublicIP } from '../../utils/ipHelper';
import { io as ioClient } from 'socket.io-client';

export default function SmsCompose() {
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [smsPage, setSmsPage] = useState(1);
  const [smsLimit, setSmsLimit] = useState(25);
  const [smsPagination, setSmsPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 });
  const smsPageRef = useRef(smsPage);
  const smsLimitRef = useRef(smsLimit);
  // Delivery report returned from backend after an SMS send attempt
  const [deliveryReport, setDeliveryReport] = useState(null);
  // Live send progress
  const [queuedTotal, setQueuedTotal] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);
  const [liveActivities, setLiveActivities] = useState([]);

  useEffect(() => {
    smsPageRef.current = smsPage;
  }, [smsPage]);

  useEffect(() => {
    smsLimitRef.current = smsLimit;
  }, [smsLimit]);

  useEffect(() => {
    // Setup Socket.IO listener for real-time SMS progress
    let socket;
    (async () => {
      try {
        const profileRes = await axios.get('/auth/profile');
        const userId = profileRes.data?.user?._id;
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
          console.warn('[SmsCompose] Socket connect_error:', err?.message || err);
        });
        socket.on('connect_failed', (err) => {
          console.warn('[SmsCompose] Socket connect_failed:', err?.message || err);
        });
        socket.on('error', (err) => {
          console.warn('[SmsCompose] Socket error:', err?.message || err);
        });

        socket.on('sms-send-progress', (data) => {
          setQueuedTotal(data.total || 0);
          setSentCount(data.successful || 0);
          setFailedCount(data.failed || 0);
          setRemainingCount(typeof data.remaining === 'number' ? data.remaining : Math.max(0, (data.total || 0) - ((data.successful || 0) + (data.failed || 0))));
          if (data.last) {
            const isSending = data.last.status === 'sending';
            const isSuccess = data.last.success === true;
            const isFailure = data.last.success === false;

            const last = {
              recipient: data.last.recipient,
              message: data.last.message || '(live)',
              status: isSending ? 'Sending' : (isSuccess ? 'Sent' : (isFailure ? 'Failed' : 'Unknown')),
              providerMessageId: data.last.id || '-',
              error: data.last.error || null,
              sentAt: data.last.sentAt || new Date().toISOString(),
            };

            setLiveActivities((prev) => [last, ...prev].slice(0, 100));

            // Optimistically prepend or update logs when on first page for instant visibility
            setLogs((prevLogs) => {
              try {
                if (smsPageRef.current !== 1) return prevLogs;

                const liveLog = {
                  recipient: last.recipient || '',
                  message: last.message,
                  status: last.status,
                  createdAt: last.sentAt,
                  providerMessageId: last.providerMessageId,
                  error: last.error,
                };

                // If we already have a 'Sending' row for this recipient, replace it with updated status
                const existingIdx = prevLogs.findIndex(l => l.recipient === liveLog.recipient && l.status === 'Sending');
                if (existingIdx !== -1) {
                  const copy = prevLogs.slice();
                  copy[existingIdx] = liveLog;
                  return copy;
                }

                const newLogs = [liveLog, ...prevLogs];
                return newLogs.slice(0, smsLimitRef.current);
              } catch (e) {
                return prevLogs;
              }
            });

            setSmsPagination((p) => ({ ...p, total: (p.total || 0) + (smsPageRef.current === 1 ? 1 : 0) }));
          }
        });

        socket.on('sms-send-complete', (data) => {
          setQueuedTotal(data.total || 0);
          setSentCount(data.successful || 0);
          setFailedCount(data.failed || 0);
          setRemainingCount(0);
          setLiveActivities((prev) => [{ type: 'complete', ...data }, ...prev].slice(0, 100));
          fetchLogs(smsPageRef.current, smsLimitRef.current);
        });
        socket.on('sms-send-start', (data) => {
          setQueuedTotal(data.total || 0);
          setSentCount(0);
          setFailedCount(0);
          setRemainingCount(typeof data.remaining === 'number' ? data.remaining : (data.total || 0));
          setLiveActivities((prev) => [{ type: 'start', ...data }, ...prev].slice(0, 100));
        });
      } catch (e) {
        console.warn('[SmsCompose] Socket setup failed:', e.message || e);
      }
    })();
    return () => {
      try { if (socket) socket.disconnect(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    fetchLogs(smsPage, smsLimit);
  }, [smsPage, smsLimit]);

  // Clear delivery report when user edits fields
  useEffect(() => {
    setDeliveryReport(null);
    setStatus(null);
  }, [numbers, message]);

  const fetchLogs = async (page = smsPage, limit = smsLimit) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get('/sms/logs', { params: { page, limit } });
      setLogs(res.data.logs || []);
      setSmsPagination(res.data.pagination || { total: 0, page, limit, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load SMS logs', err?.message || err);
      setLogs([]);
    }
    setLoadingLogs(false);
  };

  const charCount = message.length;
  const partSize = 160;
  const parts = Math.max(1, Math.ceil(charCount / partSize));

  const handleSend = async () => {
    setSending(true);
    setStatus(null);
    setDeliveryReport(null);
    // Reset progress tracking for new send
    setQueuedTotal(0);
    setSentCount(0);
    setFailedCount(0);
    setRemainingCount(0);
    setLiveActivities([]);
    try {
      if (!numbers.trim()) throw new Error('Please enter at least one phone number');
      if (!message.trim()) throw new Error('Message is required');
      // Prevent HTML
      if (/<[^>]+>/.test(message)) throw new Error('HTML or tags are not allowed in SMS messages');

      // Fetch user's public IP for validation
      let clientPublicIP;
      try {
        clientPublicIP = await getPublicIP();
      } catch (ipError) {
        console.error('Failed to fetch public IP:', ipError);
        throw new Error('Unable to verify your IP address. Please check your internet connection and try again.');
      }

      const res = await axios.post('/sms/send', { 
        numbers, 
        message
      }, {
        headers: {
          'x-user-public-ip': clientPublicIP  // Backend expects this header for IP validation
        }
      });
      if (!res.data.success) throw new Error(res.data.error || 'Failed to send SMS');
      setStatus({ success: true, results: res.data.results });
      // Set delivery report if available
      if (res.data.summary) {
        setDeliveryReport(res.data.summary);
        const { total, successful, failed } = res.data.summary;
        toast.success(`Delivery report: ${successful}/${total} sent, ${failed} failed`);
      }
      setSmsPage(1);
      await fetchLogs(1, smsLimit);
    } catch (err) {
      setStatus({ success: false, error: err.message });
    }
    setSending(false);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all SMS logs?')) return;
    try {
      await axios.delete('/sms/logs');
      fetchLogs(smsPage, smsLimit);
    } catch (err) {
      alert('Failed to clear logs');
    }
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
    <div>
      <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-bold mb-3">Compose SMS</h3>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Phone Numbers</label>
        <textarea value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="Enter phone numbers, comma or newline separated (e.g. +1234567890)" className="border p-2 w-full min-h-[80px]" />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Plain text only" className="border p-2 w-full min-h-[120px]" />
        <div className="text-sm text-gray-500 mt-1">Characters: {charCount} • Parts: {parts} (approx. {partSize} chars/part)</div>
      </div>
      {status && (
        <div className={`mb-3 p-2 rounded ${status.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {status.success ? `Sent to ${status.results.length} recipients` : `Error: ${status.error}`}
        </div>
      )}
      
      {/* Live sending progress */}
      {queuedTotal > 0 && (
        <div className="mt-4 p-4 bg-gray-50 border rounded">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
            <div className="text-sm font-semibold">Live SMS Progress</div>
            <div className="text-sm text-gray-600">{sentCount}/{queuedTotal} sent</div>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded overflow-hidden">
            <div
              className="bg-blue-500 h-3"
              style={{ width: `${Math.round((sentCount / (queuedTotal || 1)) * 100)}%` }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-600 mt-2">
            <div>Total: {queuedTotal}</div>
            <div>Sent: {sentCount}</div>
            <div>Failed: {failedCount}</div>
            <div>Remaining: {remainingCount}</div>
          </div>
          {liveActivities.length > 0 && (
            <div className="mt-3 text-xs">
              <div className="font-semibold">Recent activity</div>
              <ul className="list-disc ml-5 mt-1 max-h-32 overflow-y-auto">
                {liveActivities.map((act, i) => {
                  const isFailure = act.success === false;
                  const isSending = act.status === 'Sending';
                  const statusColor = isFailure ? 'text-red-600' : isSending ? 'text-orange-600' : 'text-gray-800';
                  
                  return (
                    <li key={i} className={statusColor}>
                      <span className="font-medium">{act.recipient}</span>
                      {act.message ? (
                        <span className="mx-1">— {act.message.length > 50 ? act.message.substring(0, 47) + '...' : act.message}</span>
                      ) : null}
                      <span className="ml-2 text-xs text-gray-500">
                        {act.sentAt ? new Date(act.sentAt).toLocaleTimeString() : ''}
                      </span>
                      <span className="ml-2">
                        {isSending ? 'sending...' : (isFailure ? `failed: ${act.error || 'error'}` : 'sent')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {deliveryReport && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">SMS Sending Completed</h3>
          <p className="text-sm">Total SMS Processed: <strong>{deliveryReport.total}</strong></p>
          <p className="text-sm text-green-700">Successfully Sent: <strong>{deliveryReport.successful}</strong></p>
          <p className="text-sm text-red-700">Failed: <strong>{deliveryReport.failed}</strong></p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={handleSend} disabled={sending} className="w-full sm:w-auto px-4 py-2 bg-black text-white rounded">{sending ? 'Sending...' : 'Send SMS'}</button>
      </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg font-bold">SMS Activity Log</h3>
          {logs.length > 0 && <button onClick={handleClearLogs} className="w-full sm:w-auto bg-red-500 text-white px-3 py-1 rounded text-sm">Clear</button>}
        </div>
        <div className="overflow-x-auto">
          {loadingLogs ? (
            <div>Loading logs...</div>
          ) : (
            <>
              <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Recipient</th>
                  <th className="px-4 py-2 border">Message</th>
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Date</th>
                  <th className="px-4 py-2 border">Provider ID</th>
                  <th className="px-4 py-2 border">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-500">No SMS sent yet.</td></tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 border">{log.recipient}</td>
                      <td className="px-4 py-2 border text-sm">{log.message?.substring(0, 40) || '-'}...</td>
                      <td className={`px-4 py-2 border font-semibold ${log.status === 'Sent' ? 'text-green-600' : 'text-red-600'}`}>{log.status}</td>
                      <td className="px-4 py-2 border text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2 border text-sm">{log.providerMessageId || '-'}</td>
                      <td className="px-4 py-2 border text-red-500 text-sm max-w-xs truncate" title={log.error || ''}>{log.error || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
              <div className="text-sm text-gray-600">
                Showing {logs.length} of {smsPagination.total || 0} SMS activity entries
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-gray-700">Rows:</label>
                <select
                  value={smsLimit}
                  onChange={(e) => {
                    setSmsLimit(Number(e.target.value));
                    setSmsPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSmsPage(Math.max(1, smsPage - 1))}
                  disabled={smsPage === 1}
                  className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                {buildPageNumbers(smsPage, smsPagination.totalPages || 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setSmsPage(page)}
                    className={`px-3 py-1 rounded text-sm ${page === smsPage ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setSmsPage(Math.min(smsPagination.totalPages || 1, smsPage + 1))}
                  disabled={smsPage >= (smsPagination.totalPages || 1)}
                  className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
