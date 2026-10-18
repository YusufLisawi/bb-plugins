# Choosing a Higgsfield API workflow

The bundled [model catalog](model-catalog.json) contains 82 workflow entries discovered from the public docs on 2026-09-25: 15 image generation/edit workflows, 66 video workflows, and one Soul ID character training workflow. Each entry includes the endpoint ID, official model page, usage notes, and complete documented JSON input schema. The API Console determines current access for the authenticated account.

Use `python3 scripts/higgsfield.py models --search QUERY` to narrow candidates. `--category image`, `--category video`, or `--category training` filters output. Inspect one with `python3 scripts/higgsfield.py schema ENDPOINT_ID`. The `docs_url` from that result should be checked before a new workflow is automated, since models and accepted fields can change.

## Match the input to the workflow

| User input and goal | Workflow terms to search | Input to verify |
| --- | --- | --- |
| Text prompt to image | `text to image`, `generate` | Prompt, size/aspect ratio, style controls. |
| Reference images to edited image | `edit`, `image reference` | Number/order of image URLs and strength settings. |
| Text prompt to video | `text to video` | Duration, resolution, aspect ratio, audio settings. |
| First frame to video | `image to video` | `image_url`, optional last frame, duration. |
| Multiple image/video/audio references | `reference to video` | Media array formats and supported reference count. |
| Motion from a source clip | `motion control`, `motion transfer` | Both character image and motion/source video; duration and resolution limits. |
| Edit or extend a source clip | `video edit`, `video extend` | Source clip, extension length, optional controls. |
| Reusable Soul character | `Soul ID` | Training first, then matching Soul family generation. |

These are discovery hints, not interchangeable API contracts. For example, a model may accept only a first frame while another accepts first and last frames. Read its actual schema.

## Soul ID training is a separate lifecycle

Soul ID uses `POST /v1/custom-references` with `name`, `model_version` (`v1`, `v2`, or `cinema`), and 1–100 `input_images` objects of the form `{"type":"image_url","image_url":"https://..."}`. It returns a reference `id` and `status`; poll `GET /v1/custom-references/{id}`. Training states are `not_ready`, `queued`, `in_progress`, `completed`, and `failed`. After completion, pass the ID as `custom_reference_id` to a compatible Soul generation endpoint. The ID is scoped to the same account. See [Soul ID's current model page](https://docs.higgsfield.ai/docs/models/soul-id/create-character.md).

CLI example: `submit v1/custom-references --input soul-id.json`, then `reference-wait REFERENCE_ID`. The generic `run` command is for generation requests and rejects Soul ID training.

## Example sequence

```bash
python3 scripts/higgsfield.py models --search 'soul v2'
python3 scripts/higgsfield.py schema higgsfield-ai/soul/v2/standard
python3 scripts/higgsfield.py estimate higgsfield-ai/soul/v2/standard --input input.json
python3 scripts/higgsfield.py run higgsfield-ai/soul/v2/standard --input input.json --download-dir ./outputs
```

The `run` command estimates first, submits once, polls, then downloads if requested. Use `--max-usd` or `--max-credits` to enforce a budget. Its accepted request handle is printed immediately to stderr so the ID remains visible if polling is interrupted. To resume, call `status` or `wait` with the returned `status_url` or request ID.
