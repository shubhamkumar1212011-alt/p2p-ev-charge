import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertAuthConfiguration,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { parseJsonBody } from "@/lib/parse-json-body";
import { registerRequestSchema } from "@/lib/api-schemas";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, registerRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    assertAuthConfiguration();
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    console.error("POST /api/auth/register failed:", error);
    return Response.json(
      { error: "Unable to create account." },
      { status: 500 },
    );
  }
}
