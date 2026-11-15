# Architecture

## Technology stack

- Next.js using the App Router and TypeScript
- Tailwind CSS for styling
- Leaflet with OpenStreetMap tiles for maps
- SQLite with Prisma ORM for persistence
- JWT authentication stored in HttpOnly cookies
- Razorpay payments in test mode
- Zod for validating all inputs

## Core models

- **User**: account with role `DRIVER` or `HOST`
- **Charger**: `hostId`, `title`, `exactAddress`, `approxLat`, `approxLng`,
  `connectorType`, `powerKw`, `pricePerHour`, and `isAvailable`
- **Booking**: `driverId`, `chargerId`, `startTime`, `endTime`, `totalAmount`,
  `status`, `unlockPin`, and `paymentId`

## Mandatory security rules

1. The backend calculates `totalAmount` strictly from the charger's
   `pricePerHour` and booking duration. Never trust a price supplied by the
   frontend.
2. Booking creation must run in an atomic transaction that prevents overlapping
   bookings for the same charger.
3. Public map APIs return only `approxLat` and `approxLng`; never expose
   `exactAddress` until the associated booking is `CONFIRMED`.
4. Validate every input with Zod on the server before using it.

## Data and payment handling

- Keep charger coordinates used for public discovery approximate. Restrict exact
  addresses to authorized users after a booking is confirmed.
- Use Razorpay test credentials and verify payment callbacks before changing a
  booking to `CONFIRMED`.
- Store secrets in environment variables; do not commit credentials.
