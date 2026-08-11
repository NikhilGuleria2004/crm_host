/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F4C81',
        'primary-foreground': '#FFFFFF',
        accent: '#2563EB',
        'accent-foreground': '#FFFFFF',
        background: '#F5F7FA',
        card: '#FFFFFF',
        border: '#D6DCE5',
        foreground: '#1F2937',
        muted: '#6B7280',
        'muted-foreground': '#6B7280',
        success: '#15803D',
        warning: '#CA8A04',
        danger: '#B91C1C',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
