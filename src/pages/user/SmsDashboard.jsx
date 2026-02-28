import { useState } from 'react';
import SmsCompose from './SmsCompose';
import SmsSettings from './SmsSettings';

export default function SmsDashboard() {
  const [view, setView] = useState('compose'); // 'compose' or 'settings'

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">SMS Sender</h2>
        <div className="flex gap-2">
          <button onClick={() => setView('compose')} className={`px-3 py-1 rounded ${view==='compose'?'bg-black text-white':'border'}`}>Compose</button>
          <button onClick={() => setView('settings')} className={`px-3 py-1 rounded ${view==='settings'?'bg-black text-white':'border'}`}>Settings</button>
        </div>
      </div>

      {view === 'compose' ? <SmsCompose /> : <SmsSettings />}
    </div>
  )
}
