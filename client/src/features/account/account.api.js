
import api from "../../lib/api.js";

const USERS_BASE_URL = "/api/users";

const accountApi = {
  // Fetch the logged-in user's profile (name, email, photo, member since)
  getMe() {
    return api.get(`${USERS_BASE_URL}/me`);
  },

  // Change the logged-in user's name; resolves with the updated profile in `data`
  updateProfile({ name }) {
    return api.patch(`${USERS_BASE_URL}/me`, { name });
  },

  // Upload a profile photo (sent as multipart form data in the field "avatar"); resolves with the updated profile
  uploadAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);

    return api.post(`${USERS_BASE_URL}/me/avatar`, formData);
  },

  // Fetch the user's virtual wallet ({ balance, currency }) for the Trading Account section
  getWallet() {
    return api.get("/api/wallet");
  },

  // Permanently delete the account and all its data. The password re-confirms who is asking.
  // A wrong password comes back as an error whose `data.errorCode` is INVALID_PASSWORD.
  deleteAccount({ password }) {
    return api.delete(`${USERS_BASE_URL}/me`, { body: { password } });
  },

  // Change the password and sign out every other device; resolves with { signedOutOtherDevices } in `data`.
  // A wrong current password comes back as an error whose `data.errorCode` is INVALID_CURRENT_PASSWORD.
  changePassword({ currentPassword, newPassword }) {
    return api.patch("/api/auth/password", { currentPassword, newPassword });
  },

  // Remove the profile photo; resolves with the updated profile
  removeAvatar() {
    return api.delete(`${USERS_BASE_URL}/me/avatar`);
  },
};

export default accountApi;
