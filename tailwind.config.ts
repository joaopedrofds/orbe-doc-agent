import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        orbe: {
          navy: "#0D0D14",
          navyLight: "#16161F",
          accent: "#7C3AED",
          accentHover: "#6D28D9",
          bg: "#0D0D14",
          border: "#2A2A3A",
          surface: "#16161F",
          textPrimary: "#F1F5F9",
          textSecondary: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
