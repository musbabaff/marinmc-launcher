import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0F111A',
          card: '#161925',
          cardHover: '#1F2435',
          accent: '#8B5CF6',
          accentHover: '#A78BFA',
          accentLight: 'rgba(139, 92, 246, 0.1)',
          text: '#F3F4F6',
          textMuted: '#9CA3AF',
          gold: '#FBBF24',
          goldHover: '#F59E0B',
          success: '#10B981',
          error: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 15px rgba(139, 92, 246, 0.35)',
        'glow-purple-lg': '0 0 25px rgba(139, 92, 246, 0.5)',
        'glow-gold': '0 0 15px rgba(251, 191, 36, 0.35)',
        'glow-success': '0 0 15px rgba(16, 185, 129, 0.35)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'launcher-bg': 'radial-gradient(circle at center, #1E1B4B 0%, #0F111A 100%)',
      }
    },
  },
  plugins: [],
}

export default config;
