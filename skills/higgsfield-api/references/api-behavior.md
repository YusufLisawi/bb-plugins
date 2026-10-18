# Higgsfield API behavior

Sources: [authentication](https://docs.higgsfield.ai/docs/authentication.md), [quickstart](https://docs.higgsfield.ai/docs/quickstart.md), [requests](https://docs.higgsfield.ai/docs/concepts/requests.md), [polling](https://docs.higgsfield.ai/docs/concepts/polling.md), [uploads](https://docs.higgsfield.ai/docs/concepts/file-uploads.md), [errors](https://docs.higgsfield.ai/docs/concepts/errors.md), [webhooks](https://docs.higgsfield.ai/docs/how-to/webhooks.md), [billing](https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md), and [rate limits](https://docs.higgsfield.ai/docs/concepts/rate-limits.md). Checked 2026-09-25.

## Authentication and environments

- Production base URL: `https://api.higgsfield.ai`.
- Header: `Authorization: Key KEY_ID:KEY_SECRET`. `Bearer` is wrong for this API. Legacy `hf-api-key` and `hf-secret` headers remain accepted but are not the recommended new integration.
- Keep credentials server-side. The official Python SDK reads `HF_KEY=ID:SECRET`; TypeScript v2 reads `HF_CREDENTIALS=ID:SECRET`. The bundled script uses separate `HF_API_KEY_ID` and `HF_API_KEY_SECRET` values.
- Model access depends on the API account. A documented model may still return `404`, `423`, or `503` for a particular account or operational state. Check the Console and the selected model page before changing the endpoint.
- Do not treat a missing path in the shared OpenAPI specification as proof a model is unavailable. Its model coverage is supplementary.

## Generation lifecycle

`POST /{endpoint_id}` accepts the model-specific JSON body and returns `request_id`, `status_url`, `cancel_url`, and usually `status: queued`. Store the request ID immediately. Returned URLs can use `platform.higgsfield.ai`; the bundled CLI accepts the request ID and polls `/requests/{request_id}/status` on `api.higgsfield.ai` to keep API credentials on that origin. The status GET eventually reaches one of these states:

| Status | Terminal | Action |
| --- | --- | --- |
| `queued` | No | Poll; cancellation may still be possible. |
| `in_progress` | No | Poll; processing has begun. |
| `completed` | Yes | Read output URLs and download the artifacts. |
| `failed` | Yes | Record `error` and request ID; do not retry automatically. |
| `nsfw` | Yes | Treat as a moderated terminal result. |
| `canceled` | Yes | Stop polling. |

Completed results can contain `images[]`, `video`, `audio`/`audios[]`, or additional artifact fields such as `zip`, `mov`, `jsx`, `fbx`, and `ply`. The exact shape is model-specific. A successful `POST /requests/{request_id}/cancel` returns HTTP 202 with no body. It succeeds only before every job has started; a request in progress returns 400.

Poll the returned `status_url`, starting at about 2 seconds and increasing gradually to 10 seconds with jitter. Set a total deadline appropriate to the model. Retry status GETs after network failures or 5xx responses. Do **not** automatically retry a generation POST after an ambiguous timeout: Higgsfield currently has no submission idempotency key, so a retry can create a second billable job.

## Upload local input

1. `POST /files/generate-upload-url` with `{"content_type":"image/jpeg"}` or another supported type.
2. `PUT` raw file bytes to the returned `upload_url` using **every** returned `upload_headers` entry. Do not send the API Authorization header to this presigned storage URL. Its upload URL expires after one hour.
3. Put the returned `public_url` in the model's `image_url`, `image_urls`, `video_url`, or `audio_url` field as documented.

Documented MIME types: JPEG/JPG, PNG, WebP, GIF, WAV/X-WAV, and MP4. The declared content type must match the upload request. A direct source URL must be publicly reachable; a local filesystem path is not a model input URL.

## Estimate, billing, and retention

`POST /estimate/{endpoint_id}` with the same body as generation returns account-specific `credits` and `usd` values as strings. Costs depend on model and parameters; never quote the examples in docs as current prices. Successful generations use account credits. `failed` and `nsfw` jobs are not charged, and successfully canceled queued jobs are refunded. Credits expire one year after being added. Generated outputs are available for at least seven days and may disappear afterward.

Concurrency is the main generation limit. The API can return HTTP 400 with a concurrency message rather than 429. The dashboard shows account limits; the API does not currently publish standard rate-limit or `Retry-After` headers. Wait for accepted requests to finish before submitting more work. Do not spin on a concurrency error.

## Errors and support

| HTTP code | Meaning and action |
| --- | --- |
| 400 | Invalid/rejected input or concurrency full; inspect the specific response. |
| 401 | Invalid or missing credentials; stop. |
| 403 | Insufficient credits; fund the API account. |
| 404 | Request/model unavailable to this account or wrong identifier; verify docs and account. |
| 422 | Validation error; correct the JSON against the selected model schema. |
| 423 | Model temporarily blocked; try later after checking status. |
| 500 | Server error; retry safe GETs with backoff. |
| 503 | Model disabled or not ready; check status and try later. |

Responses include `X-Correlation-ID`. Keep it with the request ID when reporting a support issue. Human-readable `detail` messages are diagnostic, not a stable machine interface.

## Webhooks

Add `hf_webhook=<URL-encoded HTTPS endpoint>` as a query parameter to the generation POST. Higgsfield sends terminal `completed`, `failed`, or `nsfw` payloads. Successful media is nested under `payload`. The receiver must respond within ten seconds, return 2xx after durably recording a valid event, and deduplicate by `request_id` plus terminal `status`. Network errors and 5xx deliveries are retried for up to two hours; 4xx is permanent. Keep status polling as recovery.

The reviewed webhook documentation does not describe a signature or shared-secret verification mechanism. Do not treat an incoming webhook body alone as authenticated. For a consequential action, verify its request ID and terminal state through the authenticated status API before acting.

## Official SDKs

The [Python client](https://github.com/higgsfield-ai/higgsfield-client) exposes `subscribe`, `subscribe_async`, `submit`, status/cancel, and upload helpers. The [TypeScript client](https://github.com/higgsfield-ai/higgsfield-js) supports server-side v2 use through `@higgsfield/client/v2`. Use an official SDK when integrating inside an existing Python or TypeScript service; the bundled stdlib script is for agent tasks and portable CLI execution.
