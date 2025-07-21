/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import RepresentativePhoto from './RepresentativePhoto';
import { EnhancedRepresentative } from '@/types/representative';
import { CardTheme, CardCustomization } from './CardCustomizationPanel';

interface CardStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

interface TradingCardProps {
  representative: EnhancedRepresentative;
  stats: CardStat[];
  className?: string;
  customization?: CardCustomization;
  cardId?: string;
}

export function RepresentativeTradingCard({ representative, stats, className = '', customization, cardId }: TradingCardProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Generate QR code when cardId is provided
  useEffect(() => {
    if (cardId && customization?.includeQRCode) {
      const cardUrl = `https://civ.iq/c/${cardId}?utm_source=card&utm_medium=qr&utm_campaign=trading_card`;
      QRCode.toDataURL(cardUrl, {
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [cardId, customization?.includeQRCode]);

  const getPartyColor = (party: string) => {
    switch (party?.toLowerCase()) {
      case 'republican':
      case 'r':
        return {
          primary: '#e11d09',
          secondary: '#fef2f2',
          accent: '#dc2626',
          text: '#991b1b',
          background: '#ffffff'
        };
      case 'democratic':
      case 'democrat':
      case 'd':
        return {
          primary: '#3ea0d2',
          secondary: '#eff6ff',
          accent: '#2563eb',
          text: '#1e40af',
          background: '#ffffff'
        };
      case 'independent':
      case 'i':
        return {
          primary: '#6b7280',
          secondary: '#f9fafb',
          accent: '#4b5563',
          text: '#374151',
          background: '#ffffff'
        };
      default:
        return {
          primary: '#6b7280',
          secondary: '#f9fafb',
          accent: '#4b5563',
          text: '#374151',
          background: '#ffffff'
        };
    }
  };

  const partyColors = getPartyColor(representative.party);
  
  // Use customization colors if provided, otherwise use party colors
  const cardColors = customization?.showPartyColors === false && customization?.theme
    ? customization.theme.colors
    : partyColors;
  
  const displayName = representative.fullName?.nickname || representative.firstName;
  const fullDisplayName = `${displayName} ${representative.lastName}`;
  
  // Apply font size from customization
  const fontSizeClass = customization?.fontSize === 'small' ? 'text-sm' : 
                       customization?.fontSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div 
      className={`trading-card relative w-80 h-[500px] rounded-xl shadow-lg overflow-hidden ${className}`}
      style={{ backgroundColor: cardColors.background }}
    >
      {/* Header Section with Party Color */}
      <div 
        className="relative h-32 flex items-end p-4"
        style={{ backgroundColor: cardColors.primary }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent"></div>
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white opacity-20"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white opacity-20"></div>
        </div>
        
        {/* Representative Photo */}
        <div className="relative z-10 flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg">
            <RepresentativePhoto 
              bioguideId={representative.bioguideId}
              name={representative.name}
              size="md"
              className="w-full h-full rounded-full"
            />
          </div>
          
          {/* Name and Title */}
          <div className="text-white">
            <h2 className={`${customization?.fontSize === 'small' ? 'text-lg' : customization?.fontSize === 'large' ? 'text-2xl' : 'text-xl'} font-bold leading-tight`}>
              {fullDisplayName}
            </h2>
            <p className={`${customization?.fontSize === 'small' ? 'text-xs' : 'text-sm'} opacity-90`}>
              {representative.title}
            </p>
          </div>
        </div>
      </div>

      {/* Party and District Badges */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span 
              className="px-2 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: partyColors.accent }}
            >
              {representative.party}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
              {representative.state}{representative.district ? `-${representative.district}` : ''}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {representative.chamber}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-3 h-full">
          {stats.slice(0, 4).map((stat, index) => (
            <div 
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
              </div>
              <div 
                className="text-lg font-bold"
                style={{ color: stat.color || partyColors.text }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* Enhanced CIV.IQ Branding */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <svg className="w-6 h-6" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
                <circle cx="50" cy="31" r="22" fill="#ffffff"/>
                <circle cx="50" cy="31" r="20" fill="#e11d07"/>
                <circle cx="38" cy="89" r="2" fill="#3ea2d4"/>
                <circle cx="46" cy="89" r="2" fill="#3ea2d4"/>
                <circle cx="54" cy="89" r="2" fill="#3ea2d4"/>
                <circle cx="62" cy="89" r="2" fill="#3ea2d4"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">CIV.IQ</div>
              <div className="text-xs text-gray-500">Civic Intelligence</div>
            </div>
          </div>

          {/* Center section for URL or other info */}
          <div className="flex-1 text-center">
            {cardId && (
              <div className="text-xs text-gray-600 font-mono">
                civ.iq/c/{cardId}
              </div>
            )}
          </div>

          {/* QR Code and Year */}
          <div className="flex items-center space-x-2">
            {qrCodeDataUrl && customization?.includeQRCode && (
              <div className="w-8 h-8 bg-white rounded border border-gray-200 p-1">
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  className="w-full h-full"
                />
              </div>
            )}
            <div className="text-xs text-gray-500">
              {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sample stats for testing
export const getSampleStats = (representative: EnhancedRepresentative): CardStat[] => [
  {
    label: 'Party Support',
    value: '87%',
    icon: '🎯',
    color: '#059669'
  },
  {
    label: 'Years in Office',
    value: representative.terms?.length || 0,
    icon: '📅',
    color: '#7c3aed'
  },
  {
    label: 'Bills Sponsored',
    value: '42',
    icon: '📜',
    color: '#dc2626'
  },
  {
    label: 'Committee Roles',
    value: representative.committees?.length || 0,
    icon: '🏛️',
    color: '#2563eb'
  }
];

export default RepresentativeTradingCard;