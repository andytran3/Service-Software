-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('New', 'In Progress', 'Completed');

-- CreateEnum
CREATE TYPE "request_type" AS ENUM ('IT', 'Facilities', 'HR', 'Other');

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "request_type" NOT NULL,
    "status" "request_status" NOT NULL DEFAULT 'New',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requests_created_at_idx" ON "requests"("created_at");
