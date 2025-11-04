NAME = transcendence SERVICES = matchmaking

DOCKER_COMPOSE = docker compose
ENV_TEMPLATE = .env.example
ENV_FILE = .env

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

all: up

$(NAME): up

up: build
	@echo "$(YELLOW)Starting services...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)Run 'make help' to see available commands$(NC)"

build:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Copying .env into repo...$(NC)"; \
		cp $(ENV_TEMPLATE) $(ENV_FILE); \
	fi
	@echo "$(YELLOW)Building services...$(NC)"
	-$(DOCKER_COMPOSE) build $(BUILD_ARGS)



down:
	@echo "$(RED)Stopping services & removing containers...$(NC)"
	-$(DOCKER_COMPOSE) down

clean: down
	@echo "$(GREEN)Containers cleaned$(NC)"

stop:
	@echo "$(RED)Stopping services...$(NC)"
	-$(DOCKER_COMPOSE) stop

logs:
	@echo "$(BLUE)Showing logs (Ctrl+C to exit)...$(NC)"
	$(DOCKER_COMPOSE) logs -f

ps:
	@echo "$(BLUE)Container status:$(NC)"
	$(DOCKER_COMPOSE) ps

re: fclean all

help:
	@echo "$(BLUE)Available targets:$(NC)"
	@echo "  $(GREEN)all$(NC)     - Build and start all services"
	@echo "  $(GREEN)$(NAME)$(NC) - Same as 'all'"
	@echo "  $(GREEN)build$(NC)   - Build all images"
	@echo "  $(GREEN)up$(NC)      - Start services (builds if needed)"
	@echo "  $(GREEN)down$(NC)    - Stop services & remove containers"
	@echo "  $(GREEN)clean$(NC)   - Stop and remove containers"
	@echo "  $(GREEN)fclean$(NC)  - Full cleanup (containers, images, volumes)"
	@echo "  $(GREEN)re$(NC)      - Full restart (fclean + all)"
	@echo "  $(GREEN)logs$(NC)    - Show service logs"
	@echo "  $(GREEN)ps$(NC)      - Show container status"
	@echo "  $(GREEN)help$(NC)    - Show this help message"
	@echo ""

.PHONE: all up down build fclean re logs ps help stop

