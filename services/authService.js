import api from "../lib/axios";

export const authService = {
  async login({ identifier, password }) {
    const response = await api.post("/auth/login", { identifier, password });
    return response;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear local state even if API call fails
    }
  },

  async refreshToken(refresh_token) {
    const response = await api.post("/auth/refresh-token", { refresh_token });
    return response;
  },

  async forgotPassword(email) {
    const response = await api.post("/auth/forgot-password", { email });
    return response;
  },

  async resetPassword({ token, password }) {
    const response = await api.post("/auth/reset-password", { token, password });
    return response;
  },
};
