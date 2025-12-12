import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";

interface User {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  role: "admin" | "manager" | "cashier";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const response = await api.post("/auth/login", { username, password });
        const { user, token } = response.data.data;

        set({ user, token, isAuthenticated: true });
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common["Authorization"];
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const response = await api.get("/auth/me");
          set({ user: response.data.data, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          delete api.defaults.headers.common["Authorization"];
        }
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
