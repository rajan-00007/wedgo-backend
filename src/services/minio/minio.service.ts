import { minioClient } from "../../config/minio";
import { randomUUID } from "crypto";

const BUCKET = process.env.MINIO_BUCKET!;

export async function uploadImage(file: Express.Multer.File, folder: string = "wallpapers") {
  const ext = file.originalname.split(".").pop();
  const objectName = `${folder}/${randomUUID()}.${ext}`;

  await minioClient.putObject(
    BUCKET,
    objectName,
    file.buffer,
    file.size,
    { "Content-Type": file.mimetype }
  );

  return objectName;
}
