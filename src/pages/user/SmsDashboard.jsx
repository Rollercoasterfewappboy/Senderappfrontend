import { useState } from 'react';
import SmsCompose from './SmsCompose';
import SmsSettings from './SmsSettings';

export default function SmsDashboard() {
  const [view, setView] = useState('compose'); // 'compose' or 'settings'

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">SMS Sender</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button onClick={() => setView('compose')} className={`w-full sm:w-auto px-3 py-2 rounded-lg ${view==='compose'?'bg-black text-white':'border border-gray-300 text-gray-700'}`}>Compose</button>
          <button onClick={() => setView('settings')} className={`w-full sm:w-auto px-3 py-2 rounded-lg ${view==='settings'?'bg-black text-white':'border border-gray-300 text-gray-700'}`}>Settings</button>
        </div>
      </div>

      {view === 'compose' ? <SmsCompose /> : <SmsSettings />}
    </div>
  )
}
