/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./src/index.html"
  ],
  theme: {
    extend: {
      keyframes: {
        appear: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
      },
      animation: {
        appear: "appear 1s ease-in-out",
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
