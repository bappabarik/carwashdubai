-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'arriving';

-- CreateTable
CREATE TABLE "booking_status_events" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "note" TEXT,
    "changed_by_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_requests" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "custom_reason" TEXT,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by_staff_id" TEXT,
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_status_events_booking_id_idx" ON "booking_status_events"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_requests_booking_id_key" ON "cancellation_requests"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_status_events" ADD CONSTRAINT "booking_status_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_events" ADD CONSTRAINT "booking_status_events_changed_by_staff_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_reviewed_by_staff_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
