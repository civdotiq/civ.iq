/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import {
  Spinner,
  ProgressBar,
  LoadingMessage,
  LoadingStateWrapper,
} from '@/shared/components/ui/LoadingStates';
import {
  RepresentativeSkeleton,
  VotingRecordsSkeleton,
  SearchResultsSkeleton,
  DistrictMapSkeleton,
} from '@/shared/components/ui/SkeletonComponents';
import { useSmartLoading, useMultiStageLoading } from '@/hooks/useSmartLoading';

export function LoadingDemo() {
  const [activeDemo, setActiveDemo] = useState<string>('spinners');

  // Demo with smart loading hook
  const smartLoading = useSmartLoading(
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
    },
    { timeout: 5000 }
  );

  // Demo with multi-stage loading
  const multiStageLoading = useMultiStageLoading([
    'Connecting to server...',
    'Authenticating...',
    'Loading data...',
    'Processing results...',
    'Finalizing...',
  ]);

  const startMultiStageDemo = async () => {
    multiStageLoading.start();

    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (i < 4) multiStageLoading.nextStage();
    }

    multiStageLoading.complete();
  };

  const demos = {
    spinners: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Loading Spinners</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <Spinner size="sm" />
            <p className="text-sm mt-2">Small</p>
          </div>
          <div className="text-center">
            <Spinner size="md" />
            <p className="text-sm mt-2">Medium</p>
          </div>
          <div className="text-center">
            <Spinner size="lg" />
            <p className="text-sm mt-2">Large</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Different Colors</h4>
          <div className="flex items-center gap-6">
            <Spinner color="blue" />
            <Spinner color="green" />
            <Spinner color="gray" />
          </div>
        </div>
      </div>
    ),

    progress: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Progress Indicators</h3>
        <ProgressBar progress={25} label="Basic Progress" />
        <ProgressBar progress={60} label="With Percentage" showPercentage />
        <ProgressBar progress={90} label="Almost Complete" showPercentage />
      </div>
    ),

    messages: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Loading Messages</h3>
        <LoadingMessage
          message="Finding Your Representatives"
          submessage="Looking up your district and gathering representative information..."
        />
        <LoadingMessage
          message="Processing Data"
          submessage="This may take a moment..."
          showSpinner={false}
        />
      </div>
    ),

    skeletons: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Skeleton Screens</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Representative Card</h4>
            <RepresentativeSkeleton />
          </div>
          <div>
            <h4 className="font-medium mb-3">District Map</h4>
            <DistrictMapSkeleton />
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-3">Voting Records Table</h4>
          <VotingRecordsSkeleton rows={3} />
        </div>
        <div>
          <h4 className="font-medium mb-3">Search Results</h4>
          <SearchResultsSkeleton count={2} />
        </div>
      </div>
    ),

    smart: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Smart Loading with Timeout & Retry</h3>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => smartLoading.start()}
            className="px-4 py-2 bg-civiq-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={smartLoading.loading}
          >
            Start Loading
          </button>
          <button
            onClick={() => smartLoading.setError(new Error('Simulated error for demo'))}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Simulate Error
          </button>
          <button
            onClick={() => smartLoading.reset()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>

        <LoadingStateWrapper
          loading={smartLoading.loading}
          error={smartLoading.error}
          retry={smartLoading.retry}
          loadingMessage="Simulating API call..."
          timeoutMessage="This is taking longer than expected"
        >
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium">✓ Loading Complete!</p>
            <p className="text-green-600 mt-1">Data loaded successfully.</p>
          </div>
        </LoadingStateWrapper>

        {smartLoading.showTimeout && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              ⏱️ Timeout detected after {Math.round(smartLoading.timeElapsed / 1000)}s
            </p>
          </div>
        )}
      </div>
    ),

    multistage: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Multi-Stage Loading</h3>
        <div className="flex gap-4 mb-4">
          <button
            onClick={startMultiStageDemo}
            className="px-4 py-2 bg-civiq-green text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={multiStageLoading.loading}
          >
            Start Multi-Stage Demo
          </button>
          <button
            onClick={() => multiStageLoading.reset()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="space-y-4">
          <ProgressBar
            progress={multiStageLoading.progress}
            label={multiStageLoading.currentStage || 'Loading...'}
            showPercentage
          />

          {multiStageLoading.loading && (
            <LoadingMessage
              message={multiStageLoading.currentStage || 'Loading...'}
              submessage={`Step ${multiStageLoading.currentStageIndex + 1} of 5`}
            />
          )}

          {!multiStageLoading.loading && multiStageLoading.progress === 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800 font-medium">✓ All Stages Complete!</p>
            </div>
          )}
        </div>
      </div>
    ),
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Loading States Demo</h1>
        <p className="text-gray-600">
          Comprehensive loading system with spinners, skeletons, progress indicators, and smart
          error handling.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200">
        {Object.keys(demos).map(demo => (
          <button
            key={demo}
            onClick={() => setActiveDemo(demo)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeDemo === demo
                ? 'border-civiq-blue text-civiq-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {demo.charAt(0).toUpperCase() + demo.slice(1)}
          </button>
        ))}
      </div>

      {/* Demo Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {demos[activeDemo as keyof typeof demos]}
      </div>

      {/* Implementation Guide */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Implementation Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium mb-2">Basic Usage</h3>
            <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              {`import { useSmartLoading } from '@/hooks/useSmartLoading';

const loading = useSmartLoading(async () => {
  const data = await api.getData();
  setData(data);
});

// In component
<LoadingStateWrapper
  loading={loading.loading}
  error={loading.error}
  retry={loading.retry}
>
  <DataComponent />
</LoadingStateWrapper>`}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Features</h3>
            <ul className="text-gray-600 space-y-1">
              <li>• Automatic timeout detection (10s default)</li>
              <li>• Smart retry with exponential backoff</li>
              <li>• Multi-stage progress tracking</li>
              <li>• Content-aware skeleton screens</li>
              <li>• Touch-friendly error recovery</li>
              <li>• Consistent visual feedback</li>
              <li>• Zero infinite loading states</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
