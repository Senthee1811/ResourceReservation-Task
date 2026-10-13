import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const cookieSetMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: cookieSetMock,
    delete: vi.fn(),
  })),
}));

import { sql, eq } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { users } from "../lib/db/schema";
import { signupAction } from "../app/actions/auth-actions";

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);
  await db.insert(users).values({
    name: "Existing Person",
    email: "existing@action.test",
    passwordHash: "hash",
    role: "MEMBER",
  });
});

afterAll(async () => {
  await pool.end();
});

describe("signupAction server action", () => {
  it("returns field errors and error message on invalid input", async () => {
    const fd = new FormData();
    fd.set("name", "A"); // too short (< 2)
    fd.set("email", "invalid-email");
    fd.set("password", "123"); // too short (< 6)
    fd.set("confirmPassword", "456"); // mismatch

    const result = await signupAction({}, fd);
    expect(result.error).toBeDefined();
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors?.name).toBeDefined();
    expect(result.fieldErrors?.email).toBeDefined();
    expect(result.fieldErrors?.password).toBeDefined();
    expect(result.fieldErrors?.confirmPassword).toBeDefined();
  });

  it("returns conflict error when email is already in use", async () => {
    const fd = new FormData();
    fd.set("name", "Existing User Clone");
    fd.set("email", "existing@action.test");
    fd.set("password", "Password123!");
    fd.set("confirmPassword", "Password123!");

    const result = await signupAction({}, fd);
    expect(result.error).toBe("An account with this email address already exists");
  });

  it("creates member, sets session cookie, and redirects to /resources on valid signup", async () => {
    redirectMock.mockClear();
    cookieSetMock.mockClear();

    const fd = new FormData();
    fd.set("name", "Newly Registered");
    fd.set("email", "newly.registered@action.test");
    fd.set("password", "ValidPass123!");
    fd.set("confirmPassword", "ValidPass123!");

    await expect(signupAction({}, fd)).rejects.toThrow("REDIRECT:/resources");

    expect(cookieSetMock).toHaveBeenCalled();
    const [cookieCall] = cookieSetMock.mock.calls;
    expect(cookieCall[0]).toBe("session");
    expect(typeof cookieCall[1]).toBe("string");

    // Assert user created in PostgreSQL
    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, "newly.registered@action.test"));
    expect(created).toBeDefined();
    expect(created.name).toBe("Newly Registered");
    expect(created.role).toBe("MEMBER");
  });
});
