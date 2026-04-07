import express from 'express'
import { prisma } from '../../lib/prisma.js'
const router = express.Router()

router.post('/create', async (req, res) => {
    try {
        const newJob = await prisma.job.create({
            data: {
                run_at: new Date(),
                type: 'email',
                payload: 'user@example.com',
                status: 'PENDING',
                priority: 1
            }
        })
    } catch (error) {
        console.log('error creating new job')       
    }
})

export default router