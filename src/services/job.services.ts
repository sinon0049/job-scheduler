import { Status } from "../generated/prisma/enums.js";
import type { Job as JobObj } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import crypto from 'crypto'


interface CreateJobInput {
    run_at: Date;
    type: string;
    payload: string;
    status: Status;
    priority: number;
}

export class JobServices {
    constructor(private readonly db: PrismaClient) {}

    createJob = async(data: CreateJobInput) => {
        const newJob = await this.db.job.create({ data })
        return newJob
    }

    scanExpiredJobs = async() => {
        const now = new Date()
        return await this.db.job.updateManyAndReturn({
            where: {
                run_at: {
                    lte: now
                },
                retry_count: {
                    lt: 3
                },
                status: Status.PENDING
            },
            data: {
                status: Status.PROCESSING
            }
        })
    }

    processJob = async(job: JobObj) => {
        const int = crypto.randomInt(99)
        let isCompleted = false
        let { retry_count } = job
        int < 50 ? isCompleted = true : isCompleted = false

        const result = await this.db.job.update({
            where: { id: job.id },
            data: {
                status: isCompleted ? Status.COMPLETED : retry_count === 2 ? Status.FAILED : Status.PENDING,
                retry_count: isCompleted ? job.retry_count : job.retry_count + 1
            }
        })
    }

    handleExpiredJobs = async() => {
        try {
            const expiredJobs = await this.scanExpiredJobs()
            if(expiredJobs.length > 0) {
                await Promise.allSettled(expiredJobs.map((job: JobObj) => this.processJob(job)))
            }
        } catch (error) {
            console.log(error)
        } finally {
            setTimeout(this.handleExpiredJobs, 1000)
        }
    }
}