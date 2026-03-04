import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6366f1', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f1f5f9', foreground: '#0f172a' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
        muted: { DEFAULT: '#f8fafc', foreground: '#64748b' },
        accent: { DEFAULT: '#e0e7ff', foreground: '#4338ca' },
        border: '#e2e8f0',
        background: '#ffffff',
        foreground: '#0f172a',
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
    },
  },
  plugins: [],
} satisfies Config;
