describe("Logger Utils", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("should use debug level in development", () => {
    process.env.NODE_ENV = "development";
    const logger = require("../../utils/logger").default;
    expect(logger.level).toBe("debug");
  });

  it("should use warn level in production", () => {
    process.env.NODE_ENV = "production";
    const logger = require("../../utils/logger").default;
    expect(logger.level).toBe("warn");
  });

  it("should use debug level by default if NODE_ENV is missing", () => {
    delete process.env.NODE_ENV;
    const logger = require("../../utils/logger").default;
    expect(logger.level).toBe("debug");
  });
});
