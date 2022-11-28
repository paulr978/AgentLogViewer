include .env

.PHONY: clean init build run-agent test

clean:
	rm -rf node_modules
	rm -rf build
	docker-compose down --rmi all -v || true

init: clean
	docker-compose build --no-cache
	npm install

build:
	npm run build

dev-agent:
	docker-compose up dev

local-dev-agent:
	npm run start:dev

remote-test:
	docker-compose run --rm dev npm run test

test:
	npm run test

