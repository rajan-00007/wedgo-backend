import { msg91Provider } from "../../providers/msg91Provider";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MSG91 Provider", () => {
  const phone = "+919876543210";
  const message = "Your OTP is 1234";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send OTP successfully on first attempt", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { type: "success" }, status: 200 });
    
    const response = await msg91Provider.send(phone, message);
    expect(response.type).toBe("success");
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it("should retry and succeed if first attempt returns error type (Line 31-35)", async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { type: "error" }, status: 200 })
      .mockResolvedValueOnce({ data: { type: "success" }, status: 200 });

    const response = await msg91Provider.send(phone, message);
    expect(response.type).toBe("success");
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("should retry and fail if both attempts return error type (Line 37-40)", async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { type: "error" }, status: 200 })
      .mockResolvedValueOnce({ data: { type: "error" }, status: 200 })
      .mockResolvedValueOnce({ data: { type: "error" }, status: 200 }); // Third call for catch block retry

    await expect(msg91Provider.send(phone, message)).rejects.toThrow("MSG91 fallback failed");
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  it("should extract OTP from message if not in data (Line 8 branch)", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { type: "success" }, status: 200 });
    
    await msg91Provider.send(phone, "Your OTP is 556677");
    expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ otp: "556677" }),
        expect.any(Object)
    );
  });

  it("should use OTP from data object if provided (Line 8 branch)", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { type: "success" }, status: 200 });
    
    await msg91Provider.send(phone, "Message with no digits", { otp: "998877" });
    expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ otp: "998877" }),
        expect.any(Object)
    );
  });

  it("should use empty string if no OTP found (Line 8 branch fallback)", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { type: "success" }, status: 200 });
    
    await msg91Provider.send(phone, "Message with no digits");
    expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ otp: "" }),
        expect.any(Object)
    );
  });

  it("should retry and succeed if first attempt throws exception (Line 46-58)", async () => {
    mockedAxios.post
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ data: { type: "success" }, status: 200 });

    const response = await msg91Provider.send(phone, message);
    expect(response.type).toBe("success");
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("should fail if second attempt also throws exception (Line 59-62)", async () => {
    mockedAxios.post
      .mockRejectedValueOnce(new Error("Primary Fail"))
      .mockRejectedValueOnce(new Error("Fallback Fail"));

    await expect(msg91Provider.send(phone, message)).rejects.toThrow("Fallback Fail");
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("should throw error if second attempt returns error data after first throws exception (Line 53-55)", async () => {
    mockedAxios.post
      .mockRejectedValueOnce(new Error("Exception"))
      .mockResolvedValueOnce({ data: { type: "error" }, status: 200 });

    await expect(msg91Provider.send(phone, message)).rejects.toThrow("MSG91 fallback failed");
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });
});
