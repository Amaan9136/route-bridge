.PHONY: install dev generate

install:
	pip install -r requirements.txt

dev:
	FLASK_DEBUG=1 python app.py

generate:
	npx route-bridge generate \
		--manifest ./route-bridge.manifest.json \
		--output ../frontend/src/generated

generate-watch:
	npx route-bridge generate \
		--manifest ./route-bridge.manifest.json \
		--output ../frontend/src/generated \
		--watch
