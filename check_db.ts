
import { Client } from 'pg';

async function checkRisks() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'dms',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT "riskNumber", "maxRiskLevel", "activity" FROM hira_risks');
    console.log('HIRA Risks:');
    console.table(res.rows);
    
    const itemsRes = await client.query('SELECT "hiraRiskId", rating FROM risk_assessment_items');
    console.log('\nRisk Items:');
    console.table(itemsRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkRisks();
