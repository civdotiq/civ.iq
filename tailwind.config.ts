/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        civiq: {
          red: '#e11d09',
          green: '#0a9338',
          blue: '#3ea0d2',
        },
        // Add the specific blue for consistency
        'civiq-red': '#e11d09',
        'civiq-green': '#0a9338',
        'civiq-blue': '#3ea0d2',
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
      },
      borderWidth: {
        aicher: '2px',
      },
      letterSpacing: {
        aicher: '0.05em',
        'aicher-wide': '0.1em',
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
  plugins: [],
} satisfies Config;
