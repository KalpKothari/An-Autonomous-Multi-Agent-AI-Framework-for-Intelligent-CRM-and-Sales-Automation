import mongoose from "mongoose";
import { logCallFailureSafely } from "../utils/eventLogger";

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    await logCallFailureSafely(
      "unavailable",
      "Database connection failed",
      error
    );
    process.exit(1);
  }
};

export default connectDatabase;