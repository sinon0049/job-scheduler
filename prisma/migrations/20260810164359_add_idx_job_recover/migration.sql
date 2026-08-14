-- CreateIndex
CREATE INDEX "idx_job_recover" ON "Job"("updated_at") WHERE ("status" = 'PROCESSING');

-- RenameIndex
ALTER INDEX "Job_retry_count_run_at_idx" RENAME TO "idx_job_scan";
