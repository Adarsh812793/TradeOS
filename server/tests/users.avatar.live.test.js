
// REAL upload test: talks to your actual Cloudinary account, so it is skipped unless the three
// CLOUDINARY_* values are available to the test run. Normal `npm run test:run` skips it because
// .env.test has no Cloudinary credentials. It uploads, replaces and removes one tiny image for a
// throwaway test user and always removes it from Cloudinary at the end.
import { describe, it, expect } from "vitest";

import {
    request,
    app,
    createAuthenticatedUser
} from "./helpers/tradeosTestUtils.js";

import { makePng, readPngSize } from "./helpers/imageFixtures.js";
import { isCloudinaryConfigured } from "../src/utils/cloudinary.js";

describe.skipIf(!isCloudinaryConfigured())("Profile photo: real Cloudinary upload", () => {

    it("uploads, replaces and removes a photo", async () => {
        const user = await createAuthenticatedUser();

        const upload = (colour) =>
            request(app)
                .post("/api/users/me/avatar")
                .set("Authorization", user.authHeader)
                .attach("avatar", makePng(300, 200, colour), {
                    filename: "me.png",
                    contentType: "image/png"
                });

        const getProfile = () =>
            request(app)
                .get("/api/users/me")
                .set("Authorization", user.authHeader);

        let firstUrl;
        let publicId;

        try {
            // 1. First upload
            const first = await upload([200, 30, 30]);

            expect(first.status).toBe(200);
            expect(first.body.data.passwordHash).toBeUndefined();

            firstUrl = first.body.data.avatar.url;
            publicId = first.body.data.avatar.publicId;

            expect(firstUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
            expect(publicId).toMatch(/^tradeos\/avatars\//);

            // 2. It is saved on the profile
            const profile = await getProfile();
            expect(profile.body.data.avatar.url).toBe(firstUrl);

            // 3. Cloudinary really serves a 256 x 256 square (a 300 x 200 picture was uploaded)
            const image = await fetch(firstUrl);
            expect(image.status).toBe(200);
            expect(image.headers.get("content-type")).toMatch(/^image\//);

            const size = readPngSize(Buffer.from(await image.arrayBuffer()));
            expect(size).toEqual({ width: 256, height: 256 });

            // 4. A second upload replaces the first (same name, new link)
            const second = await upload([30, 30, 200]);

            expect(second.status).toBe(200);
            expect(second.body.data.avatar.publicId).toBe(publicId);
            expect(second.body.data.avatar.url).not.toBe(firstUrl);
        } finally {
            // 5. Always clean up Cloudinary, even if an assertion above failed
            const removed = await request(app)
                .delete("/api/users/me/avatar")
                .set("Authorization", user.authHeader);

            expect(removed.status).toBe(200);
            expect(removed.body.data.avatar.url).toBeNull();
            expect(removed.body.data.avatar.publicId).toBeNull();
        }

        const after = await getProfile();
        expect(after.body.data.avatar.url).toBeNull();
    }, 60000);
});
