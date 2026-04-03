#!/bin/sh
set -eu

cd /app

echo "Generating Prisma client..."
npx prisma generate

if [ "${RESET_DATABASE:-false}" = "true" ]; then
  echo "Resetting database..."
  npx prisma migrate reset --force --skip-seed
elif [ "${RUN_MIGRATIONS:-true}" = "true" ] && [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "Applying migrations..."
  npx prisma migrate deploy
else
  echo "Skipping migrations."
fi

if [ "${SEED_DATABASE:-false}" = "true" ]; then
  echo "Seeding database..."
  npm run db:seed
else
  echo "Skipping seed."
fi
