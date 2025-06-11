import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
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

export default userRouter;