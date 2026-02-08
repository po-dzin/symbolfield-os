export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'os-dark': 'var(--semantic-color-bg-app)',
        'os-grey': 'var(--semantic-color-bg-surface)',
        'sf-surface': 'var(--semantic-color-bg-surface)',
        'sf-text-primary': 'var(--semantic-color-text-primary)',
        'sf-text-secondary': 'var(--semantic-color-text-secondary)',
        'sf-border': 'var(--semantic-color-border-default)',

        // Accents (Mapped to Primitives)
        'os-cyan': 'var(--primitive-color-accent-cyan)',
        'os-cyan-dim': 'rgba(111, 228, 255, 0.1)',
        'os-violet': 'var(--primitive-color-accent-lilac)',
        'os-violet-dim': 'rgba(205, 190, 255, 0.1)',
        'os-amber': 'var(--primitive-color-accent-peach)',

        // XP Colors (Moderately Intense, Refined)
        'os-hp': 'var(--primitive-color-utility-success)',
        'os-hp-glow': '#8fefac',
        'os-ep': 'var(--primitive-color-utility-info)',
        'os-ep-glow': '#67e8f9',
        'os-mp': 'var(--primitive-color-utility-warning)',
        'os-mp-glow': '#fdba74',

        'os-sp': '#d4d4d0', // Warm silver (was #e2e8f0)
        'os-sp-glow': '#ededeb', // Warm silver glow
        'os-np': '#C9FFF9', // Spectral

        // Text (Adaptive)
        'os-text-primary': 'var(--semantic-color-text-primary)',
        'os-text-secondary': 'var(--semantic-color-text-secondary)',
        'os-text-meta': 'var(--semantic-color-text-muted)',

        // Glass (Adaptive)
        'os-glass-border': 'var(--glass-border)',
        'os-glass-bg': 'var(--glass-bg)',
        'os-surface-highlight': 'rgba(255, 255, 255, 0.05)',
        'os-surface-dim': 'rgba(0, 0, 0, 0.2)',
        'sf-zinc-900': 'var(--primitive-color-n1-bg)', // Mapping to new bg
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
