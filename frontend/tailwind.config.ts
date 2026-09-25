import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "fd-white": "#FFFFFF",
        "fd-pearl": "#FAF8F5",
        "fd-khaki": "#DFDACF",
        "fd-taupe": "#A3968D",
        "fd-cacao": "#4D403A",
        "fd-leather": "#262626",
        "fd-leather-hover": "#3A3A3A",
        "fd-success": "#6B8E5A",
        "fd-warning": "#B08D57",
        "fd-error": "#A3453A",
        "fd-info": "#6B7A8F",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
