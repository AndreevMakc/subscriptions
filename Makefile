DEPLOY_PATH ?= /opt/subscriptions
SERVICES ?= subscriptions-api.service subscriptions-beat.service subscriptions-worker.service

.PHONY: deploy status

deploy:
	cd $(DEPLOY_PATH) && \
	git fetch origin && \
	git checkout master && \
	git pull --ff-only origin master && \
	sudo -n systemctl restart $(SERVICES)

status:
	sudo -n systemctl status --no-pager --lines=5 $(SERVICES)
