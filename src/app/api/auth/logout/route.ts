import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return Response.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/logout failed:", error);
    return Response.json({ error: "Unable to log out." }, { status: 500 });
  }
}
