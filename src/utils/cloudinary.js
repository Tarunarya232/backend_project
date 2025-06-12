import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configuration (ensure this runs only once)
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        const uploadResult = await cloudinary.v2.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // Delete local file after successful upload
        fs.unlinkSync(localFilePath);
        return uploadResult;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        
        // Clean up local file if upload fails
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
};


//Deletes a file from Cloudinary using its public ID.
const deleteFileFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return;
        // Example URL: https://res.cloudinary.com/demo/image/upload/v1620000000/foldername/filename.jpg
        const url = new URL(fileUrl);
        const parts = url.pathname.split("/"); // ['', 'demo', 'image', 'upload', 'v1620000000', 'folder', 'file.jpg']
        const publicIdWithExtension = parts.slice(5).join("/"); // folder/file.jpg
        const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ""); // remove extension

        const result = await cloudinary.v2.uploader.destroy(publicId, { resource_type: "image" });
        return result;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        throw new Error("Failed to delete file from Cloudinary");
    }
};


export {uploadOnCloudinary, deleteFileFromCloudinary};