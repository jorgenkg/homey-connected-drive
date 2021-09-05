SHELL := /bin/bash

dist:
	@set -eo pipefail
	npm run clean
	npm run build
	rm -rf build/@types build/test
	cp package*.json build/
	cd build
	npm ci --production --ignore-scripts
	cd ..
	cat <(yes y | head -n 1) <(yes n | head -n 1) | npm run homey-publish
