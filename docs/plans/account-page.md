# Account Page Plan

Route `/account`. White theme (tokens in `client/src/styles/tokens.css`). Five sections stacked **vertically**, each one expands and collapses on click (any number open at once, all collapsed on load). Reference images were dark and horizontal; we keep the layout ideas only.

## Decisions (agreed)

- **Folders:** `features/profile` is replaced by `features/account`; `pages/ProfilePage.jsx` is replaced by `pages/AccountPage.jsx`. Delete the old ones once moved.
- **Editable fields:** name only. Email change comes later with OTP verification.
- **Account status:** show "Active" for every user (no status field in the database).
- **Password change:** signs out every other device (revokes the other refresh sessions), keeps the current one.
- **Preferences:** "Coming soon" panel for now; design it last (theme is feasible later because colours are tokens).
- **Forgot password:** disabled "Coming soon" row (email OTP later).
- **Packages (server):** `multer` (memory storage, parses the upload) and `cloudinary` (official SDK, v2). Not `multer-storage-cloudinary` (unmaintained, Cloudinary v1 only).
- **Cloudinary credentials:** the user adds `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to `server/.env` themselves. **Never edit `.env` files.** In `config/env.js` these are optional (not in the required list), so the server and tests still start without them; the upload endpoint answers with a clear error if they are missing.

## What exists today

- `GET /api/users/me` (name, email, createdAt). User model: `name`, `email`, `passwordHash`, timestamps.
- `POST /api/auth/logout` (used by the navbar menu), `GET /api/wallet` (balance).
- `client/src/lib/api.js` JSON-stringifies every body. **Must be fixed to pass `FormData` through untouched** (and not set `Content-Type`) for photo uploads.

## Structure

```
pages/AccountPage.jsx (+ .css)
features/account/
  account.api.js                 getMe, updateProfile, uploadAvatar, removeAvatar, changePassword, deleteAccount
  components/
    AccountSection.jsx           shared expand/collapse row: icon, title, hint, children, "danger" variant, aria-expanded
    personal/   ProfileOverview, ProfileEditForm, AvatarUploader
    security/   ChangePasswordForm, SecurityActions (forgot password "coming soon", logout)
    trading/    TradingAccountDetails
    danger/     DeleteAccountPanel (+ password confirmation dialog)
```

## Backend additions

| Endpoint | Purpose | Notes |
|---|---|---|
| `PATCH /api/users/me` | update name | Joi: same rules as signup name (2-50 chars, trimmed) |
| `POST /api/users/me/avatar` | upload photo (multipart field `avatar`) | JPEG / PNG / WebP, max 2 MB; multer `fileFilter` + `limits`; upload to Cloudinary (square, ~256px); save `avatar: { url, publicId }`; delete the previous photo |
| `DELETE /api/users/me/avatar` | remove photo | delete from Cloudinary, clear field |
| `PATCH /api/auth/password` | change password | `currentPassword`, `newPassword` (8-128); argon2 verify; reject same-as-current; revoke other refresh sessions; rate-limited (`authRateLimiter`) |
| `DELETE /api/users/me` | delete account | body `{ password }`; rate-limited; one Mongo transaction deletes User, Wallet, Holdings, Orders, Transactions, Watchlist, RefreshSessions; then delete Cloudinary photo; clear `refreshToken` cookie |

- User model gains `avatar: { url, publicId }` (both optional).
- New error codes as needed (e.g. invalid current password, same password, invalid image, image too large, image upload failed / not configured).
- Known limitation: after deletion the 15-minute access token is still valid; requests just fail with "not found". The client logs out and redirects to `/login` immediately.

## Validation of photos

- Browser: check type and size before uploading (instant feedback, preview).
- Server: authoritative check again (multer `fileFilter` on MIME type + `limits.fileSize`), and Cloudinary `resource_type: "image"` / allowed formats, so a renamed non-image is rejected.
- Errors are shown inline under the photo, never as a crash.

## Tests

Integration tests in `server/tests/` for every new endpoint. Photo tests cover rejections (no file, wrong type, too large), which fail before Cloudinary is called. A successful upload needs real credentials, so it is checked by hand.

## Build order

- [x] 0. Page shell: `AccountPage`, `AccountSection`, five collapsible sections with placeholders, "Account" header, `lib/api.js` FormData fix, move `features/profile` to `features/account`
- [x] 1a. Personal Information: overview + edit name (`PATCH /api/users/me`)
- [x] 1b. Profile photo with Cloudinary (install `multer`, `cloudinary`)
- [x] 2. Security: change password (+ sign out other devices), forgot password "coming soon", logout
- [x] 3. Trading Account: type, balance, status "Active"
- [x] 4. Danger Zone: delete account with password re-authentication
- [ ] 5. Preferences: decide contents later

## Step 0 notes (done)

- `features/profile` and `pages/ProfilePage` are gone; the old read-only card became `features/account/components/personal/ProfileOverview.jsx`.
- `AccountSection` mounts its content on first open, then keeps it (hidden) so unsaved form input survives a collapse. Closed panels are `inert` (out of the tab order and away from screen readers). Any number of sections can be open; all start closed.
- `useAccountProfile` loads `GET /api/users/me` once and returns `setUser` so step 1a can update the name on screen after a save.
- Security, Trading Account, Preferences and Danger Zone currently show a `SectionPlaceholder`.
- `lib/api.js` now sends `FormData` untouched (browser adds the multipart header). Checked in a real browser: upload went out as `multipart/form-data` with a boundary, JSON requests are still `application/json`.
- Checked in headless Edge with a mock API: collapse / expand behaviour, no horizontal overflow at 1440 and 390px, profile-load failure shows "Try again".

## Step 1a notes (done)

- Backend: `PATCH /api/users/me` (name only). `validate()` strips every other field, so email cannot be changed through it. The 2-50 character name rule now lives in `server/src/utils/validation.js` (`nameSchema`) and is shared by signup and profile edit. Tests: `server/tests/users.integration.test.js` (8 tests).
- Client: `PersonalInformation` switches between `ProfileOverview` (with an Edit Profile button) and `ProfileEditForm` (react-hook-form + zod, `profile.validation.schema.js`). Save is disabled until the name changes; Escape cancels; focus moves to the name field when the form opens and back to the Edit button when it closes.
- Checked in a real browser (mock API): validation error, trimmed save, success notice, cancel / Escape, server error keeps the form open with the typed name, no overflow at 390px.
- Not done on purpose: the navbar profile menu still shows a hard-coded "TradeOS User" and a generic icon. Worth wiring to the real name and photo in step 1b.

## Step 1b notes (done)

- **Packages added (server):** `multer` 2.5.0 (reads the upload into memory) and `cloudinary` 2.11.0 (official SDK). Not `multer-storage-cloudinary` (unmaintained, Cloudinary v1 only).
- **Endpoints:** `POST /api/users/me/avatar` (multipart field `avatar`) and `DELETE /api/users/me/avatar`. The user document gained `avatar: { url, publicId }`; MongoDB never stores image data.
- **Validation, in layers:** the browser checks type and size first; the server then checks the claimed type, the 2 MB limit, and the file's real first bytes (`utils/imageType.js`), so a renamed text file is rejected even when it claims to be `image/png`; Cloudinary only accepts jpg/png/webp.
- **Cloudinary:** each photo is stored as a 256x256 square under the fixed id `tradeos/avatars/<userId>`, so a new upload replaces the old one and nothing is orphaned. Credentials are optional in `config/env.js`: without them the endpoint answers 503 `IMAGE_UPLOAD_UNAVAILABLE`. Uploads are limited to 20 per hour per IP (`uploadRateLimiter`).
- **Client:** `AvatarUploader` (camera button, "Remove photo", instant preview while uploading) inside `ProfileOverview`; messages ("Uploading your photo...", "Profile photo updated.", errors) appear above the profile. New shared `components/ui/Avatar.jsx` (photo, else initial, else icon; falls back if the image fails to load).
- **Navbar:** `CurrentUserProvider` (mounted in `router.jsx` around `AppLayout`) loads the profile once and shares it through `useCurrentUser()`. The navbar menu now shows the real name and photo instead of "TradeOS User", and both update instantly after an edit. This replaced `useAccountProfile`.
- **Tests:** `users.avatar.integration.test.js` (rejections, removal, `detectImageType`; no Cloudinary needed) and `users.avatar.live.test.js` (real upload / replace / remove against Cloudinary; skipped unless the three `CLOUDINARY_*` values are in the test process's environment).
- **Verified:** full server suite 54 passed (live test skipped), live test passed against the real Cloudinary account, and a real-browser run against the real server (test database): upload, navbar photo, rejected files, instant rename in the navbar, photo survives reload, removal, and Cloudinary left clean.

## Step 1b follow-up: crop before upload (done)

- Choosing a photo now opens a crop dialog (`AvatarCropDialog`): drag to reposition, zoom with the slider / mouse wheel / `+` `-` keys, arrow keys move the photo, a round guide shows how it will look. "Use photo" uploads the cropped square; Cancel or Escape uploads nothing. No new library: the crop is drawn on a canvas (`utils/avatarCrop.utils.js`, plain maths plus `renderCroppedAvatar`). Two-finger pinch zoom is not supported (use the slider). A ready-made library such as `react-easy-crop` is the alternative if pinch zoom matters.
- The cropped photo is a JPEG (`avatar.jpg`, at most 512 x 512, white behind any transparency), so it is small (about 200 KB even from a 3 MB original). The server rules did not change (2 MB, JPG/PNG/WebP, real-content check, Cloudinary 256 x 256).
- **Behaviour change:** because the photo is shrunk in the browser first, the original may now be up to **10 MB** (`MAX_SOURCE_IMAGE_BYTES`); the 2 MB limit applies to the cropped file that is sent (`MAX_UPLOAD_BYTES`). A file the browser cannot decode shows "We couldn't open this image" inside the dialog and nothing is uploaded.
- Verified in a real browser against the real server and Cloudinary, using a picture split into four colour blocks: default crop kept all four colours in the right corners; zoomed 2x and dragged to the top-left gave an all-red stored picture; Cancel / Escape sent nothing; a 3.3 MB original was accepted and sent as a 197 KB JPEG; no sideways overflow at 390px. The crop maths has its own checks (12 hand-worked cases plus 2,000 random zoom/drag sequences).

## Step 1b follow-up: quick view of the photo (done)

- Clicking the saved profile photo on the Account page opens `AvatarPreviewDialog` (shared `Modal`): the stored photo at its real 256 x 256 size, plus a small round version with a note on how it appears in the menu. Buttons: Close and Change photo (closes the popup and opens the file chooser). Closes with Close, the x, Escape, or a click outside.
- The picture is only a button when a saved photo exists (`avatar-uploader__view`); with just the initial it is plain. The navbar picture is unchanged: it still opens the menu.
- `AvatarUploader` now remembers which control should get keyboard focus back after a popup closes ("view" after the quick view, "camera" after cropping).
- Verified in a real browser against the real server and Cloudinary: not clickable without a photo; clickable with one; popup shows the same stored photo (256x256); all four ways of closing work and focus returns to the photo; Change photo opens the chooser exactly once; navbar picture still opens the menu; fits at 390px with no sideways scrolling; not clickable again after removing the photo.

## Step 2 notes (done): Security

- **Endpoint:** `PATCH /api/auth/password` (protected). Body `{ currentPassword, newPassword }`. Checks the current password (argon2), rejects a new password equal to the current one, saves the new hash and revokes the user's other refresh sessions in one transaction, then answers `{ signedOutOtherDevices }`. New error codes: `INVALID_CURRENT_PASSWORD`, `PASSWORD_UNCHANGED`. The 8-128 character password rule is now shared (`passwordSchema` in `utils/validation.js`) by signup and this endpoint.
- **Which device stays logged in:** the one whose refresh cookie comes with the request (its token family is skipped when revoking). No cookie, or an already-revoked one, means every session is revoked, which is the safe side.
- **Brute-force protection:** `passwordChangeRateLimiter` allows 5 FAILED attempts per user (not per IP) per 15 minutes; successful changes are not counted. It uses the in-memory store, so it resets when the server restarts.
- **Known limit:** a signed-out device's current access token (15 minutes) keeps working until it expires, but it can no longer renew. Making it instant needs a `passwordChangedAt` (or token version) check in `protect`, which adds a database read to every request.
- **Client:** `SecurityPanel` (three rows: Change password, Forgot password with a "Coming soon" badge and a disabled button, Log out) and `ChangePasswordForm` (react-hook-form + zod: current / new / confirm; wrong current password shows under that field). `Input` now passes `autoComplete` through (also activates the hints `LoginPage` was already passing).
- **Tests:** `server/tests/auth.password.integration.test.js` (10 tests: success, wrong current, same password, weak / missing fields, no login, other device signed out while this one stays, no cookie signs out all, other users untouched, rate limit, no hash in the response). Real-browser run against the real server: validation messages, server error under the field, real change signing out a second device, plural message for two devices, reload stays logged in, log out lands on /login, phone width.
- **Still to build:** the real forgot-password flow (email OTP).

## Steps 3 and 4 notes (done): Trading Account and Danger Zone

**Trading Account (read-only).** `TradingAccountDetails` shows Account type ("Paper Trading", fixed), Virtual balance (from `GET /api/wallet`, formatted with `formatCurrency`) and Account status ("Active" for everyone, there is no status field in the database). The wallet is only requested when the section is first opened (`AccountSection` mounts its content lazily); it has a loading state and an error state with "Try again".

**Danger Zone: delete account.**
- **Endpoint:** `DELETE /api/users/me` with body `{ password }` (protected). Re-authentication: the server verifies the password (argon2) and answers 400 `INVALID_PASSWORD` if it is wrong. `accountDeletionRateLimiter`: 5 FAILED attempts per user per 15 minutes (own counter, separate from password change; both are built by `createFailedAttemptLimiter`).
- **What is deleted** (one database transaction, all or nothing): transactions, orders, holdings, watchlist, wallet, login sessions (refresh sessions) and the user. Stocks and the FYERS token are shared, so they stay.
- **Cloudinary photo:** deleted only AFTER the database commit succeeded (best effort, never throws), so a failed deletion never costs the photo; a failed Cloudinary call would leave an orphan image (it is logged).
- **Response:** 200, and the `refreshToken` cookie is cleared (same options as logout).
- **Client:** `DeleteAccountPanel` explains it and opens `DeleteAccountDialog` (lists what is lost, asks for the password and an "I understand" tick; the red button is disabled until ticked; Escape / x / Cancel are blocked while the deletion runs; a wrong password shows under the field). On success it goes to `/login` with a "Your account has been deleted" message (`LoginPage` reads `location.state.accountDeleted`).
- **Redirect ordering (a bug found by the browser test):** the navigation has to happen BEFORE `logout()`. Logging out first makes `ProtectedRoute` redirect to `/login` by itself, and that automatic redirect (no message) overrides ours because the router lets the newest navigation win. The fix is `await navigate("/login", { replace: true, flushSync: true, state })` and only then `logout()`.
- **Stale token after deletion:** the 15-minute access token still passes `protect`. A probe showed that reads/updates fail cleanly (404) and orders fail (no wallet), but `POST /api/watchlist` would have created an orphaned entry. Fixed: `addToWatchlist` now checks the user exists (404 `USER_NOT_FOUND`), covered by a test. `GET /api/portfolio` still answers 200 with an empty portfolio, which is harmless.
- **Tests:** `server/tests/users.delete.integration.test.js` (10 tests: everything deleted, nobody else's data touched, wrong password, missing password, no login, cookie cleared, old login useless, same email can register again, stale token creates nothing, rate limit). Real-browser run against the real server, test database and Cloudinary: the dialog flow, a real deletion through the UI, then document counts in the database (all 0), login 401, old token 404, the Cloudinary photo gone, email re-registerable.
