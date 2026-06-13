import "dotenv/config";
import { Status } from "../src/generated/prisma/enums.js";
import { Pool } from "pg";
import { prisma } from "../src/lib/prisma.js"; 
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

async function main() {
    const TOTAL = 100000
    const BATCH_SIZE = 5000

    for(let i = 0; i < TOTAL; i += BATCH_SIZE) {
        const currentBatchData = []

        for(let j = i; j < i + BATCH_SIZE; j ++) {
            currentBatchData.push({
                run_at: new Date(),
                type: 'email',
                status: Status.PENDING,
                priority: 1,
                payload: `user${j}@example.com`
            })
        }

        await prisma.job.createMany({
            data: currentBatchData, 
            skipDuplicates: true
        })
    }
}

main()
.then(async () => {
    await prisma.$disconnect();
    await pool.end();
})
.catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
});