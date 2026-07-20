/*
  Warnings:

  - The values [arriving] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[zone_id,day_of_week,start_time,end_time]` on the table `time_slot_templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `zone_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zone_id` to the `time_slot_templates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PilotStatus" AS ENUM ('active', 'inactive');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('pending', 'confirmed', 'staff_assigned', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled');
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TABLE "booking_status_events" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropIndex
DROP INDEX "time_slot_templates_day_of_week_idx";

-- DropIndex
DROP INDEX "time_slot_templates_day_of_week_start_time_end_time_key";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "asset_id" TEXT,
ADD COLUMN     "pilot_id" TEXT,
ADD COLUMN     "zone_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "time_slot_templates" ADD COLUMN     "zone_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "boundary" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plate_number" TEXT,
    "zone_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilots" (
    "id" TEXT NOT NULL,
    "pilot_code" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "zone_id" TEXT,
    "status" "PilotStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_plate_number_key" ON "assets"("plate_number");

-- CreateIndex
CREATE INDEX "assets_zone_id_idx" ON "assets"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "pilots_pilot_code_key" ON "pilots"("pilot_code");

-- CreateIndex
CREATE UNIQUE INDEX "pilots_email_key" ON "pilots"("email");

-- CreateIndex
CREATE INDEX "pilots_zone_id_idx" ON "pilots"("zone_id");

-- CreateIndex
CREATE INDEX "bookings_zone_id_idx" ON "bookings"("zone_id");

-- CreateIndex
CREATE INDEX "time_slot_templates_zone_id_day_of_week_idx" ON "time_slot_templates"("zone_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "time_slot_templates_zone_id_day_of_week_start_time_end_time_key" ON "time_slot_templates"("zone_id", "day_of_week", "start_time", "end_time");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slot_templates" ADD CONSTRAINT "time_slot_templates_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
