import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SMTP_CONFIG = {
  name: '',
  enabled: true,
  host: '',
  port: '',
  username: '',
  password: '',
  encryption: 'ssl',
  requireAuth: true,
};

export default function EmailSettings({ onSave, onCancel, initialSettings }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    provider: 'smtp',
    smtp: [],
    aws: { username: '', password: '', region: '' },
    resend: { apiKey: '' },
    fromEmail: '',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sync form with initialSettings
  useEffect(() => {
    if (initialSettings) {
      setForm(prev => ({ ...prev, ...initialSettings }));
    }
  }, [initialSettings]);

  const handleProviderChange = (e) => {
    setForm(prev => ({ ...prev, provider: e.target.value }));
  };

  const handleSmtpChange = (index, field, value) => {
    setForm(prev => {
      const newSmtp = [...prev.smtp];
      newSmtp[index] = { ...newSmtp[index], [field]: value };
      return { ...prev, smtp: newSmtp };
    });
  };

  const addSmtpConfig = () => {
    setForm(prev => ({
      ...prev,
      smtp: [...prev.smtp, { ...DEFAULT_SMTP_CONFIG, name: `SMTP ${prev.smtp.length + 1}` }]
    }));
  };

  const removeSmtpConfig = (index) => {
    if (window.confirm('Remove this SMTP configuration?')) {
      setForm(prev => ({
        ...prev,
        smtp: prev.smtp.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAwsChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      aws: { ...prev.aws, [field]: value }
    }));
  };

  const handleResendChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      resend: { ...prev.resend, [field]: value }
    }));
  };

  const handleFromEmailChange = (value) => {
    setForm(prev => ({ ...prev, fromEmail: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onSave(form);
      setSuccess('Settings saved!');
    } catch (err) {
      const msg = err?.message || 'Failed to save settings.';
      setError(msg);
      toast.error(msg);
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const res = await axios.post('/email/settings/test', form, { timeout: 20000 });
      if (res.data && res.data.success) {
        setSuccess(res.data.message || 'Connected Successfully.');
      } else {
        setError(res.data?.message ? `Connection Failed: ${res.data.message}` : 'Connection Failed.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Connection test failed';
      setError(`Connection Failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow max-w-4xl">
      <h2 className="text-xl font-bold mb-4">Email Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold mb-1">Provider</label>
          <select
            value={form.provider}
            onChange={handleProviderChange}
            className="border p-2 w-full"
          >
            <option value="smtp">SMTP (Multiple configs with rotation)</option>
            <option value="aws">AWS SMTP</option>
            <option value="resend">Resend API</option>
          </select>
        </div>

        {form.provider === 'smtp' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">SMTP Configurations</h3>
              <button type="button" onClick={addSmtpConfig} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                Add SMTP
              </button>
            </div>
            {form.smtp.length === 0 ? (
              <p className="text-gray-500">No SMTP configurations. Click "Add SMTP" to get started.</p>
            ) : (
              form.smtp.map((smtp, index) => (
                <div key={index} className="border rounded p-4 mb-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{smtp.name || `SMTP ${index + 1}`}</h4>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={smtp.enabled}
                          onChange={(e) => handleSmtpChange(index, 'enabled', e.target.checked)}
                        />
                        Enabled
                      </label>
                      <button type="button" onClick={() => removeSmtpConfig(index)} className="text-red-500 text-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={smtp.name}
                      onChange={(e) => handleSmtpChange(index, 'name', e.target.value)}
                      className="border p-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Host"
                      value={smtp.host}
                      onChange={(e) => handleSmtpChange(index, 'host', e.target.value)}
                      className="border p-2"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Port"
                      value={smtp.port}
                      onChange={(e) => handleSmtpChange(index, 'port', e.target.value)}
                      className="border p-2"
                      required
                    />
                    <select
                      value={smtp.encryption}
                      onChange={(e) => handleSmtpChange(index, 'encryption', e.target.value)}
                      className="border p-2"
                    >
                      <option value="ssl">SSL</option>
                      <option value="tls">TLS</option>
                      <option value="none">None</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`requireAuth-${index}`}
                        checked={smtp.requireAuth}
                        onChange={(e) => handleSmtpChange(index, 'requireAuth', e.target.checked)}
                      />
                      <label htmlFor={`requireAuth-${index}`} className="text-sm">Require Auth</label>
                    </div>
                    {smtp.requireAuth && (
                      <>
                        <input
                          type="text"
                          placeholder="Username"
                          value={smtp.username}
                          onChange={(e) => handleSmtpChange(index, 'username', e.target.value)}
                          className="border p-2"
                          required
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={smtp.password}
                          onChange={(e) => handleSmtpChange(index, 'password', e.target.value)}
                          className="border p-2"
                          required
                        />
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {form.provider === 'aws' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="AWS Access Key ID"
              value={form.aws.username}
              onChange={(e) => handleAwsChange('username', e.target.value)}
              className="border p-2 w-full"
              required
            />
            <input
              type="password"
              placeholder="AWS Secret Access Key"
              value={form.aws.password}
              onChange={(e) => handleAwsChange('password', e.target.value)}
              className="border p-2 w-full"
              required
            />
            <input
              type="text"
              placeholder="AWS Region"
              value={form.aws.region}
              onChange={(e) => handleAwsChange('region', e.target.value)}
              className="border p-2 w-full"
              required
            />
          </div>
        )}

        {form.provider === 'resend' && (
          <input
            type="text"
            placeholder="Resend API Key"
            value={form.resend.apiKey}
            onChange={(e) => handleResendChange('apiKey', e.target.value)}
            className="border p-2 w-full"
            required
          />
        )}

        <input
          type="email"
          placeholder="From Email"
          value={form.fromEmail}
          onChange={(e) => handleFromEmailChange(e.target.value)}
          className="border p-2 w-full"
          required
        />

        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/user/email-compose')} className="bg-gray-500 text-white px-4 py-2 rounded">
            Back to Compose
          </button>
          <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button type="button" onClick={handleTestConnection} disabled={testing} className="border px-4 py-2 rounded">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button type="button" onClick={onCancel} className="border px-4 py-2 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
