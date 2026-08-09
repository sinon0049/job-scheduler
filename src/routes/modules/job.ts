import express from 'express'
import { JobServices } from '../../services/job.services.js'
const router = express.Router()

export const jobRoutes = (jobServices: JobServices) => {
    router.post('/create', async (req, res, next) => {
        try {
            const newJob = await jobServices.createJob({
                run_at: new Date()
            })

            return res.status(201).json({
                status: 'success',
                data: newJob
            })
        } catch (error) {
            next({
                statusCode: 500,
                message: `Failed to create job, error: ${error}`
            })
        }
    })

    return router
}
