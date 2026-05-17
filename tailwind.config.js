/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Surfaces
        'bg-base': '#EFEAE2',
        'bg-raised': '#F6F2EB',
        'bg-sunken': '#FBF8F3',
        'bg-inverse': '#231F21',
        // Ink
        'fg-primary': '#231F21',
        'fg-secondary': '#3F3A3B',
        'fg-tertiary': '#6A6464',
        'fg-faint': '#9C9692',
        'fg-inverse': '#EFEAE2',
        // Brand — teal
        'brand-primary': '#2C4D55',
        'brand-soft': '#5C7C84',
        // Spice — only for flames
        spice: '#B54C26',
        // You — only for identifier chip
        you: '#788BFF',
        // Borders
        divider: 'rgba(35,31,33,0.10)',
        hairline: 'rgba(35,31,33,0.06)',
        // Semantic
        danger: '#A23B2C',
        success: '#3F7A5B',
      },
      fontFamily: {
        sans: ['Inter'],
        serif: ['Source Serif 4'],
        mono: ['JetBrains Mono'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['12px', { lineHeight: '1.4' }],
        base: ['14px', { lineHeight: '1.5' }],
        md: ['15px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.5' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.1' }],
        display: ['44px', { lineHeight: '1.05' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
        xxxl: '48px',
        xxxxl: '64px',
      },
    },
  },
  plugins: [],
};
