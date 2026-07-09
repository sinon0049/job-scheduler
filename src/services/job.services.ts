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

interface JobId extends Pick<JobObj, 'id'> {}

export class JobServices {
    constructor(private readonly db: PrismaClient) {}

    createJob = async(data: CreateJobInput) => {
        const newJob = await this.db.job.create({ data })
        return newJob
    }

    scanExpiredJobs = async() => {
        const now = new Date()

        return await context.run('SCAN', async() => {
            return await this.db.$transaction(async (tx) => {
                const expiredJobs = await tx.$queryRaw<JobId[]>`
                    SELECT "id" FROM "Job" 
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
                            in: expiredJobs.map((obj: JobId) => obj.id)
                        }
                    },
                    data: {
                        status: Status.PROCESSING
                    }
                })

                return expiredJobs
            })
            // return await this.db.job.updateManyAndReturn({
            //     where: {
            //         run_at: { lte: now },
            //         retry_count: { lt: 3 },
            //         status: Status.PENDING
            //     },
            //     data: {
            //         status: Status.PROCESSING
            //     },
            //     limit: 1000
            // })
        })
    }

    processJob = async(job: JobId) => {
        const int = crypto.randomInt(99)
        let isCompleted = false
        int < 50 ? isCompleted = true : isCompleted = false

        await context.run('PROC', async() => {
            await this.db.$queryRaw`
                UPDATE "Job"
                SET
                    "retry_count" = CASE
                        WHEN ${isCompleted} THEN "retry_count"
                        ELSE "retry_count" + 1
                    END,
                    "status" = CASE
                        WHEN ${isCompleted} THEN 'COMPLETED'::"Status"
                        WHEN "retry_count" + 1 >= 3 THEN 'FAILED'::"Status"
                        ELSE 'PENDING'::"Status"
                    END
                WHERE "id" = ${job.id}
            `
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