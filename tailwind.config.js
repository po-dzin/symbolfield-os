/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Depths (Mat-Formula v1.0)
        'os-dark': '#0e0f11', // Deep: H220 S8 L6
        'os-grey': '#1c1d21', // Flow: H225 S8 L12
        'os-sand': '#f4ebd0', // Luma: H38 S35 L86
        'os-dark-blue': '#121214', // Graphite (Keep as secondary dark)

        // Accents (Pastels L~65 S~55)
        'os-cyan': '#75cdcd', // Turquoise
        'os-cyan-dim': 'rgba(117, 205, 205, 0.1)',
        'os-violet': '#a175cd', // Violet
        'os-violet-dim': 'rgba(161, 117, 205, 0.1)',
        'os-amber': '#cd8475', // Coral/Amber

        // XP Colors (Moderately Intense, Refined)
        'os-hp': '#52c77a', // Warmer green (was #4ade80)
        'os-hp-glow': '#8fefac',
        'os-ep': '#22d3ee', // Cyan 400
        'os-ep-glow': '#67e8f9', // Cyan 300
        'os-mp': '#fb923c', // Orange 400
        'os-mp-glow': '#fdba74', // Orange 300
        'os-sp': '#d4d4d0', // Warm silver (was #e2e8f0)
        'os-sp-glow': '#ededeb', // Warm silver glow
        'os-np': '#C9FFF9', // Spectral

        // Text (Adaptive)
        'os-text-primary': 'var(--text-primary)',
        'os-text-secondary': 'var(--text-secondary)',
        'os-text-meta': 'var(--text-meta)',

        // Glass (Adaptive)
        'os-glass-border': 'var(--surface-1-border)',
        'os-glass-bg': 'var(--surface-1-bg)',
        'os-surface-highlight': 'var(--surface-highlight)',
        'os-surface-dim': 'var(--surface-dim)',
        'sf-zinc-900': '#0e0f11', // Matches os-dark for consistency
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
