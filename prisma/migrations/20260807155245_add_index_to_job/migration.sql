-- CreateIndex
CREATE INDEX "Job_status_retry_count_run_at_idx" ON "Job"("status", "retry_count", "run_at");
