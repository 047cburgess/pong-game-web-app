NAME = transcendence

DOCKER_COMPOSE = docker compose
ENV_TEMPLATE = .env.example
ENV_FILE = .env

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

all: npm-setup up

$(NAME): up

up: build
	@echo "$(YELLOW)Starting services...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)Run 'make help' to see available commands$(NC)"

npm-setup: npm-install npm-build

npm-install:
	@echo "$(YELLOW)Installing npm dependencies for all services...$(NC)"
	@echo "$(BLUE)Installing game service dependencies...$(NC)"
	cd backend/game_service && npm install
	@echo "$(BLUE)Installing matchmaking service dependencies...$(NC)"
	cd backend/matchmaking_service && npm install
	@echo "$(GREEN)All npm dependencies installed$(NC)"

npm-build:
	@echo "$(YELLOW)Building all services...$(NC)"
	@echo "$(BLUE)Building game service...$(NC)"
	cd backend/game_service && npm run build
	@echo "$(BLUE)Building matchmaking service...$(NC)"
	cd backend/matchmaking_service && npm run build
	@echo "$(BLUE)Building babylon webserver...$(NC)"
	cd game-front-babylon && npm run build
	@echo "$(GREEN)All services built$(NC)"

babylon-start:
	@echo "$(YELLOW)Starting babylon webserver...$(NC)"
	cd game-front-babylon && npm start

build:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(RED)Missing .env into repo...$(NC)"; \
		exit 1; \
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

fclean: clean
	@echo "$(RED)Removing images and volumes...$(NC)"
	-$(DOCKER_COMPOSE) down --rmi all --volumes
	@echo "$(RED)Removing node_modules...$(NC)"
	-rm -rf backend/game_service/node_modules
	-rm -rf backend/matchmaking_service/node_modules
	-rm -rf game-front-babylon/node_modules
	-rm -rf backend/auth_service/node_modules
	@echo "$(GREEN)Full cleanup complete$(NC)"

re: fclean all

help:
	@echo "$(BLUE)Available targets:$(NC)"
	@echo "  $(GREEN)all$(NC)            - Setup npm, build and start all services"
	@echo "  $(GREEN)$(NAME)$(NC)        - Same as 'all'"
	@echo "  $(GREEN)npm-setup$(NC)      - Install and build all npm services"
	@echo "  $(GREEN)npm-install$(NC)    - Install npm dependencies for all services"
	@echo "  $(GREEN)npm-build$(NC)      - Build all npm services"
	@echo "  $(GREEN)babylon-start$(NC)  - Start babylon webserver locally"
	@echo "  $(GREEN)build$(NC)          - Build all Docker images"
	@echo "  $(GREEN)up$(NC)             - Start services (builds if needed)"
	@echo "  $(GREEN)down$(NC)           - Stop services & remove containers"
	@echo "  $(GREEN)clean$(NC)          - Stop and remove containers"
	@echo "  $(GREEN)fclean$(NC)         - Full cleanup (remove containers, images, volumes)"
	@echo "  $(GREEN)re$(NC)             - Full restart (fclean + all)"
	@echo "  $(GREEN)logs$(NC)           - Show service logs"
	@echo "  $(GREEN)ps$(NC)             - Show container status"
	@echo "  $(GREEN)help$(NC)           - Show this help message"
	@echo ""

.PHONY: all up down build fclean re logs ps help stop npm-setup npm-install npm-build babylon-start

