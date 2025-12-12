import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const newTheme = get().theme === "light" ? "dark" : "light";
        set({ theme: newTheme });
        applyTheme(newTheme);
      },
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Initialize theme on load
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("theme-storage");
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      applyTheme(state.theme);
    } catch {
      applyTheme("light");
    }
  }
}
