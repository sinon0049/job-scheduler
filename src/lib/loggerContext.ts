import { AsyncLocalStorage } from "async_hooks";

interface LogContest {
    action: string;
    jobCount?: number;
}

export const context = new AsyncLocalStorage<LogContest>()