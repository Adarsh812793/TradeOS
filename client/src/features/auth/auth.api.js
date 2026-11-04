//This file calls the specific backend api using standard communication that we established earlier

import api from "../../lib/api.js";

const authApi = {
  register(credentials) {
    return api.post("/api/auth/register", credentials);
  },

  login(credentials) {
    return api.post("/api/auth/login", credentials);
  },

  // (There is no refresh() here on purpose: renewing the token goes through refreshSession() in lib/api.js,
  // which makes sure only one renewal runs at a time.)

  logout() {
    return api.post("/api/auth/logout");
  },
};

export default authApi;
