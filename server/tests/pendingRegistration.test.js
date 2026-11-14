import { describe, it, expect } from "vitest";

import PendingRegistration from "../src/modules/auth/pendingRegistration.model.js";

// Tests of the pending sign-up record against the test database.

// A valid record's fields, with a unique email so test runs never collide
const unique = () => `pending-${Date.now()}${Math.floor(Math.random() * 100000)}@example.com`;

const valid = (overrides = {}) => ({
    name: "Asha Rao",
    email: unique(),
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$placeholderhash",
    codeHash: "a".repeat(64),
    codeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    ...overrides
});

describe("PendingRegistration", () => {
    it("saves a sign-up that is waiting for its code, with counters starting at zero", async () => {
        const saved = await PendingRegistration.create(valid());

        expect(saved.attempts).toBe(0);
        expect(saved.resendCount).toBe(0);
        expect(saved.createdAt).toBeInstanceOf(Date);
    });

    it("stores the email trimmed and in lower case, like the User model", async () => {
        const email = unique();

        const saved = await PendingRegistration.create(valid({ email: `  ${email.toUpperCase()}  ` }));

        expect(saved.email).toBe(email);
    });

    it("requires every field that makes a sign-up completable", async () => {
        for (const field of ["name", "email", "passwordHash", "codeHash", "codeExpiresAt", "lastSentAt", "expiresAt"]) {
            const record = valid();
            delete record[field];

            await expect(PendingRegistration.create(record)).rejects.toThrow(new RegExp(field));
        }
    });

    it("allows only ONE pending sign-up per email (a second one is refused by the database)", async () => {
        await PendingRegistration.init(); // make sure the unique index exists before relying on it

        const email = unique();
        await PendingRegistration.create(valid({ email }));

        await expect(PendingRegistration.create(valid({ email: email.toUpperCase() }))).rejects.toThrow(/duplicate key|E11000/i);
    });

    it("has MongoDB delete it by itself at expiresAt (a TTL index with zero delay)", async () => {
        await PendingRegistration.init();

        const indexes = await PendingRegistration.collection.indexes();
        const ttl = indexes.find((index) => index.key.expiresAt === 1);

        expect(ttl).toBeDefined();
        expect(ttl.expireAfterSeconds).toBe(0);
    });

    it("declares the unique email index and the delete-by-itself index in the schema, not only in this database", () => {
        // MongoDB keeps an index once it exists, even if the schema stops asking for it, so the checks on the real
        // collection above could pass on a database built earlier. This one looks at what the code itself declares,
        // which is what a brand-new database (a new deployment) will be built from.
        const declared = PendingRegistration.schema.indexes();

        expect(declared).toContainEqual([{ email: 1 }, expect.objectContaining({ unique: true })]);
        expect(declared).toContainEqual([{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })]);
    });

    it("has a unique index on the email", async () => {
        await PendingRegistration.init();

        const indexes = await PendingRegistration.collection.indexes();
        const byEmail = indexes.find((index) => index.key.email === 1);

        expect(byEmail?.unique).toBe(true);
    });

    it("has no field that could hold the code or the password as typed", () => {
        const fields = Object.keys(PendingRegistration.schema.paths);

        for (const forbidden of ["code", "otp", "password"]) {
            expect(fields).not.toContain(forbidden);
        }

        expect(fields).toContain("codeHash");
        expect(fields).toContain("passwordHash");
    });

    it("does not keep fields it was not designed for", async () => {
        const saved = await PendingRegistration.create({ ...valid(), code: "123456", password: "Secret123!" });
        const fromDatabase = await PendingRegistration.findById(saved._id).lean();

        expect(fromDatabase).not.toHaveProperty("code");
        expect(fromDatabase).not.toHaveProperty("password");
    });
});
