import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { users } from "../lib/db/schema";
import {
  authenticateCredentials,
  checkLoginThrottle,
  decryptSession,
  encryptSession,
  recordFailedLogin,
  resetLoginAttempts,
} from "../lib/auth";

const testMemberEmail = "testmember@org.dev";
const testPassword = "Password@123";

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);
  const passwordHash = await bcrypt.hash(testPassword, 10);
  await db.insert(users).values([
    {
      name: "Test Admin",
      email: "testadmin@org.dev",
      passwordHash,
      role: "ADMIN",
    },
    {
      name: "Test Member",
      email: testMemberEmail,
      passwordHash,
      role: "MEMBER",
    },
  ]);
});

afterAll(async () => {
  await pool.end();
});

describe("lib/auth - session tokens", () => {
  it("encrypts and decrypts session token with HS256", async () => {
    const payload = {
      sub: "123e4567-e89b-12d3-a456-426614174000",
      role: "MEMBER" as const,
      name: "Alex",
    };
    const token = await encryptSession(payload);
    expect(typeof token).toBe("string");

    const decoded = await decryptSession(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(payload.sub);
    expect(decoded?.role).toBe("MEMBER");
    expect(decoded?.name).toBe("Alex");
  });

  it("returns null on tampered token", async () => {
    const valid = await encryptSession({
      sub: "123",
      role: "ADMIN",
      name: "Root",
    });
    const tampered = valid.slice(0, -5) + "abcde";
    const result = await decryptSession(tampered);
    expect(result).toBeNull();
  });
});

describe("lib/auth - credential authentication", () => {
  it("authenticates valid credentials successfully", async () => {
    const user = await authenticateCredentials(testMemberEmail, testPassword);
    expect(user.email).toBe(testMemberEmail);
    expect(user.role).toBe("MEMBER");
  });

  it("rejects invalid password with generic validation error", async () => {
    await expect(
      authenticateCredentials(testMemberEmail, "WrongPassword"),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Invalid email or password",
    });
  });

  it("rejects non-existent email with the exact same error (no user enumeration)", async () => {
    await expect(
      authenticateCredentials("nobody@org.dev", "AnyPassword"),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Invalid email or password",
    });
  });

  it("throttles after 5 consecutive failed attempts for an email", async () => {
    const targetEmail = "target@org.dev";
    resetLoginAttempts(targetEmail);

    for (let i = 0; i < 4; i++) {
      recordFailedLogin(targetEmail);
      expect(checkLoginThrottle(targetEmail).throttled).toBe(false);
    }

    recordFailedLogin(targetEmail);
    expect(checkLoginThrottle(targetEmail).throttled).toBe(true);

    // Attempting authentication while throttled throws FORBIDDEN with retry notice
    await expect(
      authenticateCredentials(targetEmail, "AnyPassword"),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("Too many failed attempts"),
    });

    // Resetting attempts clears the throttle
    resetLoginAttempts(targetEmail);
    expect(checkLoginThrottle(targetEmail).throttled).toBe(false);
  });
});
