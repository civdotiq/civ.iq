'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

export default function SimpleTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
      <p>If you can see this, the app is working.</p>
      
      <div className="mt-8 space-y-4">
        <button 
          onClick={() => fetch('/api/test').then(r => r.json()).then(console.log).catch(console.error)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Test Basic API
        </button>
        
        <button 
          onClick={() => fetch('/api/env-check').then(r => r.json()).then(console.log).catch(console.error)}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Test Env Check
        </button>
      </div>
      
      <p className="mt-4 text-sm text-gray-600">Check browser console for results</p>
    </div>
  );
}
