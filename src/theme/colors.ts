// Akin design tokens — colours
// Source of truth: akin_design_system.zip / tokens.jsx
// Do not add colours here without updating tailwind.config.js too.

export const colors = {
  // Surfaces — warm bone, not pure white
  bg: {
    base: '#EFEAE2', // bone — primary app surface
    raised: '#F6F2EB', // cards, elevated surfaces
    sunken: '#FBF8F3', // input fields, modals
    inverse: '#231F21', // shadow grey — dark surfaces
  },

  // Ink — Shadow Grey
  fg: {
    primary: '#231F21',
    secondary: '#3F3A3B',
    tertiary: '#6A6464',
    faint: '#9C9692',
    inverse: '#EFEAE2',
    onAccent: '#FFFFFF',
  },

  // Brand — teal (Dark Slate Grey). NOT aubergine.
  brand: {
    primary: '#2C4D55',
    primarySoft: '#5C7C84',
    primaryTint: 'rgba(44,77,85,0.08)',
  },

  // Spice — rust/flame. ONLY for 1-5 flame icons and spice-vote UI.
  spice: {
    color: '#B54C26',
    soft: 'rgba(181,76,38,0.12)',
  },

  // "You" marker — blue. ONLY for current-user identifier chip.
  you: {
    color: '#788BFF',
    soft: 'rgba(120,139,255,0.10)',
  },

  // Borders + dividers
  border: {
    divider: 'rgba(35,31,33,0.10)',
    hairline: 'rgba(35,31,33,0.06)',
  },

  // Semantic
  semantic: {
    danger: '#A23B2C',
    dangerSoft: 'rgba(162,59,44,0.12)',
    success: '#3F7A5B',
  },
} as const;

// Dark mode token overrides.
// Applied when the device colour scheme is 'dark'.
export const darkColors = {
  bg: {
    base: '#1A1716',
    raised: '#231F21',
    sunken: '#2A2625',
    inverse: '#EFEAE2',
  },
  fg: {
    primary: '#EDE9E1',
    secondary: '#C4BFBA',
    tertiary: '#8C8682',
    faint: '#5E5A57',
    inverse: '#231F21',
    onAccent: '#FFFFFF',
  },
  brand: {
    primary: '#7AAAB4',
    primarySoft: '#5C7C84',
    primaryTint: 'rgba(122,170,180,0.12)',
  },
  spice: {
    color: '#D96035',
    soft: 'rgba(217,96,53,0.15)',
  },
  you: {
    color: '#8B9BFF',
    soft: 'rgba(139,155,255,0.12)',
  },
  border: {
    divider: 'rgba(237,233,225,0.12)',
    hairline: 'rgba(237,233,225,0.07)',
  },
  semantic: {
    danger: '#C4503F',
    dangerSoft: 'rgba(196,80,63,0.15)',
    success: '#4D9070',
  },
} as const;
