import { createEventValidator, updateEventValidator } from "../../validators/events/eventValidator";

describe("Event Validator Refine Branches", () => {
  const baseData = {
    name: "Wedding",
    event_date: "2029-12-31", // Far in future
    start_time: "10:00",
    end_time: "12:00",
    location: "Hotel"
  };

  it("createEventValidator: success when times are correct", () => {
    const result = createEventValidator.safeParse(baseData);
    expect(result.success).toBe(true);
  });

  it("createEventValidator: fail when end_time is before start_time", () => {
    const result = createEventValidator.safeParse({
      ...baseData,
      start_time: "12:00",
      end_time: "10:00"
    });
    expect(result.success).toBe(false);
  });

  it("updateEventValidator: success when only name provided (Line 78 branch)", () => {
    const result = updateEventValidator.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("updateEventValidator: success when only start_time provided (Line 78 branch)", () => {
    const result = updateEventValidator.safeParse({ start_time: "10:00" });
    expect(result.success).toBe(true);
  });

  it("updateEventValidator: fail when end_time is before start_time in update", () => {
    const result = updateEventValidator.safeParse({ 
      start_time: "12:00",
      end_time: "10:00" 
    });
    expect(result.success).toBe(false);
  });
});
