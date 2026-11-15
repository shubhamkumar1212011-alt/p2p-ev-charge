ALTER TABLE "Booking" ADD COLUMN "razorpayOrderId" TEXT;

CREATE UNIQUE INDEX "Booking_razorpayOrderId_key" ON "Booking"("razorpayOrderId");
