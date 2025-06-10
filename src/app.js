import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:'16kb'}));
app.use(express.urlencoded({extended:true, limit: '16kb' }));
app.use(express.static("./public"));
app.use(cookieParser());


//Routes 
import userRouter from "./routes/user.route.js";

app.use("/api/v1/users", userRouter);

export {app};