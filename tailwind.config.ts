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
        primary: "#256af4",
        turquoise: "#00e5c4",
        "background-light": "#f5f6f8",
        "background-dark": "#101622",
        "navy-deep": "#080c14",
        "navy-medium": "#161e2e",
        "navy-soft": "#1d2638",
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
