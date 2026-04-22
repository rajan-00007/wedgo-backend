import { uploadImage, uploadBuffer } from "../../services/minio/minio.service";
import { minioClient } from "../../config/minio";

jest.mock("../../config/minio", () => ({
  minioClient: {
    putObject: jest.fn().mockResolvedValue(null)
  }
}));

describe("Minio Service", () => {
  const mockFile = {
    originalname: "test.png",
    buffer: Buffer.from("test"),
    size: 4,
    mimetype: "image/png"
  } as Express.Multer.File;

  it("should upload image successfully", async () => {
    const result = await uploadImage(mockFile, "test-folder");
    expect(result).toContain("test-folder/");
    expect(result).toContain(".png");
    expect(minioClient.putObject).toHaveBeenCalled();
  });

  it("should upload image with default folder", async () => {
    const result = await uploadImage(mockFile);
    expect(result).toContain("wallpapers/");
    expect(minioClient.putObject).toHaveBeenCalled();
  });

  it("should upload buffer successfully", async () => {
    const buffer = Buffer.from("test-buffer");
    const result = await uploadBuffer(buffer, "image/jpeg", "qr-folder");
    expect(result).toContain("qr-folder/");
    expect(result).toContain(".jpeg");
    expect(minioClient.putObject).toHaveBeenCalled();
  });

  it("should upload buffer with default folder", async () => {
    const buffer = Buffer.from("test-buffer");
    const result = await uploadBuffer(buffer, "image/png");
    expect(result).toContain("qr-codes/");
    expect(minioClient.putObject).toHaveBeenCalled();
  });
});
