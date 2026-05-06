import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.uhrfsufegvbsbdyslgcn:L6di%234rpWg2g%2Cx%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { require: true, rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS user_relationships (
  id varchar PRIMARY KEY,
  follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)`);
await client.query(`CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
)`);
await client.query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions (expire)`);
console.log('MISSING_TABLES_READY');
await client.end();
