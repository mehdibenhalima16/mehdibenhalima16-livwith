#!/usr/bin/env bash
# Démarre un PostgreSQL local jetable pour `npm run test:db` (développement uniquement).
set -e
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DATA=${PGDATA_DIR:-/tmp/pgdata}
PORT=${PGPORT:-54329}
if [ ! -d "$DATA" ]; then mkdir -p "$DATA"; chown postgres:postgres "$DATA"; su postgres -c "$PGBIN/initdb -D $DATA -A trust -U postgres" >/dev/null; fi
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l /tmp/pg.log status" >/dev/null 2>&1 || \
  su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l /tmp/pg.log -w start" >/dev/null
