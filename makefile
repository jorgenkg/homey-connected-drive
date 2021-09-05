SHELL := /bin/bash

dist:
	@set -eo pipefail
	rm -rf build/@types build/drivers build/enums build/test build/app.js build/package*.json
	npx tsc --build tsconfig.prod.json
	rm -rf build/@types build/test
	find build -name '*.ts' -exec rm {} \;
	cp package*.json build/
	cd build
	npm ci --production --ignore-scripts
	cd ..
	npx homey app publish -p build
