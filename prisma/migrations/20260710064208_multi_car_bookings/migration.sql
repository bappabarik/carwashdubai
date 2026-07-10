/*
  Warnings:

  - You are about to drop the column `booking_id` on the `booking_items` table. All the data in the column will be lost.
  - You are about to drop the column `car_id` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `booking_car_id` to the `booking_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "booking_items" DROP CONSTRAINT "booking_items_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_car_id_fkey";

-- DropIndex
DROP INDEX "booking_items_booking_id_idx";

-- AlterTable
ALTER TABLE "booking_items" DROP COLUMN "booking_id",
ADD COLUMN     "booking_car_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "car_id";

-- CreateTable
CREATE TABLE "booking_cars" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "booking_cars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_cars_booking_id_idx" ON "booking_cars"("booking_id");

-- CreateIndex
CREATE INDEX "booking_items_booking_car_id_idx" ON "booking_items"("booking_car_id");

-- AddForeignKey
ALTER TABLE "booking_cars" ADD CONSTRAINT "booking_cars_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_cars" ADD CONSTRAINT "booking_cars_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_car_id_fkey" FOREIGN KEY ("booking_car_id") REFERENCES "booking_cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
