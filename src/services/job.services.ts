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

    async createJob(data: CreateJobInput) {
        try {
            const newJob = await this.db.job.create({ data })
            return newJob
        } catch (error) {
            console.log(error)
        }
    }

    async scanExpiredJobs() {
        try {
            const now = new Date()
            return await this.db.job.updateManyAndReturn({
                where: {
                    run_at: {
                        lte: now
                    },
                    retry_count: {
                        lt: 3
                    }
                },
                data: {
                    status: Status.PROCESSING
                }
            })
        } catch (error) {
            console.log(error)
        }
    }

    async processJob(job: JobObj) {
        try {
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
        } catch (error) {
            console.log(error)
        }
    }
}