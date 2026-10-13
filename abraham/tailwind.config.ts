import type { Config } from 'tailwindcss';

/**
 * ABRAHAM design tokens.
 * Colors, type scale, radii and elevation live here so every screen draws from one system.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ink: {
        DEFAULT: '#111111',
        soft: '#2B2927',
        muted: '#4A4744',
      },
      paper: '#F9F8F6',
      white: '#FFFFFF',
      red: {
        DEFAULT: '#C8102E',
        hover: '#AE0E28',
        tint: '#FBEDEF',
      },
      stone: {
        DEFAULT: '#77736F',
        light: '#A29E99',
      },
      line: {
        DEFAULT: '#E9E7E4',
        strong: '#D9D6D2',
      },
      mist: '#F2F0ED',
      success: { DEFAULT: '#2F6B4F', tint: '#EAF2EE' },
      warning: { DEFAULT: '#8A5A00', tint: '#FBF3E2' },
      // Muted tonal fields used by image placeholders until real photography is loaded.
      tone: {
        salmon: '#EAD3C6',
        tuna: '#E3CBC8',
        avocado: '#DCE0CF',
        rice: '#EEEAE3',
        nori: '#2A2C29',
        tempura: '#EADCC2',
        citrus: '#EFE5C8',
        greens: '#D7DFD3',
        drink: '#DCE3E6',
        combo: '#E6DDD3',
      },
    },
    fontFamily: {
      sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
    },
    fontSize: {
      // name: [size, { lineHeight, letterSpacing }]
      micro: ['11px', { lineHeight: '14px', letterSpacing: '0.08em' }],
      caption: ['12px', { lineHeight: '16px', letterSpacing: '0' }],
      footnote: ['13px', { lineHeight: '18px', letterSpacing: '-0.003em' }],
      callout: ['14px', { lineHeight: '20px', letterSpacing: '-0.006em' }],
      body: ['15px', { lineHeight: '22px', letterSpacing: '-0.009em' }],
      headline: ['17px', { lineHeight: '22px', letterSpacing: '-0.014em' }],
      title3: ['20px', { lineHeight: '26px', letterSpacing: '-0.017em' }],
      title2: ['24px', { lineHeight: '30px', letterSpacing: '-0.021em' }],
      title1: ['30px', { lineHeight: '34px', letterSpacing: '-0.024em' }],
      display: ['40px', { lineHeight: '42px', letterSpacing: '-0.032em' }],
      hero: ['56px', { lineHeight: '56px', letterSpacing: '-0.036em' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
    },
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      full: '9999px',
    },
    extend: {
      spacing: {
        // 4/8pt grid is Tailwind's default (1 = 4px). Extra named sizes:
        gutter: '20px',
        tap: '44px',
        tabbar: '64px',
      },
      boxShadow: {
        float: '0 6px 24px -6px rgba(17,17,17,0.18), 0 1px 2px rgba(17,17,17,0.06)',
        sheet: '0 -12px 40px -12px rgba(17,17,17,0.22)',
        hairline: '0 0 0 1px #E9E7E4',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      maxWidth: {
        content: '1180px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        fadeIn: 'fadeIn 200ms ease-out',
        slideUp: 'slideUp 380ms cubic-bezier(0.32, 0.72, 0, 1)',
        toastIn: 'toastIn 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
