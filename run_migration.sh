#!/bin/bash
# Script to run the resume_id migration

echo "Running migration: migration_add_resume_id_to_applications.sql"

# Check if running in Docker
if command -v docker-compose &> /dev/null; then
    echo "Running migration via Docker..."
    docker-compose exec -T postgres psql -U sidefiller -d sidefiller < database/migration_add_resume_id_to_applications.sql
else
    echo "Running migration directly..."
    psql -U sidefiller -d sidefiller -f database/migration_add_resume_id_to_applications.sql
fi

echo "Migration completed!"

