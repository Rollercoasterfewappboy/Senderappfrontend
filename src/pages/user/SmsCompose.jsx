import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

export default function SmsCompose({ user }) {
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [deliveryReport, setDeliveryReport] = useState(null);
  const [sendProgress, setSendProgress] = useState(null);
  const [sendEvents, setSendEvents] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [smsSearch, setSmsSearch] = useState('');
  const [smsStatusFilter, setSmsStatusFilter] = useState('All');
  const [smsFromDate, setSmsFromDate] = useState('');
  const [smsToDate, setSmsToDate] = useState('');
  const [smsPage, setSmsPage] = useState(1);
  const [smsLimit, setSmsLimit] = useState(25);
  const [smsTotal, setSmsTotal] = useState(0);
  const [smsTotalPages, setSmsTotalPages] = useState(0);
  const socketRef = useRef(null);
  const activeSessionId = useRef(null);

  const backendOrigin = (axios.defaults.baseURL || window.location.origin).replace(/\/api\/?$/, '') || window.location.origin;
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    setDeliveryReport(null);
    setStatus(null);
  }, [numbers, message]);

  const handleSocketProgress = (payload) => {
    if (!payload || payload.sessionId !== activeSessionId.current) return;

    setSendProgress((prev) => ({
      ...(prev || {}),
      ...payload,
    }));

    if (payload.recipient) {
      const event = {
        recipient: payload.recipient,
        status: payload.lastStatus || (payload.success ? 'sent' : 'failed'),
        error: payload.error || null,
        providerMessageId: payload.providerMessageId || null,
        timestamp: payload.timestamp || new Date().toISOString(),
      };
      setSendEvents((prev) => [event, ...prev].slice(0, 100));

      if (smsPage === 1) {
        setLogs((prev) => {
          const newLog = {
            recipient: payload.recipient,
            message: '(live SMS activity)',
            status: payload.success ? 'Sent' : 'Failed',
            providerMessageId: payload.providerMessageId || null,
            error: payload.error || '',
            createdAt: payload.timestamp || new Date().toISOString(),
          };
          return [newLog, ...prev].slice(0, smsLimit);
        });
      }
    }
  };

  useEffect(() => {
    if (!token) return;

    const socket = io(backendOrigin, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (user?._id) {
        socket.emit('join-room', user._id);
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[SMS Socket] connect_error', error);
      setSocketConnected(false);
    });

    socket.on('sms-send-progress', handleSocketProgress);

    return () => {
      if (!socketRef.current) return;
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.off('connect_error');
      socketRef.current.off('sms-send-progress');
      socketRef.current.disconnect();
      socketRef.current = null;
    };
  }, [backendOrigin, token, user?._id]);

  const fetchLogs = async ({
    page = smsPage,
    limit = smsLimit,
    status = smsStatusFilter,
    search = smsSearch,
    fromDate = smsFromDate,
    toDate = smsToDate,
  } = {}) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get('/sms/logs', {
        params: {
          page,
          limit,
          status,
          search,
          fromDate,
          toDate,
        },
      });
      setLogs(res.data.logs || []);
      setSmsTotal(res.data.pagination?.total || 0);
      setSmsTotalPages(res.data.pagination?.totalPages || 0);
      if (res.data.pagination?.page) {
        setSmsPage(res.data.pagination.page);
      }
    } catch (err) {
      console.error('Failed to load SMS logs', err);
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [smsPage, smsLimit, smsStatusFilter, smsSearch, smsFromDate, smsToDate]);

  const charCount = message.length;
  const partSize = 160;
  const parts = Math.max(1, Math.ceil(charCount / partSize));

  const startNewSession = (total) => {
    const sessionId = `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeSessionId.current = sessionId;
    setSendProgress({
      sessionId,
      status: 'started',
      total,
      sent: 0,
      failed: 0,
      pending: total,
      lastRecipient: null,
      lastStatus: 'started',
      timestamp: new Date().toISOString(),
    });
    setSendEvents([]);
    return sessionId;
  };

  const handleSend = async () => {
    setSending(true);
    setStatus(null);
    setDeliveryReport(null);

    const numberList = (typeof numbers === 'string' ? numbers.split(/,|\n/) : numbers || [])
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      if (numberList.length === 0) throw new Error('Please enter at least one phone number');
      if (!message.trim()) throw new Error('Message is required');
      if (/<[^>]+>/.test(message)) throw new Error('HTML or tags are not allowed in SMS messages');

      const sessionId = startNewSession(numberList.length);
      const res = await axios.post('/sms/send', { numbers, message, sendSessionId: sessionId });

      if (!res.data.success) throw new Error(res.data.error || 'Failed to send SMS');

      setStatus({ success: true, results: res.data.results });
      if (res.data.summary) {
        setDeliveryReport(res.data.summary);
        const { total, successful, failed } = res.data.summary;
        toast.success(`Delivery report: ${successful}/${total} sent, ${failed} failed`);

        if (!socketConnected) {
          setSendProgress({
            sessionId,
            status: 'completed',
            total,
            sent: successful,
            failed,
            pending: 0,
            lastRecipient: null,
            lastStatus: 'completed',
            summary: res.data.summary,
            completed: true,
            timestamp: new Date().toISOString(),
          });
        }
      }

      fetchLogs();
    } catch (err) {
      setStatus({ success: false, error: err.message });
      if (!socketConnected) {
        setSendProgress((prev) => ({
          ...prev,
          status: 'failed',
          error: err.message,
          completed: true,
          timestamp: new Date().toISOString(),
        }));
      }
    }

    setSending(false);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all SMS logs?')) return;
    try {
      await axios.delete('/sms/logs');
      fetchLogs();
    } catch (err) {
      alert('Failed to clear logs');
    }
  };

  return (
    <div>
      <div className="bg-white p-6 rounded shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold mb-1">Compose SMS</h3>
            <p className="text-sm text-gray-500">Send bulk SMS with live status updates while the send process is active.</p>
          </div>
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${socketConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {socketConnected ? 'Live SMS updates enabled' : 'Live updates unavailable'}
          </div>
        </div>

        {sendProgress && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Live SMS Progress</h4>
                <p className="text-sm text-gray-500">Real-time counters and status refresh as each SMS is processed.</p>
              </div>
              <span className="text-sm font-medium text-gray-900">Session: {sendProgress.sessionId}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm text-gray-500">Queued</div>
                <div className="text-2xl font-semibold text-gray-900">{sendProgress.total ?? 0}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm text-gray-500">Sent</div>
                <div className="text-2xl font-semibold text-emerald-600">{sendProgress.sent ?? 0}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm text-gray-500">Failed</div>
                <div className="text-2xl font-semibold text-rose-600">{sendProgress.failed ?? 0}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm text-gray-500">Pending</div>
                <div className="text-2xl font-semibold text-gray-900">{sendProgress.pending ?? 0}</div>
              </div>
            </div>

            <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
                style={{ width: `${sendProgress.total ? Math.round(((sendProgress.sent ?? 0) + (sendProgress.failed ?? 0)) / sendProgress.total * 100) : 0}%` }}
              />
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Status: <span className="font-semibold text-gray-800">{sendProgress.status || 'waiting'}</span>
              {sendProgress.lastRecipient && (
                <span> — Last: <span className="font-medium">{sendProgress.lastRecipient}</span> ({sendProgress.lastStatus})</span>
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {sendEvents.length === 0 ? (
                <div className="text-sm text-gray-500">Waiting for live SMS activity...</div>
              ) : (
                sendEvents.map((event, idx) => (
                  <div key={`${event.recipient}-${idx}`} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span className="font-medium">{event.recipient}</span>
                      <span className={event.status === 'sent' ? 'text-emerald-600' : 'text-rose-600'}>{event.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</div>
                    {event.error && <div className="text-xs text-red-500 mt-1">{event.error}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
        {deliveryReport && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">SMS Sending Completed</h3>
            <p className="text-sm">Total SMS Processed: <strong>{deliveryReport.total}</strong></p>
            <p className="text-sm text-green-700">Successfully Sent: <strong>{deliveryReport.successful}</strong></p>
            <p className="text-sm text-red-700">Failed: <strong>{deliveryReport.failed}</strong></p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-black text-white rounded">{sending ? 'Sending...' : 'Send SMS'}</button>
        </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">SMS Activity Log</h3>
            <p className="text-sm text-gray-500">Browse SMS delivery records with filters, search, and pagination.</p>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && <button onClick={handleClearLogs} className="bg-red-500 text-white px-3 py-1 rounded text-sm">Clear</button>}
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              value={smsSearch}
              onChange={(e) => {
                setSmsSearch(e.target.value);
                setSmsPage(1);
              }}
              placeholder="Recipient, message, provider id"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={smsStatusFilter}
              onChange={(e) => {
                setSmsStatusFilter(e.target.value);
                setSmsPage(1);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option>All</option>
              <option>Sent</option>
              <option>Failed</option>
              <option>Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={smsFromDate}
              onChange={(e) => {
                setSmsFromDate(e.target.value);
                setSmsPage(1);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={smsToDate}
              onChange={(e) => {
                setSmsToDate(e.target.value);
                setSmsPage(1);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600">Showing {logs.length} of {smsTotal} matching records</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-gray-700">Rows per page</label>
            <select
              value={smsLimit}
              onChange={(e) => {
                setSmsLimit(parseInt(e.target.value, 10));
                setSmsPage(1);
              }}
              className="rounded border border-gray-300 px-3 py-2"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingLogs ? (
            <div>Loading logs...</div>
          ) : (
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

                {smsTotalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-gray-600">Page {smsPage} of {smsTotalPages}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSmsPage(Math.max(1, smsPage - 1))}
                        disabled={smsPage === 1}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(7, smsTotalPages) }, (_, idx) => {
                        const startPage = Math.max(1, Math.min(smsPage - 3, smsTotalPages - 6));
                        const pageNumber = startPage + idx;
                        return pageNumber <= smsTotalPages ? (
                          <button
                            key={pageNumber}
                            onClick={() => setSmsPage(pageNumber)}
                            className={`rounded border px-3 py-1 text-sm ${pageNumber === smsPage ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
                          >
                            {pageNumber}
                          </button>
                        ) : null;
                      })}
                      <button
                        onClick={() => setSmsPage(Math.min(smsTotalPages, smsPage + 1))}
                        disabled={smsPage === smsTotalPages}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
      </div>
    </div>
  );
}
