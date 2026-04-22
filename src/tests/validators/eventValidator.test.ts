import { createEventValidator, updateEventValidator } from "../../validators/events/eventValidator";

describe("Event Validator Refine Branches", () => {
  const baseData = {
    name: "Wedding",
    event_date: "2029-12-31", // Far in future
    start_time: "10:00",
    end_time: "12:00",
    location: "Hotel"
  };

  it("createEventValidator: failure when fields are empty (hits line 50 branch)", () => {
    // Passing an empty string for start_time will fail regex validation,
    // but might trigger the falsey check in refinement (Line 50) if zod evaluates it.
    const result = createEventValidator.safeParse({ ...baseData, start_time: "" });
    expect(result.success).toBe(false);
  });

  it("eventDateSchema: fail for past date", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const result = createEventValidator.safeParse({
        ...baseData,
        event_date: pastDate.toISOString().split('T')[0]
    });
    expect(result.success).toBe(false);
  });

  it("eventDateSchema: fail for invalid date string", () => {
    const result = createEventValidator.safeParse({
        ...baseData,
        event_date: "invalid-date"
    });
    expect(result.success).toBe(false);
  });

  it("updateEventValidator: success when times are same (Line 76 is <, so same time should fail if logic expects strictly after)", () => {
    // Actually start_time < end_time means same time fails.
    const result = updateEventValidator.safeParse({ 
      start_time: "10:00",
      end_time: "10:00" 
    });
    expect(result.success).toBe(false);
  });
});
