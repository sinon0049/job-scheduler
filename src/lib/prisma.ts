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
    console.log(`[${context.getStore()}]`
    + "Query: " + e.query + "\n" 
    + "Params: " + e.params + "\n" + 
    "Duration: " + e.duration + "ms")
})