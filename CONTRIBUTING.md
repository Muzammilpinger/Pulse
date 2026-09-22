# Contributing

Start the complete stack with `docker compose up -d --build --wait`. Run Python integration tests with `.venv/bin/pytest -q tests` and browser tests with `cd client && npm test` after installing their dependencies as described in the README.

Use `ruff check gateway signaling tests scripts` and `ruff format` for Python, and `npx prettier --write src tests` inside `client` for frontend edits. Keep pull requests focused on an observable behavior and include the relevant test result.

Do not commit secrets, generated browser traces, environment files, or local database dumps. Synthetic presentation messages belong in the screenshot script. Benchmarks must record the environment, workload, errors, and what the measurement does not prove.
