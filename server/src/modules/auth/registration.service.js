// Email sign-up, steps 1 and 2: START a sign-up and RE-SEND its code. Nothing here creates a User or a Wallet: the person
// only becomes a real account later, when the right code is confirmed. Until then everything lives in one
// PendingRegistration record per email (see pendingRegistration.model.js).
import argon2 from "argon2";

import User from "../users/user.model.js";
import PendingRegistration from "./pendingRegistration.model.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";

import { sendEmail } from "../email/email.provider.js";
import { otpEmail } from "../email/email.templates.js";
import {
    OTP_MAX_RESENDS,
    OTP_TTL_MINUTES,
    PENDING_TTL_MINUTES,
    RESEND_COOLDOWN_SECONDS,
    generateOtp,
    hashOtp
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

export default {
    startRegistration,
    resendRegistrationCode
};
