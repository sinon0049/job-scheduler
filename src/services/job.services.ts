import { Status } from "../generated/prisma/enums.js";
import type { Job as JobObj } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import crypto from 'crypto'
import { context } from "../lib/loggerContext.js";
import { sleep } from "../lib/sleep.js";

interface CreateJobInput extends Pick<JobObj, 'run_at'> {}
interface ProcessingJob extends Pick<JobObj, 'id' | 'status' | 'retry_count'> {}

export class JobServices {
    constructor(private readonly db: PrismaClient) {}

    createJob = async(data: CreateJobInput) => {
        return await context.run('CREATE', async() => {
            const newJob = await this.db.job.create({ data })
            return newJob
        }) 
    }

    scanExpiredJobs = async() => {
        const now = new Date()

        return await context.run('SCAN', async() => {
            return await this.db.$transaction(async (tx) => {
                const expiredJobs = await tx.$queryRaw<ProcessingJob[]>`
                    SELECT "id", "status", "retry_count" FROM "Job" 
                    WHERE "run_at" < NOW()
                    AND "retry_count" < 3
                    AND "status" = 'PENDING'
                    LIMIT 20
                    FOR UPDATE SKIP LOCKED
                `
                if(!expiredJobs.length) return []

                await tx.job.updateMany({
                    where: {
                        id: {
                            in: expiredJobs.map((obj: ProcessingJob) => obj.id)
                        }
                    },
                    data: {
                        status: Status.PROCESSING
                    }
                })

                return expiredJobs
            })
        })
    }

    processJob = async(job: ProcessingJob) => {
        const int = crypto.randomInt(99)
        let isCompleted = false
        const currentRetryCount = job.retry_count
        int < 50 ? isCompleted = true : isCompleted = false

        await context.run('PROC', async() => {
            return await this.db.$transaction(async(tx) => {
                await tx.job.update({
                    where: {
                        id: job.id
                    },
                    data: {
                        retry_count: {
                            increment: isCompleted ? 0 : 1
                        },
                        status: isCompleted ? Status.COMPLETED : (currentRetryCount + 1 >= 3 ? Status.FAILED : Status.PENDING)
                    }
                })

                await tx.jobTrace.create({
                    data: {
                        jobId: job.id,
                        executedBy: process.env.INSTANCE_NAME || 'default-inst',
                        isSuccess: isCompleted
                    }
                })
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