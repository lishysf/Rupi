'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function PollingDebug() {
  const { data: session } = useSession();
  const [testResult, setTestResult] = useState<string>('');

  const testPolling = async () => {
    if (!session?.user?.id) {
      setTestResult('No session user ID');
      return;
    }

    try {
      // Test polling endpoint
      const response = await fetch(`/api/polling-updates?userId=${session.user.id}&since=0`);
      const updates = await response.json();
      
      setTestResult(`Polling test successful. Updates: ${JSON.stringify(updates, null, 2)}`);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">Polling Debug</h3>
      <p className="text-sm mb-2">User ID: {session?.user?.id || 'None'}</p>
      <button
        onClick={testPolling}
        className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm mb-2"
      >
        Test Polling
      </button>
      {testResult && (
        <div className="text-xs bg-gray-700 p-2 rounded overflow-auto max-h-32">
          <pre>{testResult}</pre>
        </div>
      )}
    </div>
  );
}
