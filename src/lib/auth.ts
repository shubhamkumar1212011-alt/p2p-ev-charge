import { errors, jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const authCookieName = "charge-share-session";

const sessionIssuer = "charge-share-bengaluru";
const sessionAudience = "charge-share-app";
const sessionDurationSeconds = 7 * 24 * 60 * 60;

const sessionClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["DRIVER", "HOST"]),
});

function getSigningKey() {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    new TextEncoder().encode(secret).length < 32 ||
    secret.startsWith("replace-")
  ) {
    throw new Error("JWT_SECRET must be a unique secret of at least 32 bytes.");
  }

  return new TextEncoder().encode(secret);
}

export function assertAuthConfiguration() {
  getSigningKey();
}

export async function createSessionToken(user: {
  id: string;
  role: "DRIVER" | "HOST";
}) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(sessionIssuer)
    .setAudience(sessionAudience)
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .setSubject(user.id)
    .sign(getSigningKey());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
}

export async function getAuthenticatedUser() {
  const token = (await cookies()).get(authCookieName)?.value;
  if (!token) return null;

  const key = getSigningKey();
  let payload;

  try {
    ({ payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: sessionIssuer,
      audience: sessionAudience,
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }

  const claims = sessionClaimsSchema.safeParse(payload);
  if (!claims.success) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.data.sub },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || user.role !== claims.data.role) return null;
  return user;
}
