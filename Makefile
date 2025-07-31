.PHONY: db
# NAME=aquaparks
# IMAGE_TAG=shaneburkhart/${NAME}

# commands need to be run in one line because each line activates a new shell
# terminal which is why the && \ is needed
# dev:
# 	@echo "Starting Flask in debug mode..."
# 	. venv/bin/activate && \
# 	source .env && \
# 	flask run --debug

# Build images for development
build:
	docker compose -f docker-compose.dev.yml build

# Run the development stack
run:
	docker compose -f docker-compose.dev.yml up

# Follow logs for the development stack
logs:
	docker compose -f docker-compose.dev.yml logs -f


####################################################################################
# PROD
####################################################################################

# ssh -A root@137.184.32.9

# Build images for production
prod-build:
	docker compose -f docker-compose.yml build

# Run the production stack
prod-run:
	docker compose -f docker-compose.yml up -d

# Follow logs for the production stack
prod-logs:
	docker compose -f docker-compose.yml logs -f
