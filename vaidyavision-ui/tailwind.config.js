/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#52B788',
          600: '#40916C',
          700: '#2D6A4F',
          800: '#1B4332',
          900: '#0B2A1E',
        },
        sage: {
          DEFAULT: '#52B788',
          light: '#74C69D',
          dark: '#40916C',
        },
        amber: {
          DEFAULT: '#F4A261',
          light: '#F4C089',
          dark: '#E76F51',
        },
        surface: {
          DEFAULT: '#F8F9F2',
          card: '#FFFFFF',
          muted: '#F1F3EC',
        },
        ink: {
          DEFAULT: '#1A1A2E',
          muted: '#6B7280',
          light: '#9CA3AF',
        },
        authentic: {
          DEFAULT: '#2D6A4F',
          bg: '#B7E4C7',
        },
        suspicious: {
          DEFAULT: '#9B1C1C',
          bg: '#FEE2E2',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(27, 67, 50, 0.08)',
        'glass-lg': '0 16px 48px rgba(27, 67, 50, 0.12)',
        'glass-xl': '0 24px 64px rgba(27, 67, 50, 0.16)',
        card: '0 1px 3px rgba(27, 67, 50, 0.06), 0 1px 2px rgba(27, 67, 50, 0.04)',
        'card-hover': '0 10px 40px rgba(27, 67, 50, 0.12)',
      },
      backgroundImage: {
        'gradient-forest': 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)',
        'gradient-sage': 'linear-gradient(135deg, #52B788 0%, #74C69D 100%)',
        'gradient-hero': 'linear-gradient(135deg, #F8F9F2 0%, #E8F5E9 50%, #F8F9F2 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delay': 'float 6s ease-in-out 2s infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'count-up': 'countUp 2s ease-out forwards',
        'border-pulse': 'borderPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        borderPulse: {
          '0%, 100%': { borderColor: 'rgba(82, 183, 136, 0.3)' },
          '50%': { borderColor: 'rgba(82, 183, 136, 0.8)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}