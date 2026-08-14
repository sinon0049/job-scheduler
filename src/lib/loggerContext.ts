import { AsyncLocalStorage } from "async_hooks";

interface LogContest {
    action: string;
    jobCount?: number;
    jobId?: number;
    status?: string;
}

export const context = new AsyncLocalStorage<LogContest>()