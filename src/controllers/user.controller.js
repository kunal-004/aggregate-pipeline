import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CloudinaryFileUpload } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

//register
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, password } = req.body;

  if (
    [fullName, userName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(404, "invalid credentails");
  }
  const existingUSer = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (existingUSer) {
    throw new ApiError(409, "user already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(404, "avatar is required");
  }
  const avatar = await CloudinaryFileUpload(avatarLocalPath);
  const coverImage = await CloudinaryFileUpload(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(404, "avatar Not found");
  }
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating User");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "user created successfully", createdUser));
});

//generate access , refresh token
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access and refresh tokens"
    );
  }
};

//Login
const loginUSer = asyncHandler(async (req, res) => {
  const { email, password, userName } = req.body;

  if (!(email || userName)) {
    throw new ApiError(400, "email or userName are required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const ValidatedUser = await user.isPasswordValid(password);
  if (!ValidatedUser) {
    throw new ApiError(401, "invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const LoggedInUser = await User.findById(user._id).select(
    "-password -refreshToken "
  );

  const options = {
    httpOnly: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User details success", {
        user: LoggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

//logout
const LogoutUser = asyncHandler(async (req, res) => {
  const user = req.user;
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully", {}));
});

const RefreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const IncomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!IncomingRefreshToken) {
      throw new ApiError(401, "No refresh token provided");
    }

    const DecodedToken = jwt.verify(
      IncomingRefreshToken,
      process.env.REFRESH_TOKEN_KEY
    );

    const user = await User.findById(DecodedToken?._id);
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    if (IncomingRefreshToken !== user.RefreshAccessToken) {
      throw new ApiError(401, "Refresh token does not match");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(
          200,
          "Access token and refresh token generated successfully",
          {
            accessToken,
            refreshToken,
          }
        )
      );
  } catch (error) {
    console.log(error.message);
    throw new ApiError(error.status || 500, error.message);
  }
});

export { registerUser, loginUSer, LogoutUser, RefreshAccessToken };
