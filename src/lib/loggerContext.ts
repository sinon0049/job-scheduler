import { AsyncLocalStorage } from "async_hooks";

interface LogContext {
    action: string;
}

export const context = new AsyncLocalStorage<LogContext>()