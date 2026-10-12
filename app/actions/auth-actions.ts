"use server";

import { redirect } from "next/navigation";
import {
  authenticateCredentials,
  createSession,
  destroySession,
} from "@/lib/auth";
import { DomainError } from "@/lib/errors";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const user = await authenticateCredentials(email, password);
    await createSession(user);
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: "An unexpected error occurred. Please try again." };
  }

  redirect("/resources");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
