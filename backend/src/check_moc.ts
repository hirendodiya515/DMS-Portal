import { Client } from 'pg';

async function checkColumns() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'dms_user',
    password: 'dms_password',
    database: 'dms_db',
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'moc_records'
    `);
    console.log('Columns:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkColumns();
