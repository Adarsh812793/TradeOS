// Forgot password: ASK for an emailed 6-digit code (also used to ask for a NEW one) and RESET the password with it.
// Built from the same parts as the email sign-up (otp.utils.js, the email provider), with a few deliberate differences:
//   - The answers never reveal whether an email has an account. Asking for a code, asking too soon and giving a wrong code
//     all answer the same for an email that exists and one that does not, so the page cannot be used to list who has an
//     account. (Sign-up does say "already exists": there the person is about to use that email anyway.)
//   - A successful reset signs EVERY device out, and the person is not logged in automatically: they log in with the new
//     password.
import argon2 from "argon2";
import mongoose from "mongoose";

import User from "../users/user.model.js";
import PasswordReset from "./passwordReset.model.js";
import RefreshSession from "./refreshSession.model.js";

import notificationService from "../notifications/notification.service.js";
import { passwordResetTemplate } from "../notifications/notification.templates.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import retryTransaction from "../../utils/retryTransaction.js";

import { sendEmail } from "../email/email.provider.js";
import { passwordChangedEmail, passwordResetEmail } from "../email/email.templates.js";
import {
    OTP_MAX_ATTEMPTS,
    OTP_MAX_RESENDS,
    OTP_TTL_MINUTES,
    PENDING_TTL_MINUTES,
    RESEND_COOLDOWN_SECONDS,
    RESET_PURPOSE,
    generateOtp,
    hashOtp,
    verifyOtp
} from "./otp.utils.js";

const MINUTE_MS = 60 * 1000;
const COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;

// What the browser always gets back after asking for a code, whether or not an email was really sent. The code itself is
// NEVER part of it.
const sentAnswer = (email) => ({
    email,
    resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
    codeExpiresInMinutes: OTP_TTL_MINUTES
});

// The ONE error for every way a reset can fail (wrong code, expired code, too many guesses, unknown email, newer code
// sent): telling them apart would also tell whether the email has an account.
const invalidCodeError = () =>
    new AppError("That code is not correct, or it has expired. Ask for a new one.", 400, ERROR_CODES.OTP_INVALID);

// Takes the right to send ONE email and stores the new code in a SINGLE atomic update; it only matches while the request
// is alive, the 60 s cooldown has passed and fewer than 5 re-sends were used (the same rules as the sign-up, see
// registration.service.js for why this is one update and not "read, check, write"). Answers the record as it was BEFORE.
async function claimSend(email, fields, now) {
    return PasswordReset.findOneAndUpdate(
        {
            email,
            expiresAt: { $gt: now },
            lastSentAt: { $lte: new Date(now.getTime() - COOLDOWN_MS) },
            resendCount: { $lt: OTP_MAX_RESENDS }
        },
        {
            $set: { ...fields, attempts: 0, lastSentAt: now },
            $inc: { resendCount: 1 },
            $max: { expiresAt: new Date(fields.codeExpiresAt.getTime() + MINUTE_MS) }
        },
        { returnDocument: "before" }
    );
}

// Emails the code WITHOUT making the caller wait for it (see requestPasswordReset). A failed email gives the cooldown and
// the re-send back, so the person can simply ask again; the reason is only logged, never with the address.
async function deliverCode({ email, name, code, previous }) {
    try {
        await sendEmail({ to: email, ...passwordResetEmail({ name, code, minutes: OTP_TTL_MINUTES }) });
    } catch (error) {
        console.error("Password reset email was not sent:", error.message);

        const giveBack = previous
            ? { $set: { lastSentAt: previous.lastSentAt }, $inc: { resendCount: -1 } }
            : { $set: { lastSentAt: new Date(0) } }; // a brand new record: free to send again at once

        await PasswordReset.updateOne({ email }, giveBack).catch(() => {});
    }
}

// I. Asks for a reset code for this email (and asks for a NEW one when called again). Sends an email only when an account
// exists AND the cooldown / resend cap allow it, and answers the SAME success either way. The email is sent in the
// background: waiting for it would make an existing account's answer slower than an unknown one's and give it away.
const requestPasswordReset = async ({ email }) => {
    const now = new Date();

    const user = await User.findOne({ email }).select("_id name").lean();

    if (!user) return sentAnswer(email);

    const code = generateOtp();

    const fields = {
        userId: user._id,
        codeHash: hashOtp(code, email, undefined, RESET_PURPOSE),
        codeExpiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * MINUTE_MS)
    };

    // 1. A live request exists and is allowed to be replaced
    const previous = await claimSend(email, fields, now);

    if (!previous) {
        // 2. A live request exists but it is too soon or the cap is used: stay silent (no email, same answer)
        const existing = await PasswordReset.findOne({ email }).select("expiresAt").lean();

        if (existing && existing.expiresAt > now) return sentAnswer(email);

        // 3. None: begin a fresh one (first clearing a dead one MongoDB has not removed yet)
        await PasswordReset.deleteOne({ email, expiresAt: { $lte: now } });

        try {
            await PasswordReset.create({
                ...fields,
                email,
                lastSentAt: now,
                expiresAt: new Date(now.getTime() + PENDING_TTL_MINUTES * MINUTE_MS)
            });
        } catch (error) {
            // Another request created it a split second ago (the unique email index): that one sends the email
            if (error.code === 11000) return sentAnswer(email);

            throw error;
        }
    }

    // 4. Email the code in the background
    void deliverCode({ email, name: user.name, code, previous });

    return sentAnswer(email);
};

// Tells the owner, by email, that their password was reset (best effort: a failure here changes nothing)
async function sendPasswordChangedEmail({ email, name }) {
    try {
        await sendEmail({ to: email, ...passwordChangedEmail({ name }) });
    } catch (error) {
        console.error("Password changed email was not sent:", error.message);
    }
}

// II. Sets a new password when the emailed code is right.
//   - Each guess first TAKES one of the code's 5 attempts in a single atomic update, so any number of simultaneous guesses
//     can only ever try 5 codes in total.
//   - On the right code ONE transaction deletes the request (the single-use lock), saves the new password, signs every
//     device out, marks the email verified (the code proved the person owns it) and creates a notification.
//   - Every failure answers the same invalidCodeError.
const resetPassword = async ({ email, code, newPassword }) => {
    const now = new Date();

    // 1. Hash the new password first (slow on purpose), so every request takes about the same time
    const newPasswordHash = await argon2.hash(newPassword);

    // 2. Take one attempt (only possible while the request and its code are alive and attempts remain)
    const request = await PasswordReset.findOneAndUpdate(
        {
            email,
            expiresAt: { $gt: now },
            codeExpiresAt: { $gt: now },
            attempts: { $lt: OTP_MAX_ATTEMPTS }
        },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" }
    );

    if (!request) throw invalidCodeError();

    // 3. Is it the right code? (compared in constant time against the stored keyed hash)
    if (!verifyOtp(code, email, request.codeHash, undefined, RESET_PURPOSE)) throw invalidCodeError();

    // 4. Right code: save the password and sign every device out, together or not at all
    const user = await retryTransaction(async () => {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Single use. The code hash is part of the match, so a newer code sent in the meantime is not used up by an old one
            const claimed = await PasswordReset.findOneAndDelete(
                { _id: request._id, codeHash: request.codeHash },
                { session }
            );

            if (!claimed) throw invalidCodeError();

            const updated = await User.findOneAndUpdate(
                { _id: request.userId },
                { $set: { passwordHash: newPasswordHash } },
                { session, returnDocument: "after" }
            );

            if (!updated) throw invalidCodeError(); // the account was deleted in the meantime

            // Receiving the code proves the person owns this email
            await User.updateOne(
                { _id: updated._id, emailVerified: false },
                { $set: { emailVerified: true, emailVerifiedAt: now } },
                { session }
            );

            await RefreshSession.updateMany(
                { userId: updated._id, revokedAt: null },
                { $set: { revokedAt: now } },
                { session }
            );

            await notificationService.createNotification(updated._id, passwordResetTemplate(), { session });

            await session.commitTransaction();

            return updated;

        } catch (error) {
            await session.abortTransaction();

            throw error;

        } finally {
            await session.endSession();
        }
    });

    // 5. Tell the owner (in the background; the reset is already done)
    void sendPasswordChangedEmail({ email: user.email, name: user.name });

    return { email: user.email };
};

export default {
    requestPasswordReset,
    resetPassword
};
