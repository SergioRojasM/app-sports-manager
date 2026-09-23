import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Auth / landing page colours
        primary: "#256af4",
        // @deprecated for Portal code (US-0116) — use grit.cyan
        turquoise: "#00e5c4",
        // @deprecated for Portal code (US-0116) — use grit.cyan
        "accent-teal": "#00e5c4",
        // @deprecated for Portal code (US-0116) — use grit.card / grit.bg (card-dark, navy-*)
        "card-dark": "#161e2e",
        "background-light": "#f5f6f8",
        "background-dark": "#080c14",
        "navy-deep": "#0f172a",
        "navy-medium": "#161e2e",
        "navy-soft": "#1d2638",
        "landing-bg": "#07111F",
        "landing-surface": "#0F172A",
        "landing-surface-elevated": "#132034",
        "landing-surface-card": "#162338",
        "landing-primary": "#14DBC4",
        "landing-primary-dark": "#0FA3AB",
        "landing-primary-light": "#49F5E2",
        "landing-secondary": "#1E3A5F",
        "landing-text": "#E6EDF3",
        "landing-text-secondary": "#BAC7D5",
        "landing-text-muted": "#7F8EA3",
        "landing-border": "#213247",
        "landing-divider": "#1A293A",
        // grit-arena-v2 design tokens (US-0116). Solid colours are hex so opacity
        // modifiers (bg-grit-cyan/15) work; translucent ones reference the CSS vars
        // in globals.css and must be used without an opacity modifier.
        grit: {
          bg: "#07111F",
          cyan: "#14DBC4",
          "cyan-light": "#49F5E2",
          teal: "#0FA3AB",
          text: "#E6EDF3",
          subtext: "#BAC7D5",
          muted: "#8A9AAB",
          glass: "var(--grit-glass-fill)",
          "glass-border": "var(--grit-glass-border)",
          card: "var(--grit-card-fill)",
          sidebar: "var(--grit-sidebar-fill)",
          success: "#3DDC97",
          danger: "#FF6B6B",
          discipline: {
            swim: "#14DBC4",
            cycle: "#0FA3AB",
            run: "#F2B84B",
            strength: "#B98AFF",
            functional: "#FF6B6B",
            mobility: "#6BCB77",
          },
        },
      },
      fontFamily: {
        display: ["var(--font-lexend)", "sans-serif"],
        "landing-display": ["var(--font-rajdhani)", "sans-serif"],
        "landing-body": ["var(--font-montserrat)", "sans-serif"],
        "grit-title": ["var(--font-rajdhani)", "sans-serif"],
        "grit-body": ["var(--font-montserrat)", "sans-serif"],
      },
      borderRadius: {
        // Legacy overrides relied on by landing/auth — do NOT use rounded-lg/xl in
        // Portal code; use the rounded-grit-* scale instead (US-0116)
        lg: "2rem",
        xl: "3rem",
        "grit-xs": "6px",
        "grit-sm": "8px",
        "grit-md": "10px",
        "grit-lg": "12px",
        "grit-xl": "14px",
        "grit-2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
