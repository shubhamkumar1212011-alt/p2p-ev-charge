import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertAuthConfiguration,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { parseJsonBody } from "@/lib/parse-json-body";
import { loginRequestSchema } from "@/lib/api-schemas";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, loginRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    assertAuthConfiguration();
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    if (
      !user?.passwordHash ||
      !(await compare(parsed.data.password, user.passwordHash))
    ) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const token = await createSessionToken(publicUser);
    await setSessionCookie(token);

    return NextResponse.json({ user: publicUser });
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    return Response.json({ error: "Unable to log in." }, { status: 500 });
  }
}
