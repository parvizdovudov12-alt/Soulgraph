import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.uhrfsufegvbsbdyslgcn:L6di%234rpWg2g%2Cx%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { require: true, rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
const run = async (label, sql) => {
  console.log(`START:${label}`);
  await client.query(sql);
  console.log(`DONE:${label}`);
};
await client.connect();
console.log('CONNECTED');
await run('users', `CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY,
  email text UNIQUE,
  password text,
  wallet_address text UNIQUE,
  token_name text DEFAULT 'SOUL',
  avatar_url text,
  created_at timestamp DEFAULT now()
)`);
await run('news_events', `CREATE TABLE IF NOT EXISTS news_events (
  id varchar PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time integer NOT NULL,
  type text NOT NULL,
  text text NOT NULL,
  impact_mental integer NOT NULL DEFAULT 0,
  impact_physical integer NOT NULL DEFAULT 0,
  impact_moral integer NOT NULL DEFAULT 0,
  impact_financial integer NOT NULL DEFAULT 0,
  media jsonb,
  created_at timestamp DEFAULT now()
)`);
await run('state_data', `CREATE TABLE IF NOT EXISTS state_data (
  id varchar PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time integer NOT NULL,
  mental integer NOT NULL,
  physical integer NOT NULL,
  moral integer NOT NULL,
  financial integer NOT NULL,
  created_at timestamp DEFAULT now()
)`);
await run('user_profiles', `CREATE TABLE IF NOT EXISTS user_profiles (
  id varchar PRIMARY KEY,
  user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  goal text,
  is_public boolean DEFAULT true,
  allow_event_sharing boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)`);
await run('user_relationships', `CREATE TABLE IF NOT EXISTS user_relationships (
  id varchar PRIMARY KEY,
  follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)`);
console.log('ALL_DONE');
await client.end();
