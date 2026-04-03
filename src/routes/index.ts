import express from 'express'
import job from './modules/job.js'
const router = express.Router()

router.use('/jobs', job)

export default router