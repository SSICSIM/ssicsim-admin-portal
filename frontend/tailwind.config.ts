import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--ssicsim-bg)",
        "bg-soft": "var(--ssicsim-bg-soft)",
        surface: "var(--ssicsim-surface)",
        "surface-soft": "var(--ssicsim-surface-soft)",
        ink: "var(--ssicsim-text)",
        "ink-muted": "var(--ssicsim-text-muted)",
        border: "var(--ssicsim-border)",
        brand: {
          navy: "var(--ssicsim-brand-navy)",
          gold: "var(--ssicsim-brand-gold)",
          "gold-bright": "var(--ssicsim-brand-gold-bright)",
          "gold-soft": "var(--ssicsim-brand-gold-soft)"
        }
      },
      fontFamily: {
        body: ["var(--font-body)", "Segoe UI", "sans-serif"],
        heading: ["var(--font-heading)", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        ssicsim: "var(--ssicsim-shadow)"
      }
    }
  },
  plugins: []
};

export default config;

