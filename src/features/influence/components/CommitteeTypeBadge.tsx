/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

interface CommitteeTypeBadgeProps {
  committeeType: string;
  designation: string;
  className?: string;
}

const TYPE_LABELS: Record<string, string> = {
  superPac: 'Super PAC',
  traditional: 'PAC',
  leadership: 'Leadership PAC',
  hybrid: 'Hybrid PAC',
};

const TYPE_COLORS: Record<string, string> = {
  superPac: 'bg-[#e11d07] text-white',
  traditional: 'bg-gray-800 text-white',
  leadership: 'bg-[#3ea2d4] text-white',
  hybrid: 'bg-gray-600 text-white',
};

function classifyPACTypeLocal(
  ct: string,
  des: string
): 'superPac' | 'traditional' | 'leadership' | 'hybrid' | null {
  if (ct === 'O') return 'superPac';
  if (des === 'D' || des === 'J') return 'leadership';
  if (des === 'B' && ct === 'N') return 'hybrid';
  if (ct === 'N' || ct === 'Q') return 'traditional';
  return null;
}

export function CommitteeTypeBadge({
  committeeType,
  designation,
  className = '',
}: CommitteeTypeBadgeProps) {
  const pacType = classifyPACTypeLocal(committeeType, designation);

  if (!pacType) {
    // Fallback for non-PAC committee types
    const fallbackLabels: Record<string, string> = {
      H: 'House',
      S: 'Senate',
      P: 'Presidential',
      X: 'Party',
      Y: 'Party',
      Z: 'Party',
      E: 'Electioneering',
      C: 'Communication',
    };

    const label = fallbackLabels[committeeType] ?? 'Committee';

    return (
      <span
        className={`inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-gray-200 text-gray-700 ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${TYPE_COLORS[pacType]} ${className}`}
    >
      {TYPE_LABELS[pacType]}
    </span>
  );
}
