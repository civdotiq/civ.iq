/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        civiq: {
          red: '#e11d07',
          green: '#0a9338',
          blue: '#3ea2d4',
          'blue-cool': '#2d8fc9', // Cool blue for data visualization
        },
        // Add the specific blue for consistency
        'civiq-red': '#e11d07',
        'civiq-green': '#0a9338',
        'civiq-blue': '#3ea2d4',
        'civiq-blue-cool': '#2d8fc9',
        // Status semantic colors (not party colors)
        'status-info': '#4b5563',
        'status-warning': '#d97706',
        'status-error': '#b45309',
        'status-success': '#3ea2d4',
        // Party identification colors
        'party-dem': '#0a9338',
        'party-rep': '#e11d07',
        'party-ind': '#6b7280',
        // Chromatic greys — Aicher/ERCO tradition for categorical data visualization
        'data-vlau': '#6b6b83',
        'data-vlau-light': '#8e8ea0',
        'data-greige': '#b8b5a9',
        'data-greige-light': '#d4d2c9',
      },
      // Otl Aicher 8px grid system - Complete scale
      spacing: {
        'grid-1': '8px',
        'grid-2': '16px',
        'grid-3': '24px',
        'grid-4': '32px',
        'grid-5': '40px',
        'grid-6': '48px',
        'grid-7': '56px',
        'grid-8': '64px',
        'grid-9': '72px',
        'grid-10': '80px',
        'grid-12': '96px',
        'grid-16': '128px',
        'rhythm-compact': '24px',
        'rhythm-section': '40px',
        'rhythm-break': '64px',
      },
      borderWidth: {
        aicher: '2px',
        structural: '2px', // Cards, containers
        divider: '1px', // List separators
        emphasis: '3px', // Selected states
      },
      letterSpacing: {
        aicher: '0.05em',
        'aicher-wide': '0.1em',
        // Size-dependent tracking (references CSS variables)
        'aicher-display': 'var(--tracking-display, -0.02em)',
        'aicher-heading': 'var(--tracking-heading, 0.02em)',
        'aicher-body': 'var(--tracking-body, 0.025em)',
        'aicher-label': 'var(--tracking-label, 0.08em)',
      },
      borderRadius: {
        interactive: '3px',
      },
      boxShadow: {
        elevated: '0 4px 12px rgba(0,0,0,0.12)',
        tooltip: '0 2px 6px rgba(0,0,0,0.15)',
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('lite', '[data-lite] &');
    }),
  ],
} satisfies Config;
