import express from 'express'
import { JobServices } from '../../services/job.services.js'
const router = express.Router()

export const jobRoutes = (jobServices: JobServices) => {
    router.post('/create', async (req, res) => {
        try {
            const newJob = await jobServices.createJob({
                run_at: new Date(),
                type: 'email',
                payload: 'user@example.com',
                status: 'PENDING',
                priority: 1
            })

            return res.status(200).json({
                status: 'success',
                data: newJob
            })
        } catch (error) {
            console.log(error)  
            return res.status(400).json({
                status: 'failed',
                message: error
            })
        }
    })

    return router
}
