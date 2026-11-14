//This file calls the specific backend api using standard communication that we established earlier

import api from "../../lib/api.js";

const authApi = {
  register(credentials) {
    return api.post("/api/auth/register", credentials);
  },

  // Email sign-up, step 1: sends a 6-digit code to the email. Nothing is created yet. Answers { email, resendAvailableInSeconds, codeExpiresInMinutes }.
  startRegistration(details) {
    return api.post("/api/auth/register/start", details);
  },

  // Sends a NEW code for a sign-up that is waiting (the old code stops working).
  resendCode(details) {
    return api.post("/api/auth/register/resend", details);
  },

  // Email sign-up, step 2: the code from the email. On success the account exists and the person is logged in:
  // answers { accessToken, user } and sets the refresh cookie.
  verifyRegistration(details) {
    return api.post("/api/auth/register/verify", details);
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
