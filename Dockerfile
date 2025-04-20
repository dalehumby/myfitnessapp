# Use a lightweight Python 3 base image based on Alpine Linux
FROM python:3.9-alpine

# Set the working directory in the container
WORKDIR /app

# Install build dependencies and sqlite libraries, then remove build deps
# Ensure sqlite3 is available
RUN apk add --no-cache build-base libffi-dev openssl-dev sqlite-libs && \
    apk add --virtual build-dependencies sqlite-dev && \
    pip install --upgrade pip && \
    apk del build-dependencies

# Copy the requirements file and install Python dependencies
# This layer is cached if requirements.txt doesn't change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
# This includes backend/, frontend/, and docker-entrypoint.sh from the context
COPY . .

# The docker-entrypoint.sh script is already made executable by the chmod command outside Docker build
# COPY docker-entrypoint.sh /usr/local/bin/
# RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the port Flask runs on
EXPOSE 5000

# Set environment variables for Flask
# FLASK_APP is set here, and used in the entrypoint script and command
ENV FLASK_APP=backend.app
ENV FLASK_ENV=development

# Use the entrypoint script to run the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# CMD can be left empty if ENTRYPOINT is a self-contained executable
# CMD ["flask", "run", "--host=0.0.0.0"]
