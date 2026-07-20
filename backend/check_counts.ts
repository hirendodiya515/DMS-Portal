import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'dms_user',
    password: process.env.DB_PASSWORD || 'dms_password',
    database: process.env.DB_DATABASE || 'dms_db',
    entities: [],
    synchronize: false,
});

AppDataSource.initialize().then(async (c) => {
    const docs = await c.query(`SELECT id, title, type, departments FROM documents`);
    const equip = await c.query(`SELECT id, name, department, location FROM equipment`);

    console.log("--- DOCUMENTS ---");
    console.log(JSON.stringify(docs, null, 2));
    console.log("--- EQUIPMENT ---");
    console.log(JSON.stringify(equip, null, 2));
    
    process.exit(0);
}).catch(console.error);
