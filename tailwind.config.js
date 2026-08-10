/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",

    // 你的项目实际位置（根目录）
    "./App.tsx",
    "./V5App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",

    // 如果你 src 里也有组件/服务，也一起扫
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
      },
    },
  },
  plugins: [],
};
