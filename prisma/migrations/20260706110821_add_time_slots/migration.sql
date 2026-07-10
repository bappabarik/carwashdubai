/*
  Warnings:

  - Added the required column `time_slot_template_id` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "time_slot_template_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "time_slot_templates" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slot_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_slot_templates_day_of_week_idx" ON "time_slot_templates"("day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "time_slot_templates_day_of_week_start_time_end_time_key" ON "time_slot_templates"("day_of_week", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "bookings_scheduled_date_time_slot_template_id_idx" ON "bookings"("scheduled_date", "time_slot_template_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_time_slot_template_id_fkey" FOREIGN KEY ("time_slot_template_id") REFERENCES "time_slot_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
