import { describe, expect, it } from "vitest";
import { resourceInputSchema, signupSchema, createMemberInputSchema } from "../lib/validators";

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

describe("signupSchema & createMemberInputSchema", () => {
  const validMember = {
    name: "Alice Smith",
    email: "Alice.Smith@Organization.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  it("accepts valid registration data and normalizes email", () => {
    const parsed = signupSchema.parse(validMember);
    expect(parsed.name).toBe("Alice Smith");
    expect(parsed.email).toBe("alice.smith@organization.com");
    expect(parsed.password).toBe("Password123!");
    expect(parsed.confirmPassword).toBe("Password123!");
  });

  it("rejects mismatched passwords with specific issue path", () => {
    const res = signupSchema.safeParse({
      ...validMember,
      confirmPassword: "DifferentPassword123",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes("confirmPassword"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Passwords do not match");
    }
  });

  it("rejects passwords shorter than 6 characters", () => {
    const res = signupSchema.safeParse({
      ...validMember,
      password: "12345",
      confirmPassword: "12345",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("at least 6 characters");
    }
  });

  it("rejects names shorter than 2 characters", () => {
    const res = signupSchema.safeParse({
      ...validMember,
      name: " A ",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("at least 2 characters");
    }
  });

  it("rejects invalid email formats", () => {
    const res = signupSchema.safeParse({
      ...validMember,
      email: "not-an-email",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("Invalid email address");
    }
  });

  it("allows createMemberInputSchema without confirmPassword", () => {
    const parsed = createMemberInputSchema.parse({
      name: "Bob Jones",
      email: "bob@org.dev",
      password: "SecretPassword1",
    });
    expect(parsed.name).toBe("Bob Jones");
    expect(parsed.email).toBe("bob@org.dev");
  });
});

