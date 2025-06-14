import { Router } from "express";
import { changeUserPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateCoverImage, getUserChannelProfile, getUserWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser);

userRouter.route("/login").post(
    loginUser
)

//Secured Routes -- Routes which have acccess only after we login
userRouter.route("/logout").post(verifyJWT, logoutUser);//Now, we will have access to user object as we have added it to our request object

userRouter.route("/refresh-token").post(refreshAccessToken);

userRouter.route("/change-password").post(verifyJWT, changeUserPassword);

userRouter.route("/current-user").get(verifyJWT, getCurrentUser);

userRouter.route("/update-account-details").patch(verifyJWT, updateAccountDetails);

userRouter.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

// Note: The `upload.single("avatar")` middleware is used to handle single file uploads for the avatar field.
// If you want to handle multiple files or different fields, you can adjust the multer configuration accordingly.
// The `verifyJWT` middleware is used to protect the routes, ensuring that only authenticated users can access them.    

userRouter.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

userRouter.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

// The `getUserChannelProfile` route is used to fetch the channel profile of a user by their username.
// The `verifyJWT` middleware ensures that the user is authenticated before accessing this route.   

// The `upload` middleware is used to handle file uploads for the avatar and cover image fields.
// The `verifyJWT` middleware is used to protect the routes, ensuring that only authenticated users can access them.

userRouter.route("/watch-history").get(verifyJWT, getUserWatchHistory);


    

export default userRouter;