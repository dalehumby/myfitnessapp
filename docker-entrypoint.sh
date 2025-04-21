#!/bin/sh

# Path to the directory where the database file will be stored inside the container
DATABASE_DIR=/app/data
# Full path to the SQLite database file inside the container
DATABASE_PATH="$DATABASE_DIR/database.sqlite" # Updated path

echo "Checking for existing database at $DATABASE_PATH..."

# Check if the database file exists
if [ ! -f "$DATABASE_PATH" ]; then
  echo "Database not found. Initializing database..."
  # The init_db function in database.py is updated to create the $DATABASE_DIR if needed
  # Make sure the database directory exists before running init-db as an extra safety
  # (init_db also checks, but this ensures the directory is there before flask init-db starts)
  mkdir -p "$DATABASE_DIR"
  flask --app backend.app init-db
else
  echo "Database found. Skipping initialization."
fi

echo "Starting Flask application..."
# The FLASK_APP and FLASK_ENV are set in the Dockerfile
exec flask --app backend.app run --host=0.0.0.0
