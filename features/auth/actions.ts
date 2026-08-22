"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { loginSchema } from "@/features/auth/validation";
import { prisma } from "@/server/db/client";
import { createSession, destroyCurrentSession } from "@/server/auth/session";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
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
    return { error: "Invalid email or password." };
  }

  const validPassword = await compare(parsed.data.password, user.passwordHash);

  if (!validPassword) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/");
}
