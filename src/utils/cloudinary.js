import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CloudinaryFileUpload = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    const Response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("Fole uploaded", Response.url);
    return Response;
  } catch (error) {
    console.error("Error uploading file", error);
    fs.unlinkSync(localFilePath); //remove temp file from server as ops fails
    return null;
  }
};
