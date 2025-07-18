.PHONY: dev


# commands need to be ran in one "line" because each line activates a new shell terminal which is why the && \ is needed
dev:
	@echo "Starting Flask in debug mode..."
	. venv/bin/activate && \
	source .env && \
	flask run --debug