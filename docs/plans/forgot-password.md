# Forgot password (email code)

Step two of three after the email sign-up: **(1) email OTP sign-up** (done), **(2) forgot password** (this plan, done), **(3) Google Sign-In** (next). It reuses the sign-up code machinery (`otp.utils.js`, the email provider, the same limits), so a reset code behaves like a sign-up code.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Does the page reveal whether an email has an account? | **No.** `forgot` always answers the same 202, and every failure of `reset` is one 400 `OTP_INVALID` with one message. | A reset page that answers differently lets anyone list who has an account. |
| Sign-up says "already exists" | Kept as it is | The person is about to use that email anyway; documented trade-off. |
| Is the email sent before the answer? | **No, in the background.** | Waiting for it would make an existing account slower to answer than an unknown one. |
| Log the person in after a reset? | **No.** Every device is signed out and the person logs in with the new password. | A reset usually means "I may have lost control": no surprise sessions. |
| Email the owner after a reset? | **Yes** ("your password was changed"), best effort. | The way an owner notices a takeover. |
| One route to ask for a code and one to resend? | **One** (`POST /password/forgot`, also used to ask for a new code). | The cooldown and cap apply the same way, so a second route added nothing. |
| Code of a sign-up used for a reset? | **Never.** The HMAC has a `purpose` (`reset:v1`). | Codes of different flows must not be interchangeable. |
| Where does the page live? | `/forgot-password`, **outside** `GuestRoute`. | The Account page links to it while logged in. |

## Backend (`server/src/modules/auth`)

- `passwordReset.model.js`: ONE record per email, only for an email that has an account (unique email index, TTL index on `expiresAt`, 30 minutes). Holds `userId`, the code's HMAC, `codeExpiresAt`, `attempts`, `resendCount`, `lastSentAt`.
- `passwordReset.service.js`:
  - `requestPasswordReset`: user lookup, one conditional update that takes the right to send (alive, 60 s cooldown, fewer than 5 re-sends), a fresh record when there is none, email in the background; a throttled or unknown request is silent.
  - `resetPassword`: hashes the new password first (every request takes similar time), takes one of the 5 attempts atomically, compares in constant time, then ONE transaction: delete the record (single use), save the new argon2 hash, revoke every refresh session, set `emailVerified` when it was false, create a `PASSWORD_CHANGED` notification. After the commit, the "password changed" email.
- `otp.utils.js`: `hashOtp` and `verifyOtp` take an optional `purpose` (default unchanged for sign-up), `RESET_PURPOSE` for resets.
- Routes: `POST /api/auth/password/forgot`, `POST /api/auth/password/reset`, under `passwordResetRateLimiter` (20 per IP per 15 minutes, its own counter).
- Delete account also deletes the user's reset record.
- Wording: `passwordResetEmail`, `passwordChangedEmail` (`email.templates.js`), `passwordResetTemplate` (`notification.templates.js`).

## Frontend (`client/src`)

- `pages/ForgotPasswordPage.jsx` (step 1: email) and `features/auth/components/ResetStep.jsx` (step 2: code, new password, confirmation).
- `emailProgress.js` (a small factory) now serves both `signupProgress.js` and `resetProgress.js`: a reload resumes the code step; only the email is stored, in `sessionStorage`, for 30 minutes.
- Login page: "Forgot password?" link and a "Your password was reset" notice. Account, Security: the "coming soon" row became a "Reset password" link.
- `GuestRoute` lets `state.passwordReset` through (like `accountDeleted`) so a logged-in user who resets sees the login page, then `logout()` clears the local login.

## Checklist

- [x] Reset record, purpose-separated code hash, email and notification wording
- [x] Routes, service, rate limiter, delete-account clean-up
- [x] Server tests: `tests/auth.password.reset.integration.test.js` (22 tests) and the purpose tests in `tests/otp.test.js`; whole suite 387 passed, 2 skipped (the live Resend and Cloudinary tests)
- [x] Frontend page, login link and notice, Account link, guard exception
- [x] Browser check (headless Edge, test server, console email provider): unknown and known email look the same, validation messages, wrong code keeps the passwords and returns the cursor, a reload resumes step 2, right code reaches the login page with the notice, the old password fails and the new one works, the logged-in path from Account ends signed out on the login page, no sideways scroll on a phone
- [x] `npm run lint` clean, `npm run build` works
- [ ] A real email through Resend on the live site (not run: it needs the deployed backend)

## Known limits

- The answer time of `forgot` for a known and an unknown email is close but not identical (a known email does one more database write); this hides the answer from a casual observer, not from a precise timing measurement.
- A throttled request (too soon, or 5 re-sends used) sends nothing and the page shows nothing different: the page itself stops offering new codes after 5 and mirrors the 60 s wait.
- Reset requests are limited per IP (20 per 15 minutes) and per email by the cooldown and the cap; there is no separate lock-out of the account itself.
