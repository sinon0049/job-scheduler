import express from 'express'
import 'dotenv/config'
import { JobServices } from './services/job.services.js'
import { jobRoutes } from './routes/modules/job.js'
import { PrismaClient } from './generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const PORT = process.env.PORT || 3000
const app = express()
const prisma = new PrismaClient({
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

const jobServices = new JobServices(prisma)

app.use(express.json())
app.use('/job', jobRoutes(jobServices))
app.listen(PORT, () => console.log('listening'))