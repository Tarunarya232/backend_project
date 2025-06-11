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
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponseError.js";

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = User.findById(userId); //First getting the reference of the user

        //Using user reference, we will call the methods that we defined in user.model.js using MongoDB
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //Now, we set the refreshToken field present inside the user object
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        //Now, that we have set refreshToken, we will return the access token and the refresh token
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access Token and Refresh Token");
    }
}

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
    if (!username && !email) {
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
        secure: true,     // Send cookies only over HTTPS
        sameSite: "strict" // Prevent CSRF (optional but recommended)
    };

    // 7. Return success response with cookies and user data.
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
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
        sameSite: "strict" // Prevent CSRF (optional but recommended)
    };

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out"));
    
})
export { registerUser, loginUser, logoutUser };
