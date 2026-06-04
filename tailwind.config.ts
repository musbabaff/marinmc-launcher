import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: 'var(--bg-primary)',
        bgSecondary: 'var(--bg-secondary)',
        bgTertiary: 'var(--bg-tertiary)',
        bgCard: 'var(--bg-card)',
        borderSubtle: 'var(--border-subtle)',
        borderDefault: 'var(--border-default)',
        accentPurple: 'var(--accent-purple)',
        accentPurpleHover: 'var(--accent-purple-hover)',
        accentTeal: 'var(--accent-teal)',
        accentGreen: 'var(--accent-green)',
        accentRed: 'var(--accent-red)',
        accentAmber: 'var(--accent-amber)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        textMuted: 'var(--text-muted)',
        // Keep brand mappings for backward compatibility if needed
        brand: {
          bg: 'var(--bg-primary)',
          card: 'var(--bg-secondary)',
          cardHover: 'var(--bg-tertiary)',
          accent: 'var(--accent-purple)',
          accentHover: 'var(--accent-purple-hover)',
          accentLight: 'rgba(139, 92, 246, 0.1)',
          text: 'var(--text-primary)',
          textMuted: 'var(--text-secondary)',
          gold: 'var(--accent-amber)',
          goldHover: '#F59E0B',
          success: 'var(--accent-green)',
          error: 'var(--accent-red)',
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
        'launcher-bg': 'radial-gradient(circle at center, #1E1B4B 0%, #0A0A0A 100%)',
      }
    },
  },
  plugins: [],
}

export default config;
