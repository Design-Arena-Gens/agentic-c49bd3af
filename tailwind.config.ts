import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Open Sans", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#1e88e5",
          foreground: "#ffffff",
          light: "#64b5f6",
          dark: "#1565c0",
        },
        accent: {
          DEFAULT: "#26a69a",
          foreground: "#ffffff",
          light: "#4db6ac",
          dark: "#1c7d74",
        },
        danger: "#ef5350",
        warning: "#ffb300",
        success: "#43a047",
        background: "#f4f7fb",
        surface: "#ffffff",
        border: "#e0e6ed",
        slate: {
          950: "#0e1726",
        },
      },
      boxShadow: {
        card: "0 15px 35px -12px rgba(30, 136, 229, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
