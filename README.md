# ChargeShare

ChargeShare is a peer-to-peer EV charger marketplace built with Next.js, Prisma,
PostgreSQL, and Razorpay.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set `DATABASE_URL` to your PostgreSQL connection string,
`JWT_SECRET` to a unique secret of at least 32 bytes, and the Razorpay test
credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
`RAZORPAY_WEBHOOK_SECRET`).

4. Apply migrations to the configured database:

   ```bash
   npx prisma migrate deploy
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to use the app.
