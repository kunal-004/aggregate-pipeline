import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/index.js";

const app = express();
dotenv.config({ path: "./env" });

connectDB();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGO_URL}/${DB_USER}`);
//     app.on("error", (err) => {
//       console.error(err);
//       throw err;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
// })();
