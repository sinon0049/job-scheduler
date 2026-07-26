/*
  Warnings:

  - You are about to drop the column `payload` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the `Error` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Error" DROP CONSTRAINT "Error_job_id_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "payload",
DROP COLUMN "priority",
DROP COLUMN "type",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE "Error";

-- CreateTable
CREATE TABLE "JobTrace" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "executedBy" INTEGER NOT NULL,
    "isSuccess" BOOLEAN NOT NULL,

    CONSTRAINT "JobTrace_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobTrace" ADD CONSTRAINT "JobTrace_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
