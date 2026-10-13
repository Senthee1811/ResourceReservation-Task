import { describe, expect, it, vi } from "vitest";

// Mock next/navigation and next/headers for server action security testing
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

let mockCookieToken: string | undefined = undefined;

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (mockCookieToken && name === "session" ? { value: mockCookieToken } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import {
  createReservationAction,
  cancelReservationAction,
} from "../app/actions/reservation-actions";
import {
  createResourceAction,
  updateResourceAction,
  toggleResourceStatusAction,
} from "../app/actions/resource-actions";
import { encryptSession } from "../lib/auth";
import { users } from "../lib/db/schema";
import { db } from "../lib/db";
import { eq } from "drizzle-orm";

describe("server actions authentication & authorization guards", () => {
  const serverActions = [
    {
      name: "createReservationAction",
      run: () => createReservationAction({}, new FormData()),
    },
    {
      name: "cancelReservationAction",
      run: () => {
        const fd = new FormData();
        fd.set("reservationId", "some-id");
        return cancelReservationAction(fd);
      },
    },
    {
      name: "createResourceAction",
      run: () => createResourceAction({}, new FormData()),
    },
    {
      name: "updateResourceAction",
      run: () => updateResourceAction("some-id", {}, new FormData()),
    },
    {
      name: "toggleResourceStatusAction",
      run: () => {
        const fd = new FormData();
        fd.set("resourceId", "some-id");
        return toggleResourceStatusAction(fd);
      },
    },
  ];

  it.each(serverActions)(
    "asserts $name rejects unauthenticated calls by redirecting to /login",
    async ({ run }) => {
      mockCookieToken = undefined;
      redirectMock.mockClear();

      await expect(run()).rejects.toThrow("REDIRECT:/login");
    },
  );

  it("asserts admin-only server actions reject MEMBER users with 403 forbidden redirect", async () => {
    // Find or create a member user
    let [member] = await db.select().from(users).where(eq(users.role, "MEMBER")).limit(1);
    if (!member) {
      [member] = await db
        .insert(users)
        .values({
          name: "Sec Member",
          email: "sec.member@test.local",
          passwordHash: "x",
          role: "MEMBER",
        })
        .returning();
    }

    mockCookieToken = await encryptSession({
      sub: member.id,
      role: "MEMBER",
      name: member.name,
    });

    const adminActions = [
      () => createResourceAction({}, new FormData()),
      () => updateResourceAction("some-id", {}, new FormData()),
      () => {
        const fd = new FormData();
        fd.set("resourceId", "some-id");
        return toggleResourceStatusAction(fd);
      },
    ];

    for (const action of adminActions) {
      redirectMock.mockClear();
      await expect(action()).rejects.toThrow("REDIRECT:/resources?error=forbidden");
    }
  });

  it("asserts requireUser redirects with error=session_expired when session user is missing from DB", async () => {
    mockCookieToken = await encryptSession({
      sub: "00000000-0000-0000-0000-000000000000",
      role: "MEMBER",
      name: "Deleted User",
    });
    redirectMock.mockClear();

    await expect(
      createReservationAction({}, new FormData()),
    ).rejects.toThrow("REDIRECT:/login?error=session_expired");
  });
});

