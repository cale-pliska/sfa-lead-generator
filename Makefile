.PHONY: dev build-dev run-dev logs-dev build-prod run-prod logs-prod

# commands need to be run in one line because each line activates a new shell
# terminal which is why the && \ is needed
dev:
	@echo "Starting Flask in debug mode..."
	. venv/bin/activate && \
	source .env && \
	flask run --debug

# Build images for development
build-dev:
	docker compose -f docker-compose.dev.yml build

# Run the development stack
run-dev:
	docker compose -f docker-compose.dev.yml up

# Follow logs for the development stack
logs-dev:
	docker compose -f docker-compose.dev.yml logs -f

# Build images for production
build-prod:
	docker compose -f docker-compose.yml build

# Run the production stack
run-prod:
	docker compose -f docker-compose.yml up -d

# Follow logs for the production stack
logs-prod:
	docker compose -f docker-compose.yml logs -f
