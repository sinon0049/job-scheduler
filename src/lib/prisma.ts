import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { context } from "./loggerContext.js";

export const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: [{
        emit: "event",
        level: "query"
    }]
})

prisma.$on("query", (e) => {
    if(process.env.NODE_ENV === 'test' || e.query === 'COMMIT' || e.query === 'BEGIN') return
    const store = context.getStore()
    const duration = e.duration.toFixed(2)
    const timestamp = e.timestamp.toLocaleTimeString('zh-TW', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })

    if(store?.action === 'UPDATE') {
        console.log(`[${context.getStore()?.action}]${store.jobCount} jobs, Duration: ${duration}ms, TimeStamp: ${timestamp}`)
    } else if(store?.action === 'PROC') {
        console.log(`[${context.getStore()?.action}]JobId: ${store.jobId}, Status: ${store.status}, Duration: ${duration}ms, TimeStamp: ${timestamp}`)
    } else {
        console.log(`[${context.getStore()?.action}]Duration: ${duration}ms, TimeStamp: ${timestamp}`)
    }
})