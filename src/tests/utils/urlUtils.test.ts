import { getFullMediaUrl, MINIO_BASE_URL } from "../../utils/urlUtils";

describe("URL Utils", () => {
  it("should return null for empty input", () => {
    expect(getFullMediaUrl(null)).toBeNull();
    expect(getFullMediaUrl(undefined)).toBeNull();
    expect(getFullMediaUrl("")).toBeNull();
  });

  it("should return the same url if it already contains http/https", () => {
    const fullUrl = "https://example.com/image.png";
    expect(getFullMediaUrl(fullUrl)).toBe(fullUrl);
    expect(getFullMediaUrl("http://old.com/img.jpg")).toBe("http://old.com/img.jpg");
  });

  it("should prepend base url and clean leading slash", () => {
    expect(getFullMediaUrl("/test/path.png")).toBe(`${MINIO_BASE_URL}test/path.png`);
    expect(getFullMediaUrl("no-slash.jpg")).toBe(`${MINIO_BASE_URL}no-slash.jpg`);
  });
});
