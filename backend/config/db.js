const mongoose = require("mongoose");

async function connectDB() {
    try {
        if (!process.env.MONGODB_URI) {
            console.warn("MongoDB URI not provided. Running in offline/in-memory mode.");
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.warn("MongoDB connection warning:", error.message, "- Continuing in fallback mode.");
    }
}

module.exports = connectDB;