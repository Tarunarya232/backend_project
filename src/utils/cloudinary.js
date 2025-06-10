import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath){ //If local file path doesn't exist
            return null;  
        } else{ //If file path did exists
            // Upload an image
            const uploadResult = await cloudinary.uploader
            .upload(localFilePath, {
                    resource_type: "auto",
                }
            )
            .catch((error) => {
                console.log(error);
            });
        
            // console.log("file is uploaded on cloudinary", uploadResult.url);
            //If file is uploaded till this step, we need to remove it from our local storage which we can do by unlinking it
            fs.unlinkSync(localFilePath);
            return uploadResult;
        }
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}
    
export {uploadOnCloudinary};