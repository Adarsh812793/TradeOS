// Email sign-up: START a sign-up, RE-SEND its code and VERIFY it. Starting and re-sending create no User and no Wallet:
// the person only becomes a real account when the right code is confirmed (verifyRegistration). Until then everything
// lives in one PendingRegistration record per email (see pendingRegistration.model.js).
import argon2 from "argon2";
import mongoose from "mongoose";

import User from "../users/user.model.js";
import Wallet from "../wallet/wallet.model.js";
import PendingRegistration from "./pendingRegistration.model.js";
import authService, { STARTING_BALANCE } from "./auth.service.js";

import notificationService from "../notifications/notification.service.js";
import { welcomeTemplate } from "../notifications/notification.templates.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import retryTransaction from "../../utils/retryTransaction.js";

import { sendEmail } from "../email/email.provider.js";
import { otpEmail } from "../email/email.templates.js";
import {
    OTP_MAX_ATTEMPTS,
    OTP_MAX_RESENDS,
    OTP_TTL_MINUTES,
    PENDING_TTL_MINUTES,
    RESEND_COOLDOWN_SECONDS,
    generateOtp,
    hashOtp,
    verifyOtp
} from "./otp.utils.js";

const MINUTE_MS = 60 * 1000;
const COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;

// What the browser gets back after a code was sent. The code itself is NEVER part of it.
const sentAnswer = (email) => ({
    email,
    resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
    codeExpiresInMinutes: OTP_TTL_MINUTES
});

// The error for "too soon": how many seconds are left (at least 1) goes along, so the page can run a countdown
function tooSoonError(lastSentAt, now) {
    const seconds = Math.max(1, Math.ceil((lastSentAt.getTime() + COOLDOWN_MS - now.getTime()) / 1000));

    return new AppError(
        "Please wait a moment before asking for another code.",
        429,
        ERROR_CODES.OTP_RESEND_TOO_SOON,
        { retryAfterSeconds: seconds }
    );
}

// The error for "asked for too many codes for this sign-up"
const resendLimitError = () =>
    new AppError(
        "You have asked for too many codes. Please wait a few minutes and start signing up again.",
        429,
        ERROR_CODES.OTP_RESEND_LIMIT
    );

// Takes the right to send ONE email, and stores the new code, in a SINGLE atomic database update. It only matches when
//   - the sign-up is still alive (MongoDB deletes dead ones a little late, so the time is checked too),
//   - the 60 second cooldown has passed, and
//   - fewer than 5 re-sends have been used.
// Checking and writing in one step is the point: with "read, check, write" two simultaneous requests could both pass the
// check and both send an email. Here exactly one can match. It answers the record as it was BEFORE the change (or null
// when nothing matched), which is also what lets a failed send be undone.
//   fields: the new codeHash and codeExpiresAt, plus name and passwordHash when a sign-up is (re)started
async function claimSend(email, fields, now) {
    return PendingRegistration.findOneAndUpdate(
        {
            email,
            expiresAt: { $gt: now },
            lastSentAt: { $lte: new Date(now.getTime() - COOLDOWN_MS) },
            resendCount: { $lt: OTP_MAX_RESENDS }
        },
        {
            $set: { ...fields, attempts: 0, lastSentAt: now }, // a new code starts with all its guesses unused
            $inc: { resendCount: 1 },
            // The sign-up must never be deleted before its own code runs out
            $max: { expiresAt: new Date(fields.codeExpiresAt.getTime() + MINUTE_MS) }
        },
        { returnDocument: "before" }
    );
}

// When claimSend matched nothing: work out why. Returns { error } for "too soon" or "too many codes", or { error: null }
// when there is no live sign-up for this email at all.
async function explainRefusal(email, now) {
    const pending = await PendingRegistration.findOne({ email });

    if (!pending || pending.expiresAt <= now) return { error: null };
    if (pending.resendCount >= OTP_MAX_RESENDS) return { error: resendLimitError() };

    return { error: tooSoonError(pending.lastSentAt, now) };
}

// Emails the code. If the email cannot be sent, the cooldown and the resend that were just used are given back (the
// person did not receive anything, so they must not be made to wait), and the error is passed on. The pending sign-up
// itself is kept, so pressing "Resend" can simply try again.
async function deliverCode({ email, name, code, previous }) {
    try {
        await sendEmail({ to: email, ...otpEmail({ name, code, minutes: OTP_TTL_MINUTES }) });
    } catch (error) {
        const giveBack = previous
            ? { $set: { lastSentAt: previous.lastSentAt }, $inc: { resendCount: -1 } }
            : { $set: { lastSentAt: new Date(0) } }; // a brand new record: free to send again at once

        await PendingRegistration.updateOne({ email }, giveBack).catch(() => {});

        throw error;
    }
}

// I. Starts an email sign-up: stores the (already hashed) details as a pending sign-up and emails a 6-digit code.
// Starting again for the same email replaces the details and the code, but the cooldown and the resend cap carry over,
// so starting over cannot be used to send unlimited emails.
const startRegistration = async ({ name, email, password }) => {

    // 1. A real account already owns this email
    const existingUser = await User.findOne({ email }).select("_id").lean();

    if (existingUser) {
        throw new AppError("User already exists", 409, ERROR_CODES.USER_ALREADY_EXISTS);
    }

    // 2. Everything slow or random is done first. The password is hashed NOW: it is never stored as typed, not even in
    //    the pending record.
    const now = new Date();
    const code = generateOtp();

    const fields = {
        name,
        passwordHash: await argon2.hash(password),
        codeHash: hashOtp(code, email),
        codeExpiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * MINUTE_MS)
    };

    // 3. Replace the pending sign-up of this email, if there is a live one and it is allowed
    const previous = await claimSend(email, fields, now);

    if (!previous) {
        const refusal = await explainRefusal(email, now);

        if (refusal.error) throw refusal.error;

        // 4. No live sign-up for this email: begin a fresh one (first clearing a dead one MongoDB has not removed yet)
        await PendingRegistration.deleteOne({ email, expiresAt: { $lte: now } });

        try {
            await PendingRegistration.create({
                ...fields,
                email,
                lastSentAt: now,
                expiresAt: new Date(now.getTime() + PENDING_TTL_MINUTES * MINUTE_MS)
            });
        } catch (error) {
            // Another request created it a split second ago (the unique email index): that one sends the email
            if (error.code === 11000) {
                throw tooSoonError(now, now);
            }

            throw error;
        }
    }

    // 5. Email the code
    await deliverCode({ email, name, code, previous });

    return sentAnswer(email);
};

// II. Sends a NEW code for a sign-up that is waiting. The old code stops working at once (only the newest hash is kept).
const resendRegistrationCode = async ({ email }) => {
    const now = new Date();
    const code = generateOtp();

    const previous = await claimSend(
        email,
        {
            codeHash: hashOtp(code, email),
            codeExpiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * MINUTE_MS)
        },
        now
    );

    if (!previous) {
        const refusal = await explainRefusal(email, now);

        if (refusal.error) throw refusal.error;

        throw new AppError(
            "We couldn't find a sign-up in progress for this email. Please start again.",
            404,
            ERROR_CODES.NO_PENDING_REGISTRATION
        );
    }

    await deliverCode({ email, name: previous.name, code, previous });

    return sentAnswer(email);
};

// When a guess could not be counted: work out why, as an error. Used only after the attempt could not be taken.
async function explainVerifyRefusal(email, now) {
    const pending = await PendingRegistration.findOne({ email });

    // No live sign-up: either it was already completed (the account exists now) or there never was one
    if (!pending || pending.expiresAt <= now) {
        if (await User.exists({ email })) {
            return new AppError("This email is already verified. Please log in.", 409, ERROR_CODES.USER_ALREADY_EXISTS);
        }

        return new AppError(
            "We couldn't find a sign-up in progress for this email. Please start again.",
            404,
            ERROR_CODES.NO_PENDING_REGISTRATION
        );
    }

    if (pending.codeExpiresAt <= now) {
        return new AppError("This code has expired. Ask for a new one.", 400, ERROR_CODES.OTP_EXPIRED);
    }

    return new AppError("Too many wrong codes. Ask for a new code.", 429, ERROR_CODES.OTP_ATTEMPTS_EXCEEDED);
}

// Turns a confirmed pending sign-up into a real account: the user (email verified), the wallet and the welcome
// notification, together in ONE transaction, or none of them. The same transaction DELETES the pending record, and that
// delete is the single-use lock: only the request that deletes it can create the account, so two simultaneous requests
// with the right code make exactly one account. (MongoDB aborts the loser for a write conflict, retryTransaction runs it
// again, and by then the record is gone.)
async function createVerifiedAccount(pending) {
    return retryTransaction(async () => {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Single use. The code hash is part of the match, so a newer code sent in the meantime is not used up by an old one
            const claimed = await PendingRegistration.findOneAndDelete(
                { _id: pending._id, codeHash: pending.codeHash },
                { session }
            );

            if (!claimed) {
                if (await User.exists({ email: pending.email }).session(session)) {
                    throw new AppError("This email is already verified. Please log in.", 409, ERROR_CODES.USER_ALREADY_EXISTS);
                }

                throw new AppError(
                    "A newer code was sent. Please use the newest code in your email.",
                    400,
                    ERROR_CODES.OTP_EXPIRED
                );
            }

            // Someone may have made an account with this email by another way in the meantime
            if (await User.exists({ email: pending.email }).session(session)) {
                throw new AppError("User already exists", 409, ERROR_CODES.USER_ALREADY_EXISTS);
            }

            const [user] = await User.create(
                [
                    {
                        name: pending.name,
                        email: pending.email,
                        passwordHash: pending.passwordHash,
                        emailVerified: true,
                        emailVerifiedAt: new Date()
                    }
                ],
                { session }
            );

            await Wallet.create([{ userId: user._id, balance: STARTING_BALANCE, currency: "INR" }], { session });

            await notificationService.createNotification(
                user._id,
                welcomeTemplate({ startingBalance: STARTING_BALANCE }),
                { session }
            );

            await session.commitTransaction();

            return user;

        } catch (error) {
            await session.abortTransaction();

            throw error;

        } finally {
            await session.endSession();
        }
    });
}

// III. Confirms the emailed code. On the right code the account is created and the person is logged in straight away
// (the same access token and refresh-token cookie as a password login).
//   - Each guess first TAKES one of the code's 5 attempts in a single atomic update, so any number of simultaneous
//     guesses can only ever try 5 codes in total.
//   - A wrong code answers how many attempts are left; after the 5th the code is dead until a new one is requested.
const verifyRegistration = async ({ email, code }) => {
    const now = new Date();

    // 1. Take one attempt (only possible while the sign-up and the code are alive and attempts remain)
    const pending = await PendingRegistration.findOneAndUpdate(
        {
            email,
            expiresAt: { $gt: now },
            codeExpiresAt: { $gt: now },
            attempts: { $lt: OTP_MAX_ATTEMPTS }
        },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" }
    );

    if (!pending) {
        throw await explainVerifyRefusal(email, now);
    }

    // 2. Is it the right code? (compared in constant time against the stored keyed hash)
    if (!verifyOtp(code, email, pending.codeHash)) {
        const attemptsLeft = OTP_MAX_ATTEMPTS - pending.attempts;

        throw new AppError(
            attemptsLeft > 0
                ? "That code is not correct."
                : "That code is not correct and you have no attempts left. Ask for a new code.",
            400,
            ERROR_CODES.OTP_INVALID,
            { attemptsLeft }
        );
    }

    // 3. Right code: create the account (user + wallet + welcome notification) in one transaction
    const user = await createVerifiedAccount(pending);

    // 4. Log the person in with the existing session code (access token, hashed refresh session)
    const { accessToken, refreshToken } = await authService.startLoginSession(user);

    return {
        accessToken,
        refreshToken,
        user: { id: user._id, name: user.name, email: user.email }
    };
};

export default {
    startRegistration,
    resendRegistrationCode,
    verifyRegistration
};
