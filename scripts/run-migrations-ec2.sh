#!/bin/bash
set -e

ENV_FILE="/home/ubuntu/app/.env"
PROJECT_REF="zhmqxclxgwikhrxkvhgm"
MIGRATIONS_FILE="/home/ubuntu/all-migrations.sql"

echo "=== Env keys available ==="
grep -o "^[A-Z_]*" "$ENV_FILE" | sort || true
echo "=========================="

run_migration() {
  local url="$1"
  local label="$2"
  [ -z "$url" ] && return
  if psql "$url" -c "SELECT 1;" -t 2>/dev/null; then
    echo "Connected: $label"
    psql "$url" -f "$MIGRATIONS_FILE"
    echo "DONE: migrations applied via $label"
    rm -f "$MIGRATIONS_FILE" /home/ubuntu/run-migrations-ec2.sh
    exit 0
  fi
  echo "FAIL: $label"
}

# Try any full connection URL vars
for var in DATABASE_URL DB_URL POSTGRES_URL SUPABASE_DB_URL NUXT_DATABASE_URL DB_CONNECTION_STRING POSTGRES_CONNECTION_STRING; do
  val=$(grep -E "^${var}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\r" || true)
  run_migration "$val" "$var"
done

# Try password-only vars and build connection URLs
for var in SUPABASE_DB_PASSWORD NUXT_SUPABASE_DB_PASSWORD DB_PASSWORD POSTGRES_PASSWORD DATABASE_PASSWORD; do
  pw=$(grep -E "^${var}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\r" || true)
  if [ -n "$pw" ]; then
    run_migration "postgresql://postgres.${PROJECT_REF}:${pw}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" "pooler+${var}"
    run_migration "postgresql://postgres:${pw}@db.${PROJECT_REF}.supabase.co:5432/postgres" "direct+${var}"
  fi
done

# Check for Supabase CLI token on EC2 (if user ran supabase login)
SB_TOKEN=$(cat ~/.config/supabase/access-token 2>/dev/null || true)
if [ -n "$SB_TOKEN" ]; then
  echo "Found Supabase CLI token on EC2"
  CONN_URI=$(curl -s "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/connection-string?db_user=postgres" \
    -H "Authorization: Bearer $SB_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uri',''))" 2>/dev/null || true)
  run_migration "$CONN_URI" "supabase-cli-token"
fi

echo ""
echo "ERROR: All connection attempts failed."
echo "Env keys found: $(grep -o '^[A-Z_]*' $ENV_FILE | sort | tr '\n' ' ')"
exit 1
