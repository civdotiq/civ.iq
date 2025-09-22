'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Example component demonstrating Zustand state management
 */

import { useCallback } from 'react';
import { useRepresentativesStore, useUIStore, useLegislationStore } from '@/store';

export function ZustandExample() {
  // Representatives Store
  const {
    representatives,
    filters,
    loading: repsLoading,
    setRepresentatives,
    setFilters,
    setLoading: setRepsLoading,
    getFilteredRepresentatives,
  } = useRepresentativesStore();

  // UI Store
  const { notifications, modalOpen, addNotification, openModal, closeModal, setGlobalLoading } =
    useUIStore();

  // Legislation Store
  const {
    bills,
    votes: _votes,
    filters: legislationFilters,
    setBills,
    setFilters: _setLegislationFilters,
    getFilteredBills,
  } = useLegislationStore();

  // Example: Add a notification
  const handleAddNotification = useCallback(() => {
    addNotification({
      type: 'success',
      message: 'This is a test notification from Zustand!',
      duration: 3000,
    });
  }, [addNotification]);

  // Example: Update filters
  const handleUpdateFilters = useCallback(() => {
    setFilters({
      state: 'TX',
      party: 'D',
    });
  }, [setFilters]);

  // Example: Simulate loading representatives
  const handleLoadRepresentatives = useCallback(async () => {
    setRepsLoading(true);
    setGlobalLoading(true, 'Loading representatives...');

    // Simulate API call
    setTimeout(() => {
      const mockReps = [
        {
          bioguideId: 'A000001',
          name: 'John Doe',
          state: 'TX',
          party: 'D',
          chamber: 'House' as const,
          district: '1',
          title: 'Representative',
          imageUrl: '',
          office: '123 House Office Building',
          phone: '202-225-0000',
          website: 'https://example.house.gov',
          committees: [],
        },
        {
          bioguideId: 'B000002',
          name: 'Jane Smith',
          state: 'CA',
          party: 'R',
          chamber: 'Senate' as const,
          district: undefined,
          title: 'Senator',
          imageUrl: '',
          office: '456 Senate Office Building',
          phone: '202-224-0000',
          website: 'https://example.senate.gov',
          committees: [],
        },
      ];

      setRepresentatives(mockReps);
      setRepsLoading(false);
      setGlobalLoading(false);

      addNotification({
        type: 'success',
        message: `Loaded ${mockReps.length} representatives`,
      });
    }, 2000);
  }, [setRepsLoading, setGlobalLoading, setRepresentatives, addNotification]);

  // Example: Open modal
  const handleOpenModal = useCallback(() => {
    openModal('example-modal', {
      title: 'Example Modal',
      content: 'This modal data is stored in Zustand!',
    });
  }, [openModal]);

  // Example: Add legislation
  const handleAddBill = useCallback(() => {
    const newBill = {
      id: `bill-${Date.now()}`,
      congress: 119,
      type: 'H.R.',
      number: '1234',
      title: 'Example Bill for Testing Zustand',
      sponsor: {
        bioguideId: 'A000001',
        name: 'John Doe',
        party: 'D',
        state: 'TX',
      },
      cosponsors: 5,
      committees: ['House Committee on Energy and Commerce'],
      status: 'Introduced',
      lastAction: {
        date: new Date().toISOString(),
        description: 'Introduced in House',
      },
      introducedDate: new Date().toISOString(),
      subjects: ['Healthcare', 'Technology'],
      relatedBills: [],
    };

    setBills([...bills, newBill]);

    addNotification({
      type: 'info',
      message: 'Added new bill to legislation store',
    });
  }, [bills, setBills, addNotification]);

  const filteredReps = getFilteredRepresentatives();
  const filteredBills = getFilteredBills();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Zustand State Management Example</h1>

      {/* Representatives Section */}
      <section className="mb-8 p-4 border">
        <h2 className="text-xl font-semibold mb-4">Representatives Store</h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={handleLoadRepresentatives}
              disabled={repsLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {repsLoading ? 'Loading...' : 'Load Representatives'}
            </button>

            <button
              onClick={handleUpdateFilters}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Set Filter (TX Democrats)
            </button>
          </div>

          <div>
            <h3 className="font-medium mb-2">Current Filters:</h3>
            <pre className="bg-white border-2 border-gray-300 p-2 rounded text-sm">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">
              Representatives ({filteredReps.length} filtered / {representatives.length} total):
            </h3>
            {filteredReps.length > 0 ? (
              <ul className="space-y-1">
                {filteredReps.map(rep => (
                  <li key={rep.bioguideId} className="text-sm">
                    {rep.name} ({rep.party}-{rep.state})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No representatives loaded</p>
            )}
          </div>
        </div>
      </section>

      {/* UI Store Section */}
      <section className="mb-8 p-4 border">
        <h2 className="text-xl font-semibold mb-4">UI Store</h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={handleAddNotification}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Add Notification
            </button>

            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Open Modal
            </button>
          </div>

          <div>
            <h3 className="font-medium mb-2">Active Notifications ({notifications.length}):</h3>
            {notifications.length > 0 ? (
              <ul className="space-y-1">
                {notifications.map(notif => (
                  <li key={notif.id} className="text-sm">
                    [{notif.type}] {notif.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No active notifications</p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Modal State:</h3>
            <p className="text-sm">{modalOpen ? `Modal"${modalOpen}" is open` : 'No modal open'}</p>
            {modalOpen && (
              <button
                onClick={closeModal}
                className="mt-2 px-3 py-1 bg-white0 text-white rounded text-sm hover:bg-gray-600"
              >
                Close Modal
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Legislation Store Section */}
      <section className="mb-8 p-4 border">
        <h2 className="text-xl font-semibold mb-4">Legislation Store</h2>

        <div className="space-y-4">
          <button
            onClick={handleAddBill}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Add Sample Bill
          </button>

          <div>
            <h3 className="font-medium mb-2">Bills ({filteredBills.length}):</h3>
            {filteredBills.length > 0 ? (
              <ul className="space-y-1">
                {filteredBills.map(bill => (
                  <li key={bill.id} className="text-sm">
                    {bill.type} {bill.number}: {bill.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No bills loaded</p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Legislation Filters:</h3>
            <pre className="bg-white border-2 border-gray-300 p-2 rounded text-sm">
              {JSON.stringify(legislationFilters, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section className="p-4 bg-blue-50">
        <h2 className="text-lg font-semibold mb-2">How to Use Zustand in Your Components</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Import the store hooks:{' '}
            <code className="bg-white px-1 py-0.5 rounded">
              {'import { useRepresentativesStore } from"@/store"'}
            </code>
          </li>
          <li>Destructure the state and actions you need from the hook</li>
          <li>Use the state values in your component render</li>
          <li>Call the action functions to update state</li>
          <li>
            State changes will automatically trigger re-renders in all components using that store
          </li>
        </ol>
      </section>
    </div>
  );
}
