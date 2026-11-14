# Email OTP sign-up

Every new account must prove it owns its email before it exists. This is step one of three: **(1) email OTP sign-up**, (2) forgot password (reuses the same OTP machinery), (3) Google Sign-In (verified emails make account linking safe). Zerodha integration is out of scope.

## Why first

TradeOS used to create an account for any email typed in, without checking it. An attacker could register `victim@gmail.com` with their own password before the real owner arrived, and any later "link your Google account by email" feature would have shared that account with the attacker. Verifying the email at sign-up removes the root cause.

## Decisions (2026-11-14)

| Topic | Decision |
|---|---|
| Sign-up style | **Option B**: no User and no Wallet until the code is confirmed. A separate `PendingRegistration` record with expiry holds the sign-up meanwhile |
| Email provider | **Resend**, through a provider pattern (`console` and `memory` providers for development and tests). Compared with Brevo and Amazon SES (SES: sandbox and production-access review, too much setup for this size) |
| Domain | None yet. Without a verified domain Resend only delivers to the address the Resend account was created with (sender: `onboarding@resend.dev`). **A domain is needed before real users sign up**; Brevo is the fallback |
| Existing users | No migration. The existing accounts are the owner's demo accounts and are trusted; deployment starts with an empty database |
| After verifying | The person is **logged in straight away** (same access token and refresh cookie as a password login) |
| Library | None: Resend is called with `fetch` |
| Limits | Code valid 10 minutes, 5 wrong guesses per code, 60 s between emails, 5 re-sends, pending sign-up kept 30 minutes, sign-up routes limited to 20 per IP per 15 minutes |

## The flow

```
POST /api/auth/register/start   { name, email, password }
   409 if a user owns the email; argon2-hash the password; make a 6-digit code; claim the send (atomic);
   store/replace the PendingRegistration; email the code            -> 202 { email, resendAvailableInSeconds, codeExpiresInMinutes }

POST /api/auth/register/resend  { email }
   same claim; a new code replaces the old one; attempts back to 0  -> 200 { ... }   404 NO_PENDING_REGISTRATION

POST /api/auth/register/verify  { email, code }
   take one of 5 attempts (atomic); constant-time check; on the right code ONE transaction:
   delete the pending record + create User (emailVerified) + Wallet (1,00,000) + welcome notification;
   then start a login                                               -> 201 { accessToken, user } + httpOnly refresh cookie
```

Errors the page uses: `OTP_RESEND_TOO_SOON` (429, `details.retryAfterSeconds`), `OTP_RESEND_LIMIT` (429), `OTP_INVALID` (400, `details.attemptsLeft`), `OTP_EXPIRED` (400), `OTP_ATTEMPTS_EXCEEDED` (429), `NO_PENDING_REGISTRATION` (404), `USER_ALREADY_EXISTS` (409), `EMAIL_SEND_FAILED` (503), `VALIDATION_ERROR` (400).

## Security rules, and why each one exists

| Rule | Why |
|---|---|
| Code from `crypto.randomInt` | `Math.random` is predictable |
| Stored as an HMAC-SHA256 with `OTP_SECRET` and the email mixed in | A code has only 1,000,000 possibilities: a plain hash could be reversed by trying them all; the secret is not in the database |
| 5 attempts taken in ONE atomic update | 12 parallel guesses can still only try 5 codes (a counter read afterwards would let a burst try many more) |
| Constant-time comparison | `===` stops at the first wrong character and can leak how close a guess was |
| Single use = the pending record is deleted in the account-creating transaction | Two simultaneous right codes make exactly one account, with no separate "used" flag to get out of sync |
| `claimSend` is one conditional update (alive, cooldown passed, re-sends under the cap, store the new code) | "Read, check, write" lets two simultaneous requests both pass and both send an email |
| A restart counts toward the re-send cap | Limits on separate paths can be dodged by switching between them |
| A failed email gives the cooldown and the re-send back | Nobody is made to wait for a message that never arrived |
| The password is argon2-hashed at the first step | It is never stored as typed, not even while pending |
| Own rate limiter for the three routes | One sign-up uses several requests and must not eat the login budget |
| `console` and `memory` providers refused outside development and test | A code in a production log, or a "sent" email that goes nowhere, would be a security or a silent failure |
| The name is HTML-escaped in the email; the code is not in the subject | A typed name must never inject HTML; subjects show on lock screens |

## Where it lives

`server/src/modules/email/` (`email.provider.js`, `console.provider.js`, `memory.provider.js`, `resend.provider.js`, `email.templates.js`), `server/src/modules/auth/` (`registration.service.js`, `otp.utils.js`, `pendingRegistration.model.js`), `server/src/config/` (`emailConfig.js`, `otpConfig.js`).

## PR 1: backend (`feature/email-otp-backend`), done

1. The email module: providers, the code template, config guards
2. The Resend provider
3. The code helpers and the `PendingRegistration` model
4. `register/start` and `register/resend`
5. `register/verify`
6. Switch the tests to the new flow and remove the old `POST /register`
7. Docs

Checked with unit and integration tests (about 100 new ones, with mutation checks on every security rule) and the whole suite (355 tests) now signing users up through the emailed code.

## PR 2: frontend (`feature/email-otp-frontend`), next

- `auth.api.js`: `startRegistration`, `resendCode`, `verifyRegistration` (remove `register`).
- `AuthContext`: a `verifyRegistration` that stores the access token like `login` does (the session then restores through `refreshSession()` as usual).
- Sign-up page in two steps: **your details** (the existing form), then **check your email** (a 6-digit field with `inputmode="numeric"` and `autocomplete="one-time-code"`, a resend countdown from `details.retryAfterSeconds`, "attempts left", "use a different email").
- Open the dashboard after verifying (no more "sign-up sends you to the login page").
- Notice wording that other flows rely on stays exact.
- Move `client/scripts/screenshots.mjs` off the removed route (create its user directly in the test database).
- Checks in the browser by reading the code from the test server's log (`EMAIL_PROVIDER=console`).

## Later

- **Forgot password:** the same OTP machinery (a reset code, same limits and hashing), and it gives a way out for an account taken over before this change.
- **Google Sign-In:** Google Identity Services ID token verified on the server (`google-auth-library`), an `AuthIdentity` collection keyed by Google's `sub` (never the email), a link ticket signed with its own key (so it can never pass `protect`), `passwordHash` made optional for Google-only users. Because TradeOS emails are now verified, a Google sign-in for the same verified email can be linked safely.

## Regression checklist (backend)

- [ ] `register/start` answers 202 and the response never contains the code or the password
- [ ] No User or Wallet exists until `register/verify` succeeds
- [ ] The database holds only the argon2 hash and the code hash
- [ ] Wrong code: attempts left count down; the 5th wrong guess kills the code (even the right one gives 429) until a new code is sent
- [ ] Expired code gives `OTP_EXPIRED` without using an attempt
- [ ] Two simultaneous right codes make exactly one account; a failure while creating the wallet leaves nothing behind
- [ ] Cooldown (60 s) and the re-send cap (5) hold, including restarts
- [ ] A failed email (503) keeps the sign-up and does not start a cooldown
- [ ] `POST /api/auth/register` answers 404
- [ ] The server refuses to start with `console` or `memory` email in production, or without a long `OTP_SECRET`
