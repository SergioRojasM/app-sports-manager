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
        "navy-deep": "#080c14",
        "navy-medium": "#161e2e",
        "navy-soft": "#1d2638",
        // Portal / dashboard design tokens — aligned with LoginBenefitsPanel palette
        "portal-primary": "#00e5c4",
        "portal-secondary": "#00f5d4",
        "portal-bg": "#080c14",
        "portal-card": "rgba(22, 30, 46, 0.7)",
        "portal-border": "rgba(255, 255, 255, 0.06)",
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
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
