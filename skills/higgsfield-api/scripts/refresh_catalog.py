#!/usr/bin/env python3
"""Build a compact endpoint/schema catalog from Higgsfield's public model docs."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


DOCS_ORIGIN = "https://docs.higgsfield.ai"
SKILL_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = SKILL_ROOT / "references" / "model-catalog.json"
FAMILY_RE = re.compile(r'href="/docs/models/([a-z0-9-]+)"')
WORKFLOW_RE = re.compile(r"\(/docs/models/([a-z0-9-]+/[a-z0-9-]+)(?:\.md)?\)")
SCHEMA_RE = re.compile(
    r'<Accordion title="Complete JSON schema">\s*```json[^\n]*\n(.*?)\n\s*```',
    re.DOTALL,
)


def document(path: str, source_dir: Path | None) -> str:
    """Read one canonical Markdown page, never a scraped HTML summary."""
    if source_dir is not None:
        root = source_dir / "pages" if (source_dir / "pages").is_dir() else source_dir
        return (root / (path.lstrip("/") + ".md")).read_text(encoding="utf-8")
    url = DOCS_ORIGIN + "/docs/" + path.lstrip("/") + ".md"
    request = urllib.request.Request(url, headers={"User-Agent": "higgsfield-api-skill/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def fetch_many(paths: set[str], source_dir: Path | None) -> dict[str, str]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        values = list(pool.map(lambda path: document(path, source_dir), sorted(paths)))
    return dict(zip(sorted(paths), values))


def parse_entry(path: str, body: str, category: str) -> dict:
    heading = re.search(r"^# (.+)$", body, re.MULTILINE)
    endpoint = re.search(
        r"\*\*Endpoint:\*\*\s*`POST (https://api\.higgsfield\.ai/[^`]+)`", body
    )
    schema = SCHEMA_RE.search(body)
    if not (heading and endpoint and schema):
        raise ValueError(f"missing heading, endpoint, or complete JSON schema: {path}")
    endpoint_id = endpoint.group(1).removeprefix("https://api.higgsfield.ai/")
    documented_id = re.search(r"\*\*Endpoint ID:\*\*\s*`([^`]+)`", body)
    if documented_id and documented_id.group(1) != endpoint_id:
        raise ValueError(f"endpoint ID does not match URL: {path}")
    parsed_schema = json.loads(schema.group(1))
    if parsed_schema.get("type") != "object":
        raise ValueError(f"expected object input schema: {path}")
    summary = re.search(r"^> (.+)$", body[heading.end():], re.MULTILINE)
    usage = ""
    if "## Usage notes" in body:
        usage = body.split("## Usage notes", 1)[1].split("## Quick start", 1)[0]
    notes = [re.sub(r"\\([_{}])", r"\1", item.strip()) for item in re.findall(r"^\* (.+)$", usage, re.MULTILINE)]
    source_url = DOCS_ORIGIN + "/docs/" + path + ".md"
    return {
        "endpoint_id": endpoint_id,
        "title": heading.group(1),
        "summary": summary.group(1) if summary else "",
        "category": "training" if path.startswith("models/soul-id/") else category,
        "family": path.split("/")[1],
        "docs_url": source_url,
        "usage_notes": notes,
        "input_schema": parsed_schema,
        "source_sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
    }


def build_catalog(source_dir: Path | None) -> dict:
    categories = {
        "image": document("models/image-generation", source_dir),
        "video": document("models/video-generation", source_dir),
    }
    families: dict[str, str] = {}
    for category, body in categories.items():
        for family in FAMILY_RE.findall(body):
            if family in families and families[family] != category:
                raise ValueError(f"family listed in two categories: {family}")
            families[family] = category
    if not families:
        raise ValueError("no model families discovered")

    family_pages = fetch_many({"models/" + family for family in families}, source_dir)
    workflows: dict[str, str] = {}
    for path, body in family_pages.items():
        family = path.split("/")[1]
        if "## Workflows" not in body:
            raise ValueError(f"missing workflows section: {path}")
        section = body.split("## Workflows", 1)[1].split("Open a workflow", 1)[0]
        for workflow in WORKFLOW_RE.findall(section):
            if workflow.split("/")[0] != family:
                raise ValueError(f"cross-family workflow link: {path} -> {workflow}")
            workflows["models/" + workflow] = families[family]
    if not workflows:
        raise ValueError("no workflows discovered")

    workflow_pages = fetch_many(set(workflows), source_dir)
    entries = [parse_entry(path, body, workflows[path]) for path, body in workflow_pages.items()]
    entries.sort(key=lambda entry: entry["endpoint_id"])
    ids = [entry["endpoint_id"] for entry in entries]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate endpoint IDs in documentation")
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": DOCS_ORIGIN + "/docs",
        "source_priority": "Model page and API Console before supplementary OpenAPI specification",
        "families": len(families),
        "workflows": len(entries),
        "entries": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Offline docs snapshot root or pages directory")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    try:
        catalog = build_catalog(args.source_dir)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"catalog refresh failed: {exc}", file=sys.stderr)
        return 1
    print(f"wrote {catalog['workflows']} workflows from {catalog['families']} families to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
