/**
 * CIV.IQ Logo Component - Ulm School Functionalism
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Systematic logo lockup following Otl Aicher principles:
 * - Uses actual PNG logo (pure geometric forms)
 * - Variants for desktop/mobile sizing
 * - No decorative animations (form follows function)
 * - Consistent grid-based spacing
 */

import Image from 'next/image';

interface CiviqLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export function CiviqLogo({ size = 'medium', showText = true, className = '' }: CiviqLogoProps) {
  const sizes = {
    small: { logo: 32, text: 'text-base' },
    medium: { logo: 48, text: 'text-xl' },
    large: { logo: 64, text: 'text-2xl' },
  };

  const config = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/images/civiq-logo.png"
        alt="CIV.IQ Logo"
        width={config.logo}
        height={config.logo}
        className="flex-shrink-0"
        priority
      />
      {showText && (
        <span className={`aicher-heading ${config.text} text-gray-900 tracking-aicher`}>
          CIV.IQ
        </span>
      )}
    </div>
  );
}
