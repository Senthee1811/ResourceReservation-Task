import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { users, type User } from "./db/schema";
import { DomainError } from "./errors";
import { loginSchema, createMemberInputSchema, signupSchema } from "./validators";

export const COOKIE_NAME = "session";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type SessionPayload = {
  sub: string;
  role: "ADMIN" | "MEMBER";
  name: string;
};

// Rate limiting / throttling storage
const MAX_FAILED_ATTEMPTS = 5;
const THROTTLE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

type ThrottleRecord = {
  count: number;
  firstFailedAt: number;
};

const loginAttempts = new Map<string, ThrottleRecord>();

export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (
    !secret ||
    (process.env.NODE_ENV === "production" &&
      secret === "change-me-to-a-long-random-string")
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to a secure string in production");
    }
  }
  return new TextEncoder().encode(secret || "change-me-to-a-long-random-string");
}

export function checkLoginThrottle(
  email: string,
  nowMs = Date.now(),
): { throttled: boolean; retryAfterMs?: number } {
  const key = email.trim().toLowerCase();
  const record = loginAttempts.get(key);
  if (!record) return { throttled: false };

  if (nowMs - record.firstFailedAt > THROTTLE_WINDOW_MS) {
    loginAttempts.delete(key);
    return { throttled: false };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterMs = THROTTLE_WINDOW_MS - (nowMs - record.firstFailedAt);
    return { throttled: true, retryAfterMs };
  }

  return { throttled: false };
}

export function recordFailedLogin(email: string, nowMs = Date.now()): void {
  const key = email.trim().toLowerCase();
  const record = loginAttempts.get(key);
  if (!record || nowMs - record.firstFailedAt > THROTTLE_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstFailedAt: nowMs });
  } else {
    record.count += 1;
  }
}

export function resetLoginAttempts(email: string): void {
  loginAttempts.delete(email.trim().toLowerCase());
}

export function clearAllLoginAttempts(): void {
  loginAttempts.clear();
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    return {
      sub: payload.sub as string,
      role: payload.role as "ADMIN" | "MEMBER",
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function getCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export async function createSession(user: {
  id: string;
  role: "ADMIN" | "MEMBER";
  name: string;
}): Promise<string> {
  const token = await encryptSession({
    sub: user.id,
    role: user.role,
    name: user.name,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, getCookieOptions());
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await decryptSession(token);
  } catch {
    return null;
  }
}

export async function authenticateCredentials(
  emailInput: unknown,
  passwordInput: unknown,
  nowMs = Date.now(),
): Promise<User> {
  const parsed = loginSchema.safeParse({ email: emailInput, password: passwordInput });
  if (!parsed.success) {
    throw new DomainError("VALIDATION", "Invalid email or password");
  }

  const { email, password } = parsed.data;

  const throttle = checkLoginThrottle(email, nowMs);
  if (throttle.throttled) {
    const minutesLeft = Math.ceil((throttle.retryAfterMs ?? 0) / 60000);
    throw new DomainError(
      "FORBIDDEN",
      `Too many failed attempts. Please try again in ${minutesLeft} minute(s).`,
    );
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    recordFailedLogin(email, nowMs);
    throw new DomainError("VALIDATION", "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    recordFailedLogin(email, nowMs);
    throw new DomainError("VALIDATION", "Invalid email or password");
  }

  resetLoginAttempts(email);
  return user;
}

export type SignupMemberInput = {
  name: unknown;
  email: unknown;
  password: unknown;
  confirmPassword?: unknown;
};

/**
 * Registers a new member user with role MEMBER.
 * Validates credentials, checks for existing accounts, hashes the password,
 * and inserts the record into PostgreSQL.
 */
export async function signupMember(input: SignupMemberInput): Promise<User> {
  const schemaToUse =
    input.confirmPassword !== undefined ? signupSchema : createMemberInputSchema;
  const parsed = schemaToUse.safeParse(input);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new DomainError(
      "VALIDATION",
      firstIssue?.message || "Invalid member registration details",
    );
  }

  const { name, email, password } = parsed.data;

  // Case-insensitive email duplicate check
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    throw new DomainError(
      "CONFLICT",
      "An account with this email address already exists",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role: "MEMBER",
      })
      .returning();

    return newUser;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      throw new DomainError(
        "CONFLICT",
        "An account with this email address already exists",
      );
    }
    throw err;
  }
}

/**
 * Re-reads user from DB so role changes or deletions take immediate effect.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session?.sub) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.sub));
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?error=session_expired");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/resources?error=forbidden");
  }
  return user;
}

export async function listAllUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
}

