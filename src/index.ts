import express from 'express'
import { JobServices } from './services/job.services.js'
import { jobRoutes } from './routes/modules/job.js'
import { PrismaClient } from '@prisma/client/extension'
import { PrismaPg } from '@prisma/adapter-pg'

const app = express()
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: ['query']
})
const jobServices = new JobServices(prisma)

jobServices.scanExpiredJobs()

app.use(express.json())
app.use(jobRoutes(jobServices))
app.listen(() => console.log('listening'))