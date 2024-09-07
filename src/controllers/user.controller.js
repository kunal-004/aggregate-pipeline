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

    if (IncomingRefreshToken !== user.refreshToken) {
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCoorect = user.isPasswordValid(oldPassword);

  if (!isPasswordCoorect) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully", {}));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "User data fetched successfully", req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;
  if (!email || !fullName) {
    throw new ApiError(400, "Email and full name are required");
  }
  const updatedUSer = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        email,
        fullName,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Account details updated successfully", updatedUSer)
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadFileToCloudinary(avatarLocalPath);

  const user = User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar updated successfully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params;

  if (!userName) {
    throw new ApiError(400, "User name is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        userName: userName?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "Subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "Subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subcribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            $if: { $in: [req.user._id, "$subscribers.subscriber"] },
            $then: true,
            $else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        userName: 1,
        subcribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        fullName: 1,
      },
    },
  ]);
  if (!channel?.length) {
    return res.status(404).json({ message: "Channel not found" });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Channel fetched success", channel[0]));
});

export {
  registerUser,
  loginUSer,
  LogoutUser,
  RefreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
};
