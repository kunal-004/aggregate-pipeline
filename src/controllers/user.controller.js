import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CloudinaryFileUpload } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  //check for user details
  //validation of deatils
  //check if already exists
  //check for image , avatar
  //upload to cloudinary
  //create user obj, in db
  //remove password and refresh token
  //create user
  //return res

  const { fullName, userName, email, password } = req.body;
  console.log(email);

  if (
    [fullName, userName, email, password].some((field) => field?.trim() === "")
  ) {
    throw ApiError(404, "invalid credentails");
  }
  const existingUSer = User.findOne({
    $or: [{ email }, { userName }],
  });
  if (existingUSer) {
    throw ApiError(409, "user already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw ApiError(404, "avatar is required");
  }
  const avatar = await CloudinaryFileUpload(avatarLocalPath);
  const coverImage = await CloudinaryFileUpload(coverImageLocalPath);

  if (!avatar) {
    throw ApiError(404, "avatar Not found");
  }
  const user = await User.create({
    fullName,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(User._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw ApiError(500, "something went wrong while creating User");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "user created successfully", createdUser));
});

export { registerUser };
