import { upload, uploadMediaFiles } from "../../middlewares/multer/upload";

describe("Multer Middleware", () => {
  it("upload: should allow image files", () => {
    const file = { mimetype: "image/png" } as any;
    const cb = jest.fn();
    (upload as any).fileFilter(null, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it("upload: should reject non-image files (Line 10)", () => {
    const file = { mimetype: "application/pdf" } as any;
    const cb = jest.fn();
    (upload as any).fileFilter(null, file, cb);
    expect(cb).toHaveBeenCalledWith(new Error("Only images are allowed"));
  });

  it("uploadMediaFiles: should allow image and video files", () => {
    const imgFile = { mimetype: "image/jpeg" } as any;
    const vidFile = { mimetype: "video/mp4" } as any;
    const cb = jest.fn();
    
    (uploadMediaFiles as any).fileFilter(null, imgFile, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
    
    (uploadMediaFiles as any).fileFilter(null, vidFile, cb);
    expect(cb).toHaveBeenLastCalledWith(null, true);
  });

  it("uploadMediaFiles: should reject other files (Line 22)", () => {
    const file = { mimetype: "text/plain" } as any;
    const cb = jest.fn();
    (uploadMediaFiles as any).fileFilter(null, file, cb);
    expect(cb).toHaveBeenCalledWith(new Error("Only images and videos are allowed"));
  });
});
