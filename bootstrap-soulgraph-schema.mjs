import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.uhrfsufegvbsbdyslgcn:L6di%234rpWg2g%2Cx%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { require: true, rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
await client.connect();
await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
await client.query(`CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  password text,
  wallet_address text UNIQUE,
  token_name text DEFAULT 'SOUL',
  avatar_url text,
  created_at timestamp DEFAULT now()
)`);
await client.query(`CREATE TABLE IF NOT EXISTS news_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
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
await client.query(`CREATE TABLE IF NOT EXISTS state_data (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time integer NOT NULL,
  mental integer NOT NULL,
  physical integer NOT NULL,
  moral integer NOT NULL,
  financial integer NOT NULL,
  created_at timestamp DEFAULT now()
)`);
await client.query(`CREATE TABLE IF NOT EXISTS user_profiles (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  goal text,
  is_public boolean DEFAULT true,
  allow_event_sharing boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)`);
await client.query(`CREATE TABLE IF NOT EXISTS user_relationships (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)`);
await client.query(`CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
)`);
await client.query(`ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS session_pkey`);
await client.query(`ALTER TABLE user_sessions ADD CONSTRAINT session_pkey PRIMARY KEY (sid)`);
await client.query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions (expire)`);
console.log('SOULGRAPH_SCHEMA_READY');
await client.end();
