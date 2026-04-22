import { hashToken } from "../../utils/hash";

describe("Hash Utils", () => {
  it("should hash a token correctly", () => {
    const token = "test-token";
    const hashed = hashToken(token);
    expect(hashed).toBeDefined();
    expect(hashed.length).toBe(64); // SHA-256 hex length
    
    // Verify consistency
    expect(hashToken(token)).toBe(hashed);
    // Verify difference
    expect(hashToken("different")).not.toBe(hashed);
  });
});
