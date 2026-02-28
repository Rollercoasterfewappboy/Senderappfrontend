import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SmsSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/sms/settings');
      setSettings(res.data.settings || {});
    } catch (err) {
      setSettings({});
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/sms/settings', settings);
      alert('SMS settings saved');
    } catch (err) {
      alert('Save failed: ' + (err.message || '')); 
    }
    setSaving(false);
  };

  if (loading) return <div>Loading SMS settings...</div>;

  return (
    <div className="bg-white p-6 rounded shadow mt-4">
      <h3 className="text-lg font-bold mb-3">SMS Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Provider</label>
          <select value={settings.provider || ''} onChange={(e) => setSettings(s => ({ ...s, provider: e.target.value }))} className="border p-2 w-full">
            <option value="">Select provider</option>
            <option value="twilio">Twilio</option>
            <option value="nexmo">Nexmo (Vonage)</option>
            <option value="plivo">Plivo</option>
            <option value="aws">AWS SNS</option>
            <option value="custom">Custom HTTP API</option>
            <option value="mock">Mock (dev)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Enabled</label>
          <input type="checkbox" checked={!!settings.enabled} onChange={(e) => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
        </div>
        <div>
          <label className="block text-sm font-medium">Default Country Code</label>
          <input value={settings.defaultCountryCode || '+1'} onChange={(e) => setSettings(s => ({ ...s, defaultCountryCode: e.target.value }))} className="border p-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">Sender Type</label>
          <select value={settings.senderType || 'phone'} onChange={(e) => setSettings(s => ({ ...s, senderType: e.target.value }))} className="border p-2 w-full">
            <option value="phone">Phone Number</option>
            <option value="alphanumeric">Alphanumeric ID</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">Sender Value</label>
          <input value={settings.senderValue || ''} onChange={(e) => setSettings(s => ({ ...s, senderValue: e.target.value }))} className="border p-2 w-full" />
        </div>
      </div>

      {/* Dynamic credential fields for Twilio (example). More can be added similarly. */}
      {settings.provider === 'twilio' && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Twilio Credentials</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Account SID</label>
              <input value={settings.credentials?.accountSid || ''} onChange={(e) => setSettings(s => ({ ...s, credentials: { ...(s.credentials||{}), accountSid: e.target.value } }))} className="border p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium">Auth Token</label>
              <input value={settings.credentials?.authToken || ''} onChange={(e) => setSettings(s => ({ ...s, credentials: { ...(s.credentials||{}), authToken: e.target.value } }))} className="border p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium">From (Phone)</label>
              <input value={settings.credentials?.from || ''} onChange={(e) => setSettings(s => ({ ...s, credentials: { ...(s.credentials||{}), from: e.target.value } }))} className="border p-2 w-full" />
            </div>
          </div>
        </div>
      )}

      {settings.provider === 'custom' && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Custom Provider</h4>
          <div>
            <label className="block text-sm font-medium">Send URL</label>
            <input value={settings.credentials?.sendUrl || ''} onChange={(e) => setSettings(s => ({ ...s, credentials: { ...(s.credentials||{}), sendUrl: e.target.value } }))} className="border p-2 w-full" />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-black text-white rounded">{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  )
}
