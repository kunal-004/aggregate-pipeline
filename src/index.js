import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({ path: "./env" });
const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    app.on("error", (err) => {
      console.log(`Server error ${err}`);
    });
  })
  .catch((err) => {
    console.log("Mongo Connection failed", err);
    process.exit(1);
  });

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
