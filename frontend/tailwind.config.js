/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  extend: {
    colors: {
      primary: "#0F172A",
      accent: "#6366F1",
      darkbg: "#0B1120",
      darkcard: "#1E293B",
      darkborder: "#334155",
      darktext: "#E2E8F0",
    },
  },
},

  plugins: [],
}
