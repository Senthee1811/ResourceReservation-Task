import { describe, expect, it } from "vitest";
import { resourceInputSchema } from "../lib/validators";

describe("resourceInputSchema - checkbox handling", () => {
  const base = {
    name: "Conference Room A",
    type: "Room",
    capacity: 10,
  };

  it("parses string 'on' as true", () => {
    const res = resourceInputSchema.parse({ ...base, isActive: "on" });
    expect(res.isActive).toBe(true);
  });

  it("parses string 'true' as true", () => {
    const res = resourceInputSchema.parse({ ...base, isActive: "true" });
    expect(res.isActive).toBe(true);
  });

  it("parses boolean true as true", () => {
    const res = resourceInputSchema.parse({ ...base, isActive: true });
    expect(res.isActive).toBe(true);
  });

  it("parses string 'false' as false (fixing the z.coerce bug)", () => {
    const res = resourceInputSchema.parse({ ...base, isActive: "false" });
    expect(res.isActive).toBe(false);
  });

  it("parses absent / undefined as false", () => {
    const res = resourceInputSchema.parse({ ...base });
    expect(res.isActive).toBe(false);
  });

  it("parses boolean false as false", () => {
    const res = resourceInputSchema.parse({ ...base, isActive: false });
    expect(res.isActive).toBe(false);
  });

  it("parses other string values as false", () => {
    const res = resourceInputSchema.parse({ ...base, isActive: "off" });
    expect(res.isActive).toBe(false);
  });
});
