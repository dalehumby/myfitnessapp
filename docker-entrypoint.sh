#!/bin/sh

# Path to the SQLite database file inside the container
DATABASE_PATH=/app/database.sqlite

echo "Checking for existing database at $DATABASE_PATH..."

# Check if the database file exists
if [ ! -f "$DATABASE_PATH" ]; then
  echo "Database not found. Initializing database..."
  # Run the Flask initialization command
  # Ensure the command works relative to the FLASK_APP setting
  flask --app backend.app init-db
else
  echo "Database found. Skipping initialization."
fi

echo "Starting Flask application..."
# Execute the command to start the Flask development server
# The 'exec' command replaces the current script process with the Flask process
exec flask --app backend.app run --host=0.0.0.0
