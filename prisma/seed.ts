import { PrismaClient, ConnectorType, Role } from "@prisma/client";

const prisma = new PrismaClient();

const sampleChargers = [
  {
    hostName: "Indiranagar Home Host",
    hostEmail: "host.indiranagar@example.com",
    title: "Home charger in Indiranagar",
    exactAddress: "Demo home, 12th Main Road, Indiranagar, Bengaluru 560038",
    approxLat: 12.9717,
    approxLng: 77.6412,
    connectorType: ConnectorType.TYPE_2,
    powerKw: 7.4,
    pricePerHour: 120,
  },
  {
    hostName: "Koramangala Home Host",
    hostEmail: "host.koramangala@example.com",
    title: "Home charger in Koramangala",
    exactAddress: "Demo home, 5th Block, Koramangala, Bengaluru 560095",
    approxLat: 12.9345,
    approxLng: 77.6156,
    connectorType: ConnectorType.CCS2,
    powerKw: 11,
    pricePerHour: 150,
  },
  {
    hostName: "Jayanagar Home Host",
    hostEmail: "host.jayanagar@example.com",
    title: "Home charger in Jayanagar",
    exactAddress: "Demo home, 4th Block, Jayanagar, Bengaluru 560011",
    approxLat: 12.925,
    approxLng: 77.5838,
    connectorType: ConnectorType.TYPE_2,
    powerKw: 7.2,
    pricePerHour: 100,
  },
  {
    hostName: "Whitefield Home Host",
    hostEmail: "host.whitefield@example.com",
    title: "Home charger in Whitefield",
    exactAddress: "Demo home, near Hope Farm, Whitefield, Bengaluru 560066",
    approxLat: 12.9698,
    approxLng: 77.75,
    connectorType: ConnectorType.CCS2,
    powerKw: 22,
    pricePerHour: 180,
  },
];

async function main() {
  for (const sample of sampleChargers) {
    const host = await prisma.user.upsert({
      where: { email: sample.hostEmail },
      update: { name: sample.hostName, role: Role.HOST },
      create: {
        name: sample.hostName,
        email: sample.hostEmail,
        role: Role.HOST,
      },
    });

    await prisma.charger.upsert({
      where: { id: `sample-${sample.hostEmail.split("@")[0]}` },
      update: {
        hostId: host.id,
        title: sample.title,
        exactAddress: sample.exactAddress,
        approxLat: sample.approxLat,
        approxLng: sample.approxLng,
        connectorType: sample.connectorType,
        powerKw: sample.powerKw,
        pricePerHour: sample.pricePerHour,
        isAvailable: true,
      },
      create: {
        id: `sample-${sample.hostEmail.split("@")[0]}`,
        hostId: host.id,
        title: sample.title,
        exactAddress: sample.exactAddress,
        approxLat: sample.approxLat,
        approxLng: sample.approxLng,
        connectorType: sample.connectorType,
        powerKw: sample.powerKw,
        pricePerHour: sample.pricePerHour,
      },
    });
  }

  console.log(`Seeded ${sampleChargers.length} sample home chargers in Bengaluru.`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed sample chargers:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
