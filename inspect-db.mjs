import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.uhrfsufegvbsbdyslgcn:L6di%234rpWg2g%2Cx%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { require: true, rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
await client.connect();
const tables = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`);
console.log(JSON.stringify(tables.rows, null, 2));
const usersColumns = await client.query(`
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'users'
  order by ordinal_position
`);
console.log('USERS_COLUMNS');
console.log(JSON.stringify(usersColumns.rows, null, 2));
await client.end();
