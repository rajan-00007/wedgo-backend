import blessingRepositories from "../../repositories/blessings/blessingRepositories";
import mediaRepository from "../../repositories/media/mediaRepository";
import pool from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn()
}));

describe("Blessing & Media Repositories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("BlessingRepository", () => {
    it("should create blessing (Lines 22-92 logic coverage)", async () => {
      const mockB = { id: "b1", name: "G" };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockB] });
      
      const b = await blessingRepositories.createBlessing({ 
        couple_id: "c1", 
        name: "G", 
        message: "M", 
        image_url: "u1" 
      });
      expect(b).toEqual(mockB);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO blessings"), expect.any(Array));
    });

    it("should find by couple id", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await blessingRepositories.findByCoupleId("c1");
        expect(pool.query).toHaveBeenCalled();
    });

    it("should like blessing", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await blessingRepositories.likeBlessing("b1", "d1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO blessing_likes"), ["b1", "d1"]);
    });
  });

  describe("MediaRepository", () => {
    it("should create media", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: "m1" }] });
        await mediaRepository.createMedia({ couple_id: "c1", file_url: "img", file_type: "image" });
        expect(pool.query).toHaveBeenCalled();
    });

    it("should like media (Lines 42-44 logic coverage)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await mediaRepository.likeMedia("m1", "d1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO media_likes"), ["m1", "d1"]);
    });
  });
});
