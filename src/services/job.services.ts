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
        return await context.run({ action: 'CREATE' }, async() => {
            const newJob = await this.db.job.create({ data })
            console.log(`[CREATE][${process.env.INSTANCE_NAME}] id=${newJob.id}`)
            return newJob
        })
    }

    scanExpiredJobs = async() => {
        return await context.run({ action: 'SCAN' }, async() => {
            return await this.db.$transaction(async (tx) => {
                // claim pending job and prevent multiple instances from claiming same job
                const expiredJobs = await tx.$queryRaw<ProcessingJob[]>`
                    SELECT "id", "status", "retry_count" FROM "Job" 
                    WHERE "run_at" < NOW()
                    AND "retry_count" < 3
                    AND "status" = 'PENDING'
                    LIMIT 20
                    FOR UPDATE SKIP LOCKED
                `

                console.log(`[SCAN][${process.env.INSTANCE_NAME}] found=${expiredJobs.length} ${process.env.LOG_LEVEL === 'debug' ? `id=[${expiredJobs.map((j) => j.id).join(', ')}]` : ''}`)
                if(!expiredJobs.length) return []
                

                const store = context.getStore()
                if(store) {
                    store.action = 'CLAIM'
                }

                // change the claimed jobs to PROCESSING
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
                console.log(`[CLAIM][${process.env.INSTANCE_NAME}] count=${expiredJobs.length} status=PENDING->PROCESSING`)

                return expiredJobs
            })
        })
    }

    recoverStuckJobs = async() => {
        while(true) {
            try {
                await this.recoverStuckJobsOnce()
            } catch (error) {
                console.log(`Recover stuck job failed, error: ${error}`)
            } finally {
                await sleep(5000)
            }
        }
    }

    recoverStuckJobsOnce = async() => {
        return await context.run({ action: 'RECOVER' }, async() => {
            // claim stuck jobs and recover them to pending
            // or fail if retry_count >= 3
            // and prevent multiple instances from claiming same job
            const count = await this.db.$executeRaw`
                WITH "stuck_jobs" AS (
                    SELECT "id" FROM "Job"
                    WHERE "updated_at" < NOW() - INTERVAL '10 minutes'
                    AND "status" = 'PROCESSING'
                    FOR UPDATE SKIP LOCKED
                    LIMIT 20
                )
                UPDATE "Job"
                SET 
                    "status" = CASE
                        WHEN "retry_count" + 1 >= 3 THEN 'FAILED'
                        ELSE 'PENDING'
                    END::"Status",
                    "retry_count" = "retry_count" + 1
                WHERE "id" IN (
                    SELECT "id" FROM "stuck_jobs"
                )
            `

            if(count > 0) console.log(`[RECOVER][${process.env.INSTANCE_NAME}] count=${count}`)
            return count
        })
    }

    processJob = async(job: ProcessingJob) => {
        try {
            // 50 percent chance of completion/failure
            const int = crypto.randomInt(99)
            let isCompleted = false
            const currentRetryCount = job.retry_count
            int < 50 ? isCompleted = true : isCompleted = false

            await context.run({ action: 'PROC' }, async() => {
                return await this.db.$transaction(async(tx) => {
                    const newObj = await tx.job.update({
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

                    console.log(`[PROC][${process.env.INSTANCE_NAME}] id=${job.id} ${isCompleted ? 'completed' : 'failed'} status=PROCESSING->${newObj.status}`)

                    const store = context.getStore()
                    if(store) {
                        store.action = 'TRACE'
                    }

                    // create trace record of this attempt no matter success or fail
                    await tx.jobTrace.create({
                        data: {
                            jobId: job.id,
                            executedBy: process.env.INSTANCE_NAME || 'default-inst',
                            isSuccess: isCompleted
                        }
                    })

                    console.log(`[TRACE][${process.env.INSTANCE_NAME}] id=${job.id} ${isCompleted ? 'completed' : 'failed'}`)
                })
            })
        } catch (error) {
            console.log(`JobId ${job.id} failed, error: ${error}`)
        }
    }

    handleExpiredJobs = async() => {
        while(true) {
            try {
                const expiredJobs = await this.scanExpiredJobs()

                // scan per 1 second if having pending jobs, 5 seconds else
                if(expiredJobs.length > 0) {
                    for(const j of expiredJobs) {
                        await this.processJob(j)
                    }
                    await sleep(1000)
                } else {
                    await sleep(5000)
                }
            } catch (error) {
                console.log(`Handle job failed, error: ${error}`)
            }
        }  
    }
}