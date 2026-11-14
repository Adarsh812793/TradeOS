// Creates one verified user in the TEST database, for the screenshot script (client/scripts/screenshots.mjs).
// Sign-up now needs a code that is emailed, which an outside script cannot read, so this runs the REAL sign-up
// (start, read the code from the in-memory email, verify) inside this process, using the in-memory email provider.
// It refuses to run unless NODE_ENV=test, and needs OTP_SECRET in the environment (any long random string will do).
//   NODE_ENV=test OTP_SECRET=<anything long> node scripts/screenshot-user.js <email> <name> <password>
process.env.EMAIL_PROVIDER = "memory"; // must be set before the config loads: nothing is really sent

const { default: config } = await import("../src/config/env.js");

if (config.NODE_ENV !== "test") {
    console.error("Refusing to run: this script only works with NODE_ENV=test (it must never touch real data).");
    process.exit(1);
}

const [email, name, password] = process.argv.slice(2);

if (!email || !name || !password) {
    console.error("Usage: node scripts/screenshot-user.js <email> <name> <password>");
    process.exit(1);
}

const { default: mongoose } = await import("mongoose");
const { default: request } = await import("supertest");
const { default: app } = await import("../src/app.js");
const { default: connectDB } = await import("../src/database/connection.js");
const { getLastEmailTo } = await import("../src/modules/email/memory.provider.js");

await connectDB();

const started = await request(app).post("/api/auth/register/start").send({ name, email, password });

if (started.status !== 202) {
    console.error(`Sign-up could not start: ${started.status} ${started.body.message ?? ""}`);
    process.exit(1);
}

const code = getLastEmailTo(email).text.match(/\b(\d{6})\b/)[1];
const verified = await request(app).post("/api/auth/register/verify").send({ email, code });

if (verified.status !== 201) {
    console.error(`Verification failed: ${verified.status} ${verified.body.message ?? ""}`);
    process.exit(1);
}

// Verifying also logs the person in. End that session again so the screenshot script starts with none (users have a
// limit on how many devices can be logged in at once, and the script logs in several times itself)
const cookie = (verified.headers["set-cookie"] ?? []).find((value) => value.startsWith("refreshToken="));

if (cookie) await request(app).post("/api/auth/logout").set("Cookie", cookie.split(";")[0]);

console.log(`User ready: ${email}`);
await mongoose.disconnect();
