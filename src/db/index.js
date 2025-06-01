import mongoose from 'mongoose';
import { DB_NAME } from '../constant.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB Connected !!! Database Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log('MongoDB Connection Error: ', error);
        process.exit(1);
    }
}

export default connectDB;