//This file contains reusable parts that is used in server testing
import { expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import Stock from "../../src/modules/stocks/stock.model.js";

export const createAuthenticatedUser = async () => {
    const uniqueId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const email = `tradeos-test-${uniqueId}@example.com`;
    const password = "TestPassword@123";

    const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
            name: "TradeOS Test User",
            email,
            password
        });

    if (![200, 201].includes(registerResponse.status)) {
        throw new Error(
            `Test user registration failed: ${JSON.stringify(registerResponse.body)}`
        );
    }

    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

    if (loginResponse.status !== 200) {
        throw new Error(
            `Test user login failed: ${JSON.stringify(loginResponse.body)}`
        );
    }

    const accessToken =
        loginResponse.body.accessToken ??
        loginResponse.body.data?.accessToken;

    if (!accessToken) {
        throw new Error("Access token missing from login response");
    }

    return {
        accessToken,
        email,
        authHeader: `Bearer ${accessToken}`
    };
};

export const createTestStock = async (price = 100) => {
    const symbol = `TST${Date.now()}${Math.floor(Math.random() * 1000)}`;

    return Stock.create({
        symbol,
        companyName: "TradeOS Test Stock",
        exchange: "NSE",
        currentPrice: price,
        currency: "INR",
        isActive: true
    });
};

export const expectSuccessStatus = (status) => {
    expect([200, 201]).toContain(status);
};

export { request, app };
