import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      sessionId: null,
      isAuthenticated: false,
      role: null,
      permissions: [],

      setAuth: ({ user, access_token, refresh_token, session_id }) =>
        set({
          user,
          token: access_token,
          refreshToken: refresh_token,
          sessionId: session_id,
          isAuthenticated: true,
          role: user?.role || null,
          permissions: user?.role_obj?.permissions || [],
        }),

      setToken: (token) => set({ token }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          sessionId: null,
          isAuthenticated: false,
          role: null,
          permissions: [],
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),

      hasPermission: (permission) => {
        return get().permissions.includes(permission);
      },
    }),
    {
      name: "edusphere-auth",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
