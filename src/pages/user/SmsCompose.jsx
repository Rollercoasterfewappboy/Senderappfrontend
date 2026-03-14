import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SmsCompose() {
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  // Delivery report returned from backend after an SMS send attempt
  const [deliveryReport, setDeliveryReport] = useState(null);

  useEffect(() => { fetchLogs(); }, []);

  // Clear delivery report when user edits fields
  useEffect(() => {
    setDeliveryReport(null);
    setStatus(null);
  }, [numbers, message]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get('/sms/logs');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load SMS logs');
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
    try {
      if (!numbers.trim()) throw new Error('Please enter at least one phone number');
      if (!message.trim()) throw new Error('Message is required');
      // Prevent HTML
      if (/<[^>]+>/.test(message)) throw new Error('HTML or tags are not allowed in SMS messages');

      const res = await axios.post('/sms/send', { numbers, message });
      if (!res.data.success) throw new Error(res.data.error || 'Failed to send SMS');
      setStatus({ success: true, results: res.data.results });
      // Set delivery report if available
      if (res.data.summary) {
        setDeliveryReport(res.data.summary);
        const { total, successful, failed } = res.data.summary;
        toast.success(`Delivery report: ${successful}/${total} sent, ${failed} failed`);
      }
      fetchLogs();
    } catch (err) {
      setStatus({ success: false, error: err.message });
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">SMS Activity Log</h3>
          {logs.length > 0 && <button onClick={handleClearLogs} className="bg-red-500 text-white px-3 py-1 rounded text-sm">Clear</button>}
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
          )}
        </div>
      </div>
    </div>
  );
}
