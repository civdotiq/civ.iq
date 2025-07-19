/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { LoadingMessage } from '@/components/ui/LoadingStates';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingMessage 
        message="Loading CIV.IQ"
        submessage="Preparing your civic information dashboard"
      />
    </div>
  );
}