import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  provider: 'smtp',
  smtpHost: '',
  smtpPort: '',
  smtpUser: '',
  smtpPass: '',
  smtpEncryption: 'ssl',
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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      setError('Failed to save settings.');
    }
    setSaving(false);
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
              placeholder="SMTP Port"
              required
            />
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
            <label className="block font-semibold mt-2 mb-1">Encryption</label>
            <select
              name="smtpEncryption"
              value={form.smtpEncryption}
              onChange={handleChange}
              className="border p-2 w-full"
            >
              <option value="ssl">SSL</option>
              <option value="tls">TLS</option>
            </select>
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
        <div className="flex gap-4 mt-4">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
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
