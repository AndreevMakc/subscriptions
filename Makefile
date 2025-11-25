DEPLOY_PATH ?= /opt/subscriptions
FRONTEND_PATH ?= $(DEPLOY_PATH)/frontend
NGINX_STATIC_ROOT ?= $(FRONTEND_PATH)/dist
SERVICES ?= subscriptions-api.service subscriptions-beat.service subscriptions-worker.service

.PHONY: deploy status frontend-build frontend-sync

deploy:
	cd $(DEPLOY_PATH) && \
	git fetch origin && \
	git checkout main && \
	git pull --ff-only origin main && \
	$(MAKE) frontend-build && \
	$(MAKE) frontend-sync && \
	sudo -n systemctl restart $(SERVICES)

status:
	sudo -n systemctl status --no-pager --lines=5 $(SERVICES)

frontend-build:
	cd $(FRONTEND_PATH) && \
	npm ci --prefer-offline && \
	npm run build

frontend-sync:
	@if [ "$(FRONTEND_PATH)/dist" = "$(NGINX_STATIC_ROOT)" ]; then \
		echo "NGINX_STATIC_ROOT equals build dir, skipping sync"; \
	else \
		mkdir -p $(NGINX_STATIC_ROOT) && \
		rm -rf $(NGINX_STATIC_ROOT)/* && \
		cp -a $(FRONTEND_PATH)/dist/. $(NGINX_STATIC_ROOT)/; \
	fi
