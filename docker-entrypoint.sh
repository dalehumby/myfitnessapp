#!/bin/sh

# The DATABASE_PATH environment variable is set by docker-compose.yml
# if running with Docker Compose, or defaults in database.py if running locally.

# Ensure the directory for the database file exists
# Extract the directory path from the DATABASE_PATH variable
DATABASE_DIR=$(dirname "$DATABASE_PATH") # Get the directory part

echo "Checking for existing database at $DATABASE_PATH..."

# Check if the database file exists
if [ ! -f "$DATABASE_PATH" ]; then
  echo "Database not found. Initializing database..."
  # Create the database directory if it doesn't exist on the host (via bind mount)
  mkdir -p "$DATABASE_DIR"
  # Run the Flask initialization command
  # The init_db function in database.py is also updated to create the directory
  flask --app backend.app init-db
else
  echo "Database found. Skipping initialization."
fi

echo "Starting Flask application..."
# The FLASK_APP and FLASK_ENV are set in the Dockerfile or environment
exec flask --app backend.app run --host=0.0.0.0
