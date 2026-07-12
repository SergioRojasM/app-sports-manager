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
        turquoise: "#00e5c4",
        "accent-teal": "#00e5c4",
        "card-dark": "#161e2e",
        "background-light": "#f5f6f8",
        "background-dark": "#080c14",
        "navy-deep": "#0f172a",
        "navy-medium": "#161e2e",
        "navy-soft": "#1d2638",
        // Portal / dashboard design tokens — aligned with LoginBenefitsPanel palette
        "portal-primary": "#00e5c4",
        "portal-secondary": "#00f5d4",
        "portal-bg": "#080c14",
        "portal-card": "rgba(22, 30, 46, 0.7)",
        "portal-border": "rgba(255, 255, 255, 0.06)",
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
      },
      fontFamily: {
        display: ["var(--font-lexend)", "sans-serif"],
        "landing-display": ["var(--font-rajdhani)", "sans-serif"],
        "landing-body": ["var(--font-montserrat)", "sans-serif"],
      },
      borderRadius: {
        lg: "2rem",
        xl: "3rem",
      },
    },
  },
  plugins: [],
};

export default config;
