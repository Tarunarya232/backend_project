import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema(
{
    username:{
        type:String,
        required: true,
        unique: true,
        trim:true,
        lowercase:true,
        index:true,
    },
    email:{
        type:String,
        required: true,
        unique: true,
        trim:true,
        lowercase:true,
    }, 
    fullName:{
        type:String,
        required: true,
        trim:true,
        index:true,
    },  
    avatar:{
        type:String, //It is going to be cloudinary URL.
        required:true,
    },
    coverImage:{
        type:String,
    },
    watchHistory:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Video",

    }],
    password:{
        type:String,
        required:[true, "Password is required"],
    },
    refreshToken:{
        type:String,
    }

}
, {timestamps:true});

userSchema.pre("save", async function (next){
    if(!this.isModified("password")){ //This is because we want it to be only activate when password is modified and saved, and not in case of something else. 
        return next();
    }
    this.password = bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);

}

userSchema.methods.generateAccessToken = function(){
    jwt.sign(
        {//Payload -- Data
            _id: this._id,
            email: this.email,
            username:this.username,
            fullName: this.fullName,
        },
        //secretOrPrivateKey
        process.env.ACCESS_TOKEN_SECRET,
        //JWT algorithm to be used
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    jwt.sign(
        {//Payload -- Data
            _id: this._id,
        },
        //secretOrPrivateKey
        process.env.ACCESS_TOKEN_SECRET,
        //JWT algorithm to be used
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
        }
    )    
}
export const User = mongoose.model("User", userSchema);