//This file tells vitest what to do before running actual test files

//This file runs == number of test files present in /tests folder
import mongoose from "mongoose";
import { beforeAll, afterAll } from "vitest";
import connectDB from "../src/database/connection.js";

//before running all test files connect to db
beforeAll(async () => {
    console.log("CONNECTING TO TEST DATABASE");
    await connectDB();
    console.log("TEST DATABASE CONNECTED");
});

//after running all test close the connection with test db
afterAll(async () => {
    await mongoose.connection.close();
});