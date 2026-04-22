import pool from "../../config/database";
import { types } from "pg";

describe("Database Config", () => {
    it("should have initialized the pool", () => {
        expect(pool).toBeDefined();
    });

    it("should have registered DATE type parser (OID 1082)", () => {
        const parser = types.getTypeParser(1082, "text");
        expect(parser("2024-01-01")).toBe("2024-01-01");
    });
});
