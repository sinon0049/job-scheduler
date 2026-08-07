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
    if(e.query === 'COMMIT' || e.query === 'BEGIN') return
    const store = context.getStore()

    if(store?.action === 'SCAN') {
        console.log(`[${context.getStore()?.action}]Scan ${store.jobCount} jobs, Duration: ${e.duration}ms, TimeStamp: ${e.timestamp}`)
    } else {
        console.log(`[${context.getStore()?.action}]Duration: ${e.duration}, TimeStamp: ${e.timestamp}`)
    }
    //console.log(`[${context.getStore()?.action}]Duration: ${e.duration}, Query: ${e.query.replace(/\s+/g, ' ').trim()}`)
})