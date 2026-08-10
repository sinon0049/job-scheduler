import test, { before, beforeEach, describe, after } from "node:test"
import assert from "node:assert"
import { prisma } from "../src/lib/prisma.js"
import { JobServices } from "../src/services/job.services.js"
import { context } from "../src/lib/loggerContext.js"

const jobServices = new JobServices(prisma)

describe('Test', () => {
    before(async() => {
        try {
            await prisma.$connect()
        } catch(e) {
            console.log('Database connetion failed:', e)
            process.exit(1)
        }
    })

    beforeEach(async() => {
        await context.run({ action: 'INIT' }, async() => {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Job", "JobTrace" RESTART IDENTITY CASCADE`)
        }) 
    })

    test('Create job test', async() => {
        const testJob = await jobServices.createJob({
            run_at: new Date(),
        })

        assert.ok(testJob.id)
        assert.strictEqual(testJob.status, 'PENDING')
        assert.strictEqual(testJob.retry_count, 0)
    })

    test('Race condition test for scan', async() => {
        const testJob = await jobServices.createJob({
            run_at: new Date(),
        })

        const scanResult = await Promise.all(Array.from({ length: 10 }, () => jobServices.scanExpiredJobs()))

        let success = 0, failed = 0
        for(let scannedJobs of scanResult) {
            if(scannedJobs.length === 1) {
                success ++
            } else if(scannedJobs.length === 0) {
                failed ++
            }
        }

        assert.strictEqual(success, 1)
        assert.strictEqual(failed, 9)
    })

    test('Race condition test for recover', async() => {
        await prisma.$executeRaw`
            INSERT INTO "Job" (
                "run_at",
                "updated_at",
                "status",
                "retry_count"
            )
            VALUES (
                NOW(),
                NOW() - INTERVAL '11 minutes',
                'PROCESSING'::"Status",
                0
            )
        `

        const recoverResult = await Promise.all(Array.from({ length: 10 }, () => jobServices.recoverStuckJobsOnce()))

        let success = 0, failed = 0
        for(let recoverCount of recoverResult) {
            if(recoverCount === 1) {
                success ++
            } else if(recoverCount === 0) {
                failed ++
            }
        }

        assert.strictEqual(success, 1)
        assert.strictEqual(failed, 9)
    })

    after(async() => {
        prisma.$executeRawUnsafe(`TRUNCATE TABLE "Job", "JobTrace" RESTART IDENTITY CASCADE`)
        prisma.$disconnect()
    })
})