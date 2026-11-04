
import { describe, it, expect } from "vitest";

import {
    request,
    app,
    createAuthenticatedUser
} from "./helpers/tradeosTestUtils.js";

import { makePng } from "./helpers/imageFixtures.js";

import { detectImageType } from "../src/utils/imageType.js";
import { isCloudinaryConfigured } from "../src/utils/cloudinary.js";
import { MAX_IMAGE_BYTES } from "../src/middleware/upload.middleware.js";

// Starts an authenticated POST /api/users/me/avatar request (the caller attaches the file).
const postAvatar = (user) =>
    request(app)
        .post("/api/users/me/avatar")
        .set("Authorization", user.authHeader);

// These tests cover everything that is rejected BEFORE Cloudinary is reached.
// A real upload needs real credentials, see users.avatar.live.test.js.
describe("Profile photo: rejected uploads", () => {

    it("1.1 should reject a request with no file", async () => {
        const user = await createAuthenticatedUser();

        const response = await postAvatar(user);

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INVALID_IMAGE");
    });

    it("1.2 should reject a file that is not an image type", async () => {
        const user = await createAuthenticatedUser();

        const response = await postAvatar(user).attach(
            "avatar",
            Buffer.from("just some text"),
            { filename: "notes.txt", contentType: "text/plain" }
        );

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INVALID_IMAGE");
    });

    it("1.3 should reject a file that only CLAIMS to be an image", async () => {
        const user = await createAuthenticatedUser();

        // Text renamed to .png and sent as image/png: the first bytes give it away
        const response = await postAvatar(user).attach(
            "avatar",
            Buffer.from("this is definitely not a picture"),
            { filename: "fake.png", contentType: "image/png" }
        );

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INVALID_IMAGE");
    });

    it("1.4 should reject an image over 2 MB", async () => {
        const user = await createAuthenticatedUser();

        // Starts like a real PNG, then padded past the limit
        const tooBig = Buffer.concat([makePng(8, 8), Buffer.alloc(MAX_IMAGE_BYTES + 1)]);

        const response = await postAvatar(user).attach(
            "avatar",
            tooBig,
            { filename: "huge.png", contentType: "image/png" }
        );

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("IMAGE_TOO_LARGE");
    });

    it("1.5 should reject a file sent in the wrong form field", async () => {
        const user = await createAuthenticatedUser();

        const response = await postAvatar(user).attach(
            "photo",
            makePng(),
            { filename: "me.png", contentType: "image/png" }
        );

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INVALID_IMAGE");
    });

    it("1.6 should reject an upload without authentication", async () => {
        const response = await request(app)
            .post("/api/users/me/avatar")
            .attach("avatar", makePng(), { filename: "me.png", contentType: "image/png" });

        expect(response.status).toBe(401);
    });

    // Only meaningful when Cloudinary is NOT set up (the normal test environment)
    it.skipIf(isCloudinaryConfigured())(
        "1.7 should answer 503 for a valid image when photo upload is not configured",
        async () => {
            const user = await createAuthenticatedUser();

            const response = await postAvatar(user).attach(
                "avatar",
                makePng(),
                { filename: "me.png", contentType: "image/png" }
            );

            expect(response.status).toBe(503);
            expect(response.body.errorCode).toBe("IMAGE_UPLOAD_UNAVAILABLE");
        }
    );
});

describe("Profile photo: removing", () => {

    it("2.1 should succeed (and change nothing) when there is no photo", async () => {
        const user = await createAuthenticatedUser();

        const response = await request(app)
            .delete("/api/users/me/avatar")
            .set("Authorization", user.authHeader);

        expect(response.status).toBe(200);
        expect(response.body.data.avatar.url).toBeNull();
        expect(response.body.data.passwordHash).toBeUndefined();
    });

    it("2.2 should reject removal without authentication", async () => {
        const response = await request(app).delete("/api/users/me/avatar");

        expect(response.status).toBe(401);
    });

    it("2.3 should show an empty photo on a brand-new profile", async () => {
        const user = await createAuthenticatedUser();

        const response = await request(app)
            .get("/api/users/me")
            .set("Authorization", user.authHeader);

        expect(response.body.data.avatar.url).toBeNull();
        expect(response.body.data.avatar.publicId).toBeNull();
    });
});

describe("detectImageType (checks the file's first bytes)", () => {

    it("3.1 should recognise a real PNG", () => {
        expect(detectImageType(makePng())).toBe("png");
    });

    it("3.2 should recognise JPEG and WebP headers", () => {
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
        const webp = Buffer.concat([
            Buffer.from("RIFF", "ascii"),
            Buffer.from([0x24, 0, 0, 0]),
            Buffer.from("WEBPVP8 ", "ascii")
        ]);

        expect(detectImageType(jpeg)).toBe("jpeg");
        expect(detectImageType(webp)).toBe("webp");
    });

    it("3.3 should reject text, GIFs, empty and tiny buffers", () => {
        expect(detectImageType(Buffer.from("hello world, not an image"))).toBeNull();
        expect(detectImageType(Buffer.from("GIF89a-and-some-more-bytes"))).toBeNull();
        expect(detectImageType(Buffer.alloc(0))).toBeNull();
        expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
        expect(detectImageType(undefined)).toBeNull();
    });
});
