---
name: higgsfield-api
description: Use the Higgsfield developer API with API key ID and secret to discover model workflows, estimate costs, upload inputs, generate images or videos, poll requests, and save outputs. Use for API-backed Higgsfield work, including Soul ID training; this is separate from the consumer Higgsfield MCP.
---

# Higgsfield developer API

Use this skill when the user wants Higgsfield generation through the developer API at `api.higgsfield.ai`, or asks about its endpoints, models, billing, uploads, or request lifecycle. The consumer OAuth MCP at `mcp.higgsfield.ai` is a different product and does not provide API key access.

## Source and model selection

1. Start with the [Higgsfield documentation index](https://docs.higgsfield.ai/docs/llms.txt). The [API Console](https://console.higgsfield.ai) and the chosen model's documentation are authoritative for current availability, endpoint, request fields, and production versus preview status. The shared [OpenAPI file](https://docs.higgsfield.ai/docs/openapi.json) is supplementary and incomplete as a model catalog.
2. Search the bundled snapshot with `python3 scripts/higgsfield.py models --search 'text to video'`, then inspect a candidate with `python3 scripts/higgsfield.py schema ENDPOINT_ID`. The catalog records 82 documented workflows from 2026-09-25. Verify the selected workflow's `docs_url` or Console page before a new integration or whenever a request fails with a model or validation error.
3. Select a workflow by its inputs and output, then use its exact endpoint and JSON schema. Do not substitute a similar model, endpoint version, production environment, or preview environment without saying so.

Read [references/model-selection.md](references/model-selection.md) when choosing among workflows or using Soul ID. Read [references/common-workflows.md](references/common-workflows.md) for copyable request bodies and complete image editing, image-to-video, reference-to-video, and Soul ID sequences. The matching JSON files in [examples/](examples/) are starting bodies; replace every `example.com` URL and sample reference ID before making an API request. Read [references/api-behavior.md](references/api-behavior.md) for authentication, request states, retries, uploads, webhooks, and billing. Use the bundled Python script for repeatable calls; it requires Python 3.9+. It uses `requests` when present, otherwise `curl`, and falls back to Python's standard HTTP client if neither is installed. Higgsfield's edge service may reject that last fallback.

## Execute a generation

The script reads `HF_API_KEY_ID` and `HF_API_KEY_SECRET` from the environment or a mode-0600 dotenv file at `~/.config/higgsfield-api/credentials.env`. `HF_CREDENTIALS_FILE` or `--credentials-file` selects another file. Never print either value, put them in a URL or command argument, or commit the credentials file. If credentials are missing in BB, use the `secrets` skill and request both fields through `bb secret request`.

1. Prepare a JSON body matching the selected workflow's current schema. For local image/video/audio inputs, run `python3 scripts/higgsfield.py upload PATH` and use the returned `public_url` in that body. A remote input must be a publicly reachable HTTPS URL.
2. Run `python3 scripts/higgsfield.py estimate ENDPOINT_ID --input body.json` with the same parameters. The estimate is account-specific. A user request to generate authorizes a normal generation; respect any explicit budget or approval condition, and stop if an estimate exceeds it.
3. Run `python3 scripts/higgsfield.py run ENDPOINT_ID --input body.json --download-dir OUTPUT_DIR`. This submits once, prints the accepted `request_id`, polls with backoff, and downloads completed artifacts. For explicit lifecycle control, use `submit`, `status`, `wait`, `download`, and `cancel` separately. Persist the returned `request_id` immediately. The API may return status/cancel URLs on `platform.higgsfield.ai`; pass the request ID to the CLI so credentials stay on `api.higgsfield.ai`.
4. Report the endpoint, estimate, terminal status, request ID, and local artifact paths. If the request is still running when work stops, report its status URL and resume polling later.

Never automatically repeat a generation POST after a timeout or uncertain network result: the API has no submission idempotency key. Retry status GETs with backoff. Treat `failed`, `nsfw`, and `canceled` as terminal. Download useful outputs promptly; Higgsfield retains them for at least seven days.

## Refresh and maintenance

`python3 scripts/refresh_catalog.py` rebuilds `references/model-catalog.json` from the public model pages. It does not verify access for a particular account. The complete 2026-09-25 docs scrape is stored in the thread workspace at `higgsfield-api-docs-snapshot/`; it is research evidence, not a replacement for current docs.
