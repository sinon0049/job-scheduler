import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
export const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: [{
        emit: "event",
        level: "query"
    }]
})

prisma.$on("query", (e) => {
    console.log("Query: " + e.query)
    console.log("Params: " + e.params)
    console.log("Duration: " + e.duration + "ms")
})