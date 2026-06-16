import { Status } from "../generated/prisma/enums.js";
import type { Job as JobObj } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import crypto from 'crypto'
import { context } from "../lib/loggerContext.js";
import { sleep } from "../lib/sleep.js";


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

        return await context.run('SCAN', async() => {
            return await this.db.job.updateManyAndReturn({
                where: {
                    run_at: { lte: now },
                    retry_count: { lt: 3 },
                    status: Status.PENDING
                },
                data: {
                    status: Status.PROCESSING
                },
                limit: 1000
            })
        })
    }

    processJob = async(job: JobObj) => {
        const int = crypto.randomInt(99)
        let isCompleted = false
        let { retry_count } = job
        int < 50 ? isCompleted = true : isCompleted = false

        await context.run('PROC', async() => {
            await this.db.job.update({
                where: { id: job.id },
                data: {
                    status: isCompleted ? Status.COMPLETED : retry_count === 2 ? Status.FAILED : Status.PENDING,
                    retry_count: isCompleted ? job.retry_count : job.retry_count + 1
                }
            })
        })
    }

    handleExpiredJobs = async() => {
        while(true) {
            try {
                const expiredJobs = await this.scanExpiredJobs()
                if(expiredJobs.length > 0) {
                    for(const j of expiredJobs) {
                        await this.processJob(j)
                    }
                    await sleep(1000)
                } else {
                    await sleep(5000)
                }
            } catch (error) {
                console.log(error)
            }
        }  
    }
}