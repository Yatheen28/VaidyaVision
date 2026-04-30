/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* === Stitch "VaidyaVision Botanical Intelligence" tokens === */
        forest: {
          50:  '#e8f5ee',
          100: '#c8e6d2',
          200: '#92f7c3',
          300: '#75daa8',
          400: '#52B788',
          500: '#40916C',
          600: '#2D6A4F',
          700: '#1B4332',
          800: '#111e16',
          900: '#09160e',
          950: '#051109',
        },
        sage: {
          DEFAULT: '#52B788',
          light:   '#75daa8',
          dark:    '#40916C',
          muted:   '#88948b',
        },
        amber: {
          DEFAULT: '#F4A261',
          light:   '#ffb780',
          dark:    '#E76F51',
          deep:    '#763c00',
        },
        /* Surface hierarchy from Stitch design system */
        surface: {
          DEFAULT:   '#09160e',   /* Deep Forest base */
          dim:       '#09160e',
          low:       '#111e16',
          container: '#15221a',
          high:      '#202d24',
          highest:   '#2a382f',
          bright:    '#2f3c33',
          card:      '#FFFFFF',
          muted:     '#F1F3EC',
        },
        ink: {
          DEFAULT: '#d7e7d9',     /* on-surface */
          muted:   '#bdcac0',     /* on-surface-variant */
          light:   '#88948b',     /* outline */
          dark:    '#1A1A2E',
        },
        outline: {
          DEFAULT:  '#88948b',
          variant:  '#3e4942',
        },
        authentic: {
          DEFAULT: '#52B788',
          bg:      '#1a3a2a',
        },
        suspicious: {
          DEFAULT: '#ff6b6b',
          bg:      '#3a1a1a',
        },
        ghost: {
          border: 'rgba(82,183,136,0.15)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['Manrope', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        'display': '-0.04em',
        'heading': '-0.03em',
        'subhead': '-0.02em',
        'caps':    '0.1em',
      },
      boxShadow: {
        'glass':       '0 8px 32px rgba(9, 22, 14, 0.4)',
        'glass-lg':    '0 16px 48px rgba(9, 22, 14, 0.5)',
        'glass-xl':    '0 24px 64px rgba(9, 22, 14, 0.6)',
        'glow-sage':   '0 0 40px rgba(82, 183, 136, 0.15)',
        'glow-amber':  '0 0 40px rgba(244, 162, 97, 0.15)',
        'card':        '0 1px 3px rgba(9, 22, 14, 0.2)',
        'card-hover':  '0 10px 40px rgba(9, 22, 14, 0.4)',
      },
      backgroundImage: {
        'gradient-forest': 'linear-gradient(135deg, #09160e 0%, #111e16 50%, #15221a 100%)',
        'gradient-sage':   'linear-gradient(135deg, #52B788 0%, #75daa8 100%)',
        'gradient-hero':   'linear-gradient(160deg, #09160e 0%, #0d1f14 40%, #111e16 100%)',
        'gradient-card':   'linear-gradient(135deg, rgba(21,34,26,0.6) 0%, rgba(32,45,36,0.4) 100%)',
      },
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'float-slow':   'float 8s ease-in-out infinite',
        'float-delay':  'float 6s ease-in-out 2s infinite',
        'pulse-soft':   'pulse-soft 3s ease-in-out infinite',
        'pulse-ring':   'pulseRing 2s ease-out infinite',
        'spin-slow':    'spin 8s linear infinite',
        'fade-in':      'fadeIn 0.5s ease-out forwards',
        'slide-up':     'slideUp 0.5s ease-out forwards',
        'scale-in':     'scaleIn 0.3s ease-out forwards',
        'shimmer':      'shimmer 2s linear infinite',
        'glow':         'glow 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-10px) rotate(1deg)' },
          '66%':      { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(82,183,136,0.1)' },
          '50%':      { boxShadow: '0 0 40px rgba(82,183,136,0.25)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}