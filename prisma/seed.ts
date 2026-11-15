import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const legacySampleChargerIds = [
  "sample-host.indiranagar",
  "sample-host.koramangala",
  "sample-host.jayanagar",
  "sample-host.whitefield",
];
const legacySampleHostEmails = [
  "host.indiranagar@example.com",
  "host.koramangala@example.com",
  "host.jayanagar@example.com",
  "host.whitefield@example.com",
];
const discoveryHost = {
  name: "OpenStreetMap Station Directory",
  email: "osm-station-directory@chargeshare.local",
};

async function main() {
  const now = new Date();
  const demoDrivers = await prisma.user.findMany({
    where: {
      name: "Demo Driver",
      email: { endsWith: "@example.test" },
      role: Role.DRIVER,
    },
    select: { id: true },
  });
  const demoDriverIds = demoDrivers.map((driver) => driver.id);

  if (demoDriverIds.length > 0) {
    await prisma.booking.deleteMany({
      where: {
        driverId: { in: demoDriverIds },
        chargerId: { in: legacySampleChargerIds },
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      },
    });
  }

  await prisma.booking.deleteMany({
    where: {
      chargerId: { in: legacySampleChargerIds },
      endTime: { lt: now },
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
    },
  });

  await prisma.charger.deleteMany({
    where: {
      id: { in: legacySampleChargerIds },
      bookings: { none: {} },
    },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: legacySampleHostEmails } },
        { id: { in: demoDriverIds } },
      ],
      hostedChargers: { none: {} },
      bookings: { none: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: discoveryHost.email },
    update: { name: discoveryHost.name, role: Role.HOST },
    create: {
      ...discoveryHost,
      role: Role.HOST,
    },
  });

  console.log("Prepared the OpenStreetMap station directory and removed stale sample bookings.");
}

main()
  .catch((error: unknown) => {
    console.error("Failed to prepare station discovery:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
