import { Client } from "minio";

const endPoint = process.env.MINIO_ENDPOINT;
const accessKey = process.env.MINIO_ACCESS_KEY;
const secretKey = process.env.MINIO_SECRET_KEY;

if (!endPoint) {
    console.error("❌ MINIO_ENDPOINT is not defined in environment variables");
}

export const minioClient = new Client({
    endPoint: endPoint || "localhost",
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: accessKey || "minioadmin",
    secretKey: secretKey || "minioadmin",
});

