import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadResourceFile(file: string, publicId?: string) {
  return cloudinary.uploader.upload(file, {
    resource_type: "raw",
    folder: "resources",
    public_id: publicId,
  });
}

export async function deleteResourceFile(publicId: string) {
  return cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}

export default cloudinary;
