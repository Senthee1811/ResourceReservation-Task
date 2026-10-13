"use server";

import { redirect } from "next/navigation";
import {
  authenticateCredentials,
  clearAllLoginAttempts,
  createSession,
  destroySession,
  signupMember,
} from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { signupSchema } from "@/lib/validators";

export type LoginActionState = {
  error?: string;
};

export async function resetLockoutAction(): Promise<LoginActionState> {
  clearAllLoginAttempts();
  return {};
}

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

export type SignupActionState = {
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
};

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signupSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstErrorMessage =
      parsed.error.issues[0]?.message || "Please fix the validation errors below.";
    return {
      error: firstErrorMessage,
      fieldErrors,
    };
  }

  try {
    const user = await signupMember(parsed.data);
    await createSession(user);
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: "An unexpected error occurred during signup. Please try again." };
  }

  redirect("/resources");
}

