import express from 'express'
import { JobServices } from '../../services/job.services.js'
const router = express.Router()

export const jobRoutes = (jobServices: JobServices) => {
    router.post('/create', async (req, res, next) => {
        try {
            const newJob = await jobServices.createJob({
                run_at: new Date()
            })

            return res.status(200).json({
                status: 'success',
                data: newJob
            })
        } catch (error) {
            next({
                statusCode: 400,
                message: 'Failed to create job, please check your field.'
            })
        }
    })

    return router
}
