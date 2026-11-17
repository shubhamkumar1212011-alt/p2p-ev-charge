import { NextResponse } from "next/server";
import { z } from "zod";

const ChatSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

const hits = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string, limit = 25, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function buildReply(raw: string): string {
  const q = raw.toLowerCase();

  if (q.includes("pin") || q.includes("unlock") || q.includes("relay") || q.includes("start")) {
    return "Once your Razorpay booking is confirmed, you receive a 6-digit relay PIN on your active session card. Enter that PIN at the host's charger unit to unlock power flow automatically.";
  }
  if (q.includes("ccs") || q.includes("type 2") || q.includes("connector") || q.includes("kw") || q.includes("fast")) {
    return "Most residential P2P hosts offer 3.3 kW–7.4 kW Type 2 AC (ideal for 2–4 hr top-ups while you dine or work), while commercial hubs provide 30–60 kW CCS2 DC rapid charging. Filter by connector type directly on the live map.";
  }
  if (q.includes("host") || q.includes("earn") || q.includes("list") || q.includes("money")) {
    return "Click '+ List Your Charger' on the live map, set your kW rate, ₹/kWh tariff, and on-site utilities (Washroom, Cafe, Covered Parking). Earnings settle securely after each verified session.";
  }
  if (q.includes("chill") || q.includes("cafe") || q.includes("washroom") || q.includes("food") || q.includes("nearby")) {
    return "Tap any charger pin on the map to open 'Charge & Chill'—it shows verified host utilities plus real walking-distance cafes, restaurants, and restrooms within 450m via OpenStreetMap.";
  }
  if (q.includes("pay") || q.includes("razorpay") || q.includes("refund") || q.includes("cancel")) {
    return "All bookings use Razorpay signature-verified checkout. Unused kWh credits or cancelled slots prior to PIN activation are refunded automatically to your original payment method.";
  }
  return "I can help with connector compatibility (Type 2 vs CCS2), 6-digit relay PIN unlocking, Razorpay booking protection, nearby Charge & Chill cafes, or listing your home charger. What would you like to check?";
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid question (max 500 chars)." }, { status: 400 });
    }
    return NextResponse.json({ reply: buildReply(parsed.data.message) });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
