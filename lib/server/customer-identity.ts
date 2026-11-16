import {qSchema} from './db';
let ready:Promise<void>|undefined;
export function ensureCustomerIdentitySchema(){return ready??(ready=migrate().catch(error=>{ready=undefined;throw error}))}
async function migrate(){await qSchema([
 'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ',
 `CREATE OR REPLACE FUNCTION ugt_customer_phone(raw_value TEXT) RETURNS TEXT
 LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
 SELECT CASE WHEN compact ~ '^(0|\\+?254)[71][0-9]{8}$'
 THEN regexp_replace(compact,'^(0|\\+?254)','+254') ELSE NULL END
 FROM (SELECT regexp_replace(raw_value,'[[:space:]()-]','','g') AS compact) value $$`,
 'CREATE INDEX IF NOT EXISTS idx_users_email_identity ON users(lower(btrim(email)))',
 'CREATE INDEX IF NOT EXISTS idx_users_phone_identity ON users(ugt_customer_phone(phone))',
 // Legacy collisions remain intact. Indexing them is non-unique; new writes
 // serialize on canonical keys and reject conflicts instead of merging people.
 `CREATE OR REPLACE FUNCTION ugt_enforce_customer_identity() RETURNS trigger
 LANGUAGE plpgsql AS $$ DECLARE email_key TEXT; phone_key TEXT; BEGIN
 email_key:=NULLIF(lower(btrim(NEW.email)),''); phone_key:=ugt_customer_phone(NEW.phone);
 IF email_key IS NOT NULL AND (TG_OP='INSERT' OR email_key IS DISTINCT FROM NULLIF(lower(btrim(OLD.email)),'')) THEN
  PERFORM pg_advisory_xact_lock(hashtext('ugt-email:'||email_key));
  IF EXISTS(SELECT 1 FROM users WHERE lower(btrim(email))=email_key AND id<>NEW.id) THEN
   RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='contact_already_registered',CONSTRAINT='customer_email_identity';
  END IF;
 END IF;
 IF phone_key IS NOT NULL AND (TG_OP='INSERT' OR phone_key IS DISTINCT FROM ugt_customer_phone(OLD.phone)) THEN
  PERFORM pg_advisory_xact_lock(hashtext('ugt-phone:'||phone_key));
  IF EXISTS(SELECT 1 FROM users WHERE ugt_customer_phone(phone)=phone_key AND id<>NEW.id) THEN
   RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='contact_already_registered',CONSTRAINT='customer_phone_identity';
  END IF;
 END IF;
 RETURN NEW; END $$`,
 `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='ugt_customer_identity_guard' AND tgrelid='users'::regclass) THEN
 CREATE TRIGGER ugt_customer_identity_guard BEFORE INSERT OR UPDATE OF email,phone ON users
 FOR EACH ROW EXECUTE FUNCTION ugt_enforce_customer_identity(); END IF; END $$`,
 `CREATE TABLE IF NOT EXISTS customer_email_proofs(
 token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),
 email TEXT NOT NULL,session_version INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),attempts INTEGER NOT NULL DEFAULT 0,
 used_at TIMESTAMPTZ,UNIQUE(user_id))`,
 `CREATE TABLE IF NOT EXISTS customer_reset_tokens(token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),expires_at TIMESTAMPTZ NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS customer_security_email_outbox(
 id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),token_hash TEXT NOT NULL,
 payload_encrypted TEXT NOT NULL,purpose TEXT NOT NULL DEFAULT 'verification',status TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),expires_at TIMESTAMPTZ NOT NULL,
 lease_token TEXT,lease_until TIMESTAMPTZ,provider_id TEXT,last_error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 'CREATE INDEX IF NOT EXISTS idx_customer_security_email_due ON customer_security_email_outbox(status,next_attempt_at)',
])}
