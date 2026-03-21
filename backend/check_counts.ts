import { createConnection } from 'typeorm';
const ormconfig = require('./ormconfig.json');

createConnection(ormconfig).then(async (c) => {
    const res1 = await c.query(`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*) as count 
        FROM product_deviations 
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM') 
        ORDER BY month DESC LIMIT 12
    `);
    
    const res2 = await c.query(`
        SELECT TO_CHAR("startDate", 'YYYY-MM') as month, COUNT(*) as count 
        FROM product_deviations 
        GROUP BY TO_CHAR("startDate", 'YYYY-MM') 
        ORDER BY month DESC LIMIT 12
    `);

    console.log("Creation Date Counts:", res1);
    console.log("Production Date Counts:", res2);
    
    process.exit(0);
}).catch(console.error);
