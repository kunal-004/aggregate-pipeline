import mongoose from "mongoose";
import { DB_USER } from "../constants.js";

const connectDB = async () => {
  try {
    const ConnectionInstance = await mongoose.connect(
      `${process.env.MONGO_URL}/${DB_USER}`
    );
    console.log(`MongoDB Connected... ${ConnectionInstance.connection.host}`);
    return ConnectionInstance;
  } catch (err) {
    console.log("Mongo Error", err);
    process.exit(1);
  }
};

export default connectDB;
