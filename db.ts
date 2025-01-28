import mongoose from "mongoose";
import { logError } from "./utils/logger";



const connectDB = async (DB_URL: string) => {
  try {
    await mongoose.connect(DB_URL);
    console.log("connected to MongoDB");
    console.log("----------------------");

  } catch (err) {
    logError("DATABASE CONNECTION: ", err);
    throw new Error("Database connection failed!");
  }
};

export default connectDB;
