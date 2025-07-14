'use client';


/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
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
