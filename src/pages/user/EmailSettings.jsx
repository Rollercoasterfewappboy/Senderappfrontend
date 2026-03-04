import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  provider: 'smtp',
  smtpHost: '',
  smtpPort: '',
  smtpUser: '',
  smtpPass: '',
  smtpEncryption: 'ssl',
  smtpRequireAuth: true, // ✅ NEW: Support unauthenticated SMTP
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: '',
  resendApiKey: '',
  fromEmail: '',
};

export default function EmailSettings({ onSave, onCancel, initialSettings }) {
  // Initialize form with a function to handle initialSettings at mount time
  const [form, setForm] = useState(() => {
    if (initialSettings) {
      return { ...DEFAULT_SETTINGS, ...initialSettings };
    }
    return DEFAULT_SETTINGS;
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false); // loading state for connection test
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sync form with initialSettings whenever it changes
  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setForm((prev) => {
        const updated = { ...DEFAULT_SETTINGS, ...initialSettings };
        // Only update if there are actual changes to avoid unnecessary re-renders
        return JSON.stringify(updated) !== JSON.stringify(prev) ? updated : prev;
      });
    }
  }, [initialSettings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleClearForm = () => {
    if (window.confirm('Clear all Email Settings? This cannot be undone.')) {
      setForm(DEFAULT_SETTINGS);
      setSuccess(null);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onSave(form);
      setSuccess('Settings saved!');
      // Do not reset form after save; keep values as is
    } catch (err) {
      const msg = err?.message || 'Failed to save settings.';
      setError(msg);
      // also notify via toast
      try { toast.error(msg); } catch (e) {}
    }
    setSaving(false);
  };

  // Explicit connection test without saving
  const handleTestConnection = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      // reuse onSave's mapping logic by calling a lightweight endpoint
      const provider = form.provider;
      const smtp = provider === 'smtp' ? {
        host: form.smtpHost,
        port: form.smtpPort,
        username: form.smtpUser,
        password: form.smtpPass,
        encryption: form.smtpEncryption || 'ssl',
        requireAuth: form.smtpRequireAuth,
      } : null;
      const aws = provider === 'aws' ? {
        username: form.awsAccessKeyId,
        password: form.awsSecretAccessKey,
        region: form.awsRegion,
      } : null;
      const resend = provider === 'resend' ? { apiKey: form.resendApiKey } : null;
      await axios.post('/email/settings/test', { provider, smtp, aws, resend }, { timeout: 20000 });
      setSuccess('Connection test succeeded');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Connection test failed';
      setError(`Test failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Email Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Provider</label>
          <select
            name="provider"
            value={form.provider}
            onChange={handleChange}
            className="border p-2 w-full"
          >
            <option value="smtp">SMTP</option>
            <option value="aws">AWS SMTP</option>
            <option value="resend">Resend API</option>
          </select>
        </div>
        {form.provider === 'smtp' && (
          <>
            <input
              type="text"
              name="smtpHost"
              value={form.smtpHost}
              onChange={handleChange}
              className="border p-2 w-full"
              placeholder="SMTP Host"
              required
            />
            <input
              type="number"
              name="smtpPort"
              value={form.smtpPort}
              onChange={handleChange}
              className="border p-2 w-full"
              placeholder="SMTP Port (25, 465, 587, etc.)"
              required
            />
            
            {/* ✅ NEW: Encryption Dropdown */}
            <div>
              <label className="block font-semibold mb-1">Encryption</label>
              <select
                name="smtpEncryption"
                value={form.smtpEncryption}
                onChange={handleChange}
                className="border p-2 w-full"
              >
                <option value="ssl">SSL (Port 465)</option>
                <option value="tls">STARTTLS (Port 25, 587)</option>
                <option value="none">None (Port 25)</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                • SSL: Encrypted connection from the start<br/>
                • STARTTLS: Start encrypted after initial connect<br/>
                • None: Direct unencrypted connection (IP-trusted only)
              </p>
            </div>

            {/* ✅ NEW: Authentication Toggle */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="smtpRequireAuth"
                name="smtpRequireAuth"
                checked={form.smtpRequireAuth}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <label htmlFor="smtpRequireAuth" className="font-semibold">
                Require SMTP Authentication
              </label>
            </div>
            {!form.smtpRequireAuth && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                ⚠️ Without authentication, connection will rely on IP trust. Ensure your server is configured for Port 25 direct relay.
              </p>
            )}

            {/* Show username/password only if authentication is required */}
            {form.smtpRequireAuth && (
              <>
                <input
                  type="text"
                  name="smtpUser"
                  value={form.smtpUser}
                  onChange={handleChange}
                  className="border p-2 w-full"
                  placeholder="SMTP Username"
                  required
                />
                <input
                  type="password"
                  name="smtpPass"
                  value={form.smtpPass}
                  onChange={handleChange}
                  className="border p-2 w-full"
                  placeholder="SMTP Password"
                  required
                />
              </>
            )}
          </>
        )}
        {form.provider === 'aws' && (
          <>
            <input
              type="text"
              name="awsAccessKeyId"
              value={form.awsAccessKeyId}
              onChange={handleChange}
              className="border p-2 w-full"
              placeholder="AWS Access Key ID"
              required
            />
            <input
              type="password"
              name="awsSecretAccessKey"
              value={form.awsSecretAccessKey}
              onChange={handleChange}
              className="border p-2 w-full"
              placeholder="AWS Secret Access Key"
              required
            />
            <input
              type="text"
              name="awsRegion"
              value={form.awsRegion}
              onChange={handleChange}
              className="border p-2 w-full"
              placeholder="AWS Region"
              required
            />
          </>
        )}
        {form.provider === 'resend' && (
          <input
            type="password"
            name="resendApiKey"
            value={form.resendApiKey}
            onChange={handleChange}
            className="border p-2 w-full"
            placeholder="Resend API Key"
            required
          />
        )}
        <input
          type="email"
          name="fromEmail"
          value={form.fromEmail}
          onChange={handleChange}
          className="border p-2 w-full"
          placeholder="From Email Address"
          required
        />
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}
        <div className="flex gap-4 mt-4 flex-wrap">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-60"
            disabled={testing || saving}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Compose
          </button>
          <button
            type="button"
            onClick={handleClearForm}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}
