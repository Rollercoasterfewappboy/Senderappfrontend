import { useState } from 'react';

/**
 * PlaceholderInsertModal - Modal for inserting professional placeholder tags
 * Shows professional email sending system placeholders for mass email campaigns
 */
export default function PlaceholderInsertModal({ onInsert, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Professional system placeholders (client-side - matches backend)
  const placeholders = [
    // Recipient Data
    { placeholder: '{RECIPIENT_NAME}', label: 'Recipient Name', example: 'John', category: 'Recipient Data' },
    { placeholder: '{RECIPIENT_EMAIL}', label: 'Recipient Email Address', example: 'john@example.com', category: 'Recipient Data' },
    { placeholder: '{RECIPIENT_DOMAIN}', label: 'Recipient Domain', example: 'gmail.com', category: 'Recipient Data' },
    { placeholder: '{RECIPIENT_DOMAIN_NAME}', label: 'Recipient Domain Name', example: 'gmail', category: 'Recipient Data' },
    { placeholder: '{RECIPIENT_BASE64_EMAIL}', label: 'Base64 EMAIL Encoded', example: 'am9obkBleGFtcGxlLmNvbQ==', category: 'Recipient Data' },
    
    // Date & Time
    { placeholder: '{CURRENT_DATE}', label: 'Current Date', example: '2/22/2026', category: 'Date & Time' },
    { placeholder: '{CURRENT_TIME}', label: 'Current Time', example: '2:30:45 PM', category: 'Date & Time' },
    
    // Random/Generated Data
    { placeholder: '{RANDOM_NUMBER10}', label: 'Random 10-Digit Number', example: '1234567890', category: 'Generated Data' },
    { placeholder: '{RANDOM_STRING}', label: 'Random String', example: 'aB3xYz9', category: 'Generated Data' },
    { placeholder: '{RANDOM_MD5}', label: 'Random MD5 Hash', example: '5d41402abc4b2a76b9719d911017c592', category: 'Generated Data' },
    { placeholder: '{RANDOM_PATH}', label: 'Random Path', example: '/path/to/resource', category: 'Generated Data' },
    { placeholder: '{RANDLINK}', label: 'Random Link', example: 'https://example.com/track/abc123xyz', category: 'Generated Data' },
    
    // Fake Company Data
    { placeholder: '{FAKE_COMPANY}', label: 'Fake Company Name', example: 'TechNova Solutions', category: 'Fake Company Data' },
    { placeholder: '{FAKE_COMPANY_EMAIL}', label: 'Fake Company Email', example: 'contact@technova.com', category: 'Fake Company Data' },
    { placeholder: '{FAKE_COMPANY_EMAIL_AND_FULLNAME}', label: 'Fake Company Email and Full Name', example: 'John Smith <contact@technova.com>', category: 'Fake Company Data' },
  ];

  // Group placeholders by category
  const categories = [...new Set(placeholders.map(p => p.category))];

  // Filter placeholders based on search
  const filteredPlaceholders = placeholders.filter(p =>
    p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.placeholder.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered results by category
  const groupedPlaceholders = categories.reduce((acc, cat) => {
    const items = filteredPlaceholders.filter(p => p.category === cat);
    if (items.length > 0) {
      acc[cat] = items;
    }
    return acc;
  }, {});

  const handleInsert = (placeholder) => {
    onInsert(placeholder);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[calc(100vh-120px)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Professional Email Placeholders</h2>
            <p className="text-xs text-gray-500 mt-1">Insert dynamic placeholders that automatically customize emails for each recipient</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-auto max-h-[calc(100vh-200px)]">
          {/* Search */}
          <input
            type="text"
            placeholder="Search placeholders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />

          {/* Placeholder List by Category */}
          <div className="overflow-y-auto space-y-4">
            {Object.entries(groupedPlaceholders).length > 0 ? (
              Object.entries(groupedPlaceholders).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">{category}</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <button
                        key={item.placeholder}
                        onClick={() => handleInsert(item.placeholder)}
                        className="w-full text-left px-4 py-3 rounded border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-mono font-bold text-blue-600 group-hover:text-blue-700">
                              {item.placeholder}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{item.label}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Example: <span className="text-gray-500">{item.example}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                No placeholders found
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-gray-700">
            <strong>💡 Pro Tip:</strong> <span>Professional system placeholders like <code className="bg-white px-1 py-0.5 rounded text-blue-600">{'{RECIPIENT_NAME}'}</code> are automatically replaced with actual data for each recipient when you send the email.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
