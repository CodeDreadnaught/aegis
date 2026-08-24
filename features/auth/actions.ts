"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { loginSchema } from "@/features/auth/validation";
import { prisma } from "@/server/db/client";
import { createSession, destroyCurrentSession } from "@/server/auth/session";

export type LoginActionState = {
  error?: string;
  fields?: {
    email: string;
    password: string;
  };
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const fields = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = loginSchema.safeParse({
    email: fields.email,
    password: fields.password,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid login details.",
      fields,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      passwordHash: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return { error: "Invalid email or password.", fields };
  }

  const validPassword = await compare(parsed.data.password, user.passwordHash);

  if (!validPassword) {
    return { error: "Invalid email or password.", fields };
  }

  await createSession(user.id);

  redirect("/dashboard?toast=login-success");
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/");
}
