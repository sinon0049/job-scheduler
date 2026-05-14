import express from 'express'
import 'dotenv/config'
import { JobServices } from './services/job.services.js'
import { jobRoutes } from './routes/modules/job.js'
import { prisma } from './lib/prisma.js'
import type { Request, Response, NextFunction } from 'express'

const PORT = process.env.PORT || 3000
const app = express()
const jobServices = new JobServices(prisma)

app.use(express.json())
app.use('/job', jobRoutes(jobServices))
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.log(err)
})

app.listen(PORT, () => console.log('listening'))