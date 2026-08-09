-- DropIndex
DROP INDEX "Job_status_retry_count_run_at_idx";

-- CreateIndex
CREATE INDEX "Job_retry_count_run_at_idx" ON "Job"("retry_count", "run_at") WHERE ("status" = 'PENDING');
