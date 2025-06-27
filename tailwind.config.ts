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
      },
    },
  },
  plugins: [],
} satisfies Config;