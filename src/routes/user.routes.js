import { Router } from "express";
import {
  loginUSer,
  LogoutUser,
  RefreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUSer);

//secure route
router.route("/logout").post(verifyJWT, LogoutUser);
router.route("refresh-token").post(RefreshAccessToken);

export default router;
