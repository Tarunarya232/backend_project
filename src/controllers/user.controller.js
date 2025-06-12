    //Steps to follow to register a user:
    //Get User Details from frontend or Postman
    //Validate the data in the backend, e.g., check if it's non-empty
    //Check if user already exists by using fields such as username and email
    //Check for images, check for avatar
    //Upload the image to cloudinary, avatar, 
    //Create user object - create entry in db
    //Remove password and refresh token field from response
    //Check for user creation
    //Return response. 

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFileFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        // 1. Retrieve the user document by ID
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        // 2. Generate access and refresh tokens using instance methods
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // 3. Save the refresh token to the user's document
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // 4. Return both tokens
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;

    // Validate required fields
    if ([fullName, email, username, password].some((field) => !field || field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Extract file paths
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // Upload to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar?.url) {
        throw new ApiError(400, "Failed to upload avatar");
    }

    // Create user in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    // Sanitize response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Respond
    res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully!!!")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // Steps to Login a user

    // 1. Get user credentials from the frontend or Postman (usually email/username and password).
    const { email, username, password } = req.body;

    // 1a. Ensure at least email or username is provided
    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required for login");
    }

    // 2. Check if the user exists in the database using the provided email or username.
    const user = await User.findOne({
        $or: [{ email }, { username }]
    });

    // 2a. If the user does not exist, return an error.
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // 3. Compare the provided password with the hashed password in the database.
    const isPasswordValid = await user.isPasswordCorrect(password);

    // 3a. If the password does not match, return an error.
    if (!isPasswordValid) {
        throw new ApiError(401, "Wrong password");
    }

    // 4. If the password matches, generate an access token and refresh token.
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // 5. Sanitize the user object before sending it back (exclude password and refreshToken).
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // 6. Set the tokens in cookies with secure options.
    const options = {
        httpOnly: true,   // Prevent access to cookies via JavaScript
        secure: false,     // Send cookies only over HTTPS 
    };
      
    // 7. Return success response with cookies and user data.
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(
            200,
            {
                user: loggedInUser, 
                accessToken, 
                refreshToken
            },
            "User logged in successfully"
        ));
});


const logoutUser = asyncHandler( async (req, res) =>{
    await User.findByIdAndUpdate(req.user._id, 
        {
            $set: {
                refreshToken:undefined,
            }
        },
        {
            new:true,
        }
    )
    const options = {
        httpOnly: true,   // Prevent access to cookies via JavaScript
        secure: true,     // Send cookies only over HTTPS
    };

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out"));
    
});
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    // Check if refresh token is provided
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request: Refresh Token is required");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);//This will be used to convert our incoming refresh token into a decoded token.
    
        const userId = decodedToken?._id;
        //DB query to find user with the given userId
        const user = await User.findById(userId);
        //Check if user exists
        if (!user) {
            throw new ApiError(404, "User not found: Invalid Refresh Token");
        }
        // Check if the refresh token in the database matches the incoming refresh token
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh Token is not valid or has expired");
        }
        // Generate new access and refresh tokens
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(userId);
    
        // Set the new tokens in cookies
        options = {
            httpOnly: true,   // Prevent access to cookies via JavaScript
            secure: true,     // Send cookies only over HTTPS
        };
    
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(new ApiResponse(200, {
            accessToken,
            refreshToken: newRefreshToken
        }, "Access Token refreshed successfully"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized Request: Invalid Refresh Token");
    }
});

const changeUserPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req?.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }
    //save the new password
    user.password = newPassword;
    await user.save({
        validateBeforeSave: false // Skip validation for password change
    });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));

});

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email, username} = req.body;
    if(!fullName || !email || !username) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
        $set: {
            fullName,
            email,
            username: username.toLowerCase()
        }}, { new: true}// Return the updated user -- i.e., the information after the update is returned. 
    ).select("-password -refreshToken");// Exclude password and refreshToken from the response
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    // If the user is found, update the request user object
    req.user = user; // Update the request user object with the new user data
    return res.status(200).json(new ApiResponse(200, user, "User details updated successfully"));

});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path; //Here, we are using req.file because we are using multer middleware to upload a single file, i.e., avatar, initally we used req.files because we were uploading multiple files in form of an array.
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }
    //Deleting the old file stored
    const oldAvatar = req.user?.avatar;
    if (oldAvatar) {
        const result = await deleteFileFromCloudinary(oldAvatar);
        console.log("Deleted from Cloudinary:", result);
        if (!result) {
            throw new ApiError(500, "Failed to delete old avatar from Cloudinary");
        }
    }
    // Upload to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar?.url) {
        throw new ApiError(400, "Failed to upload avatar");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar: avatar?.url
            }
        },
        {new:true}
    ).select("-password -refreshToken"); // Exclude password and refreshToken from the response
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    // If the user is found, update the request user object
    req.user = user; // Update the request user object with the new user data
    return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));
    
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path; //Here, we are using req.file because we are using multer middleware to upload a single file, i.e., coverImage, initally we used req.files because we were uploading multiple files in form of an array.
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }
    //Deleting the old file stored
    const oldCoverImage = req.user?.coverImage;
    if (oldCoverImage) {
        const result = await deleteFileFromCloudinary(oldCoverImage);
        console.log("Deleted from Cloudinary:", result);
        if (!result) {
            throw new ApiError(500, "Failed to delete old cover image from Cloudinary");
        }
    }
    // Upload to Cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage?.url) {
        throw new ApiError(400, "Failed to upload cover image");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage: coverImage?.url
            }
        },
        {new:true}
    ).select("-password -refreshToken"); // Exclude password and refreshToken from the response
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    // If the user is found, update the request user object
    req.user = user; // Update the request user object with the new user data
    return res.status(200).json(new ApiResponse(200, user, "User cover image updated successfully"));
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeUserPassword, getCurrentUser, updateAccountDetails, generateAccessAndRefreshToken, updateUserAvatar, updateCoverImage };
