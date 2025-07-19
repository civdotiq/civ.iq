/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        civiq: {
          red: "#e11d09",
          green: "#0a9338",
          blue: "#3ea0d2",
        },
        // Add the specific blue for consistency
        'civiq-red': '#e11d09',
        'civiq-green': '#0a9338',
        'civiq-blue': '#3ea0d2',
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