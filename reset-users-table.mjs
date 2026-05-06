import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.uhrfsufegvbsbdyslgcn:L6di%234rpWg2g%2Cx%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { require: true, rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
await client.connect();
await client.query('drop table if exists public.users cascade');
console.log('DROPPED_PUBLIC_USERS');
await client.end();
