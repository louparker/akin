// Akin design tokens — typography
// Source: akin_design_system.zip / tokens.jsx + screens

export const typography = {
  // Body / UI copy: Inter (open-source, Google Fonts / bundled)
  bodyFamily: 'Inter',

  // Display / headlines: Source Serif 4 (confirmed in design handoff — NOT GT Sectra)
  // Used for: wordmark "akin", post titles, screen headlines, identifier reveal
  displayFamily: 'Source Serif 4',

  // Mono: JetBrains Mono (open-source)
  // Used ONLY for: anonymous identifiers, character counters, category mono labels
  monoFamily: 'JetBrains Mono',

  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 30,
    display: 44,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 1.05,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.6,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.3,
    wider: 1.2,
    widest: 2,
  },
} as const;
