import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  await connection();

  try {
    const user = await getAuthenticatedUser();
    return Response.json({ user });
  } catch (error) {
    console.error("GET /api/auth/session failed:", error);
    return Response.json(
      { error: "Unable to load session." },
      { status: 500 },
    );
  }
}
