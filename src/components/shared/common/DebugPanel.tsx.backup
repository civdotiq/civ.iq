'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';

interface DebugInfo {
  timestamp: string;
  [key: string]: unknown;
}

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [pageData, _setPageData] = useState<DebugInfo | null>(null);
  const [clientData, setClientData] = useState<DebugInfo | null>(null);
  const [billsData, setBillsData] = useState<DebugInfo | null>(null);

  useEffect(() => {
    const checkDebugData = () => {
      if (typeof window !== 'undefined') {
        const windowWithDebug = window as unknown as {
          CLIENT_DEBUG_INFO?: DebugInfo;
          BILLS_COMPONENT_DATA?: DebugInfo;
        };

        if (windowWithDebug.CLIENT_DEBUG_INFO) {
          setClientData(windowWithDebug.CLIENT_DEBUG_INFO);
        }
        if (windowWithDebug.BILLS_COMPONENT_DATA) {
          setBillsData(windowWithDebug.BILLS_COMPONENT_DATA);
        }
      }
    };

    // Check immediately and then every 2 seconds
    checkDebugData();
    const interval = setInterval(checkDebugData, 2000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut to toggle debug panel (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 shadow-lg"
          title="Show Debug Panel (Ctrl+Shift+D)"
        >
          🐛 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black text-green-400 p-4 rounded-lg shadow-xl max-w-md max-h-96 overflow-y-auto font-mono text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold">🔍 Phase 2 Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-400 hover:text-red-300"
          title="Hide Debug Panel (Ctrl+Shift+D)"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Page Data */}
        <div>
          <h4 className="text-yellow-400 font-semibold">📄 Page Data</h4>
          {pageData ? (
            <pre className="text-xs overflow-x-auto">{JSON.stringify(pageData, null, 2)}</pre>
          ) : (
            <p className="text-gray-400">No page data captured</p>
          )}
        </div>

        {/* Client Data */}
        <div>
          <h4 className="text-blue-400 font-semibold">🔵 Client Data</h4>
          {clientData ? (
            <pre className="text-xs overflow-x-auto">{JSON.stringify(clientData, null, 2)}</pre>
          ) : (
            <p className="text-gray-400">No client data captured</p>
          )}
        </div>

        {/* Bills Component Data */}
        <div>
          <h4 className="text-orange-400 font-semibold">📊 Bills Component</h4>
          {billsData ? (
            <pre className="text-xs overflow-x-auto">{JSON.stringify(billsData, null, 2)}</pre>
          ) : (
            <p className="text-gray-400">No bills data captured</p>
          )}
        </div>

        {/* Instructions */}
        <div className="text-gray-500 text-xs border-t border-gray-700 pt-2">
          <p>💡 Press Ctrl+Shift+D to toggle</p>
          <p>🔄 Updates every 2 seconds</p>
          <p>📱 Navigate to profile page to see data flow</p>
        </div>
      </div>
    </div>
  );
}
