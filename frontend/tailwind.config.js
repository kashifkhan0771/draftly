/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        th: {
          accent: "var(--th-accent)",
          "accent-hover": "var(--th-accent-hover)",
          "accent-light": "var(--th-accent-light)",
          bg: "var(--th-bg)",
          sidebar: "var(--th-sidebar)",
          surface: "var(--th-surface)",
          text: "var(--th-text)",
          "text-muted": "var(--th-text-muted)",
          border: "var(--th-border)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
