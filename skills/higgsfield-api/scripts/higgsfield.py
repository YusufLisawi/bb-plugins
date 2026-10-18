#!/usr/bin/env python3
"""Small, dependency-free client for the Higgsfield developer API."""

from __future__ import annotations

import argparse
import decimal
import json
import mimetypes
import os
import random
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    import requests as _requests
except ImportError:
    _requests = None


API_BASE = "https://api.higgsfield.ai"
DEFAULT_CREDENTIALS = Path("~/.config/higgsfield-api/credentials.env").expanduser()
CATALOG = Path(__file__).resolve().parent.parent / "references" / "model-catalog.json"
TERMINAL = {"completed", "failed", "nsfw", "canceled"}
REFERENCE_TERMINAL = {"completed", "failed"}
SUPPORTED_UPLOAD_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "audio/wav", "audio/x-wav", "video/mp4",
}
ENDPOINT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")


class ApiError(RuntimeError):
    def __init__(self, status: int, detail: Any, correlation_id: str | None = None):
        self.status = status
        self.detail = detail
        self.correlation_id = correlation_id
        message = f"Higgsfield API HTTP {status}: {detail}"
        if correlation_id:
            message += f" (X-Correlation-ID: {correlation_id})"
        super().__init__(message)


class TransportError(RuntimeError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never forward an authenticated API request to another origin."""

    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def _dotenv(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    mode = path.stat().st_mode
    if os.name == "posix" and mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise ValueError(f"credential file must be private (chmod 600): {path}")
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if key in ("HF_API_KEY_ID", "HF_API_KEY_SECRET"):
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[key] = value
    return values


def credentials(path: Path | None = None) -> tuple[str, str]:
    path = path or Path(os.environ.get("HF_CREDENTIALS_FILE", DEFAULT_CREDENTIALS)).expanduser()
    values = _dotenv(path)
    key_id = os.environ.get("HF_API_KEY_ID") or values.get("HF_API_KEY_ID")
    secret = os.environ.get("HF_API_KEY_SECRET") or values.get("HF_API_KEY_SECRET")
    if not key_id or not secret:
        raise ValueError(
            "HF_API_KEY_ID and HF_API_KEY_SECRET are required in the environment "
            f"or the private credential file {path}"
        )
    if any(c in key_id + secret for c in "\r\n"):
        raise ValueError("credentials contain a line break")
    return key_id, secret


def endpoint_id(value: str) -> str:
    value = value.strip("/")
    if not ENDPOINT_RE.fullmatch(value) or ".." in value.split("/"):
        raise ValueError("endpoint must be a documented path without a URL or traversal")
    return value


def input_body(path: str) -> dict[str, Any]:
    if path == "-":
        body = json.load(sys.stdin)
    else:
        body = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(body, dict):
        raise ValueError("input JSON must be an object")
    return body


def catalog() -> dict[str, Any]:
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def catalog_entry(value: str) -> dict[str, Any]:
    needle = endpoint_id(value)
    for entry in catalog()["entries"]:
        if entry["endpoint_id"] == needle:
            return entry
    raise ValueError(f"endpoint is not in the bundled catalog: {needle}; refresh it or read current model docs")


class Client:
    def __init__(self, key_id: str, secret: str, base_url: str = API_BASE, timeout: float = 30.0):
        self.key_id = key_id
        self.secret = secret
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        parsed = urllib.parse.urlsplit(self.base_url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("invalid API base URL")
        self.origin = (parsed.scheme, parsed.netloc)
        self.opener = urllib.request.build_opener(NoRedirect())

    def _url(self, path_or_url: str) -> str:
        if path_or_url.startswith(("http://", "https://")):
            url = path_or_url
        else:
            url = self.base_url + "/" + path_or_url.lstrip("/")
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme, parsed.netloc) != self.origin:
            raise ValueError("refusing to send API credentials outside the configured API origin")
        return url

    def request(self, method: str, path_or_url: str, body: dict[str, Any] | None = None) -> Any:
        url = self._url(path_or_url)
        headers = {"Authorization": f"Key {self.key_id}:{self.secret}"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if _requests is not None:
            try:
                response = _requests.request(
                    method, url, headers=headers, json=body, timeout=self.timeout, allow_redirects=False
                )
            except _requests.RequestException as exc:
                raise TransportError(f"API network request failed: {exc}") from None
            return self._parse_response(response.status_code, response.content, response.headers)
        if shutil.which("curl"):
            return self._curl_request(method, url, body, headers)
        data = None if body is None else json.dumps(body, separators=(",", ":")).encode("utf-8")
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                return self._parse_response(response.status, response.read(), response.headers)
        except urllib.error.HTTPError as exc:
            return self._parse_response(exc.code, exc.read(4096), exc.headers)
        except urllib.error.URLError as exc:
            raise TransportError(f"API network request failed: {exc.reason}") from None

    @staticmethod
    def _parse_response(status: int, raw: bytes, headers: Any) -> Any:
        if status >= 300:
            try:
                parsed = json.loads(raw)
                detail = parsed.get("detail", parsed) if isinstance(parsed, dict) else parsed
            except ValueError:
                detail = raw[:1000].decode("utf-8", "replace")
            correlation = headers.get("X-Correlation-ID") or headers.get("x-correlation-id")
            raise ApiError(status, detail, correlation)
        return json.loads(raw) if raw else None

    def _curl_request(self, method: str, url: str, body: dict[str, Any] | None, headers: dict[str, str]) -> Any:
        # The authorization header lives in a private temporary file, never curl's argv.
        with tempfile.TemporaryDirectory(prefix="higgsfield-api-") as directory:
            root = Path(directory)
            header_file = root / "headers.txt"
            header_file.write_text("\n".join(f"{k}: {v}" for k, v in headers.items()) + "\n")
            header_file.chmod(0o600)
            body_file = root / "request.json"
            response_file = root / "response.body"
            response_headers = root / "response.headers"
            command = [
                "curl", "--silent", "--show-error", "--max-time", str(self.timeout),
                "--request", method, "--url", url, "--header", "@" + str(header_file),
                "--output", str(response_file), "--dump-header", str(response_headers),
                "--write-out", "%{http_code}",
            ]
            if body is not None:
                body_file.write_text(json.dumps(body, separators=(",", ":")))
                body_file.chmod(0o600)
                command += ["--data-binary", "@" + str(body_file)]
            completed = subprocess.run(command, text=True, capture_output=True, check=False)
            if completed.returncode:
                raise TransportError(f"curl API request failed: {completed.stderr.strip()[:300]}")
            try:
                status = int(completed.stdout.strip())
            except ValueError:
                raise TransportError("curl did not return an HTTP status") from None
            raw = response_file.read_bytes()
            header_text = response_headers.read_text(errors="replace")
            last_block = re.split(r"\r?\n\r?\n", header_text.strip())[-1]
            response_header_map = {}
            for line in last_block.splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    response_header_map[key.strip().lower()] = value.strip()
            return self._parse_response(status, raw, response_header_map)

    def estimate(self, endpoint: str, body: dict[str, Any]) -> dict[str, Any]:
        return self.request("POST", "/estimate/" + endpoint_id(endpoint), body)

    def submit(self, endpoint: str, body: dict[str, Any], webhook: str | None = None) -> dict[str, Any]:
        path = "/" + endpoint_id(endpoint)
        if webhook:
            parsed = urllib.parse.urlsplit(webhook)
            if parsed.scheme != "https" or not parsed.netloc:
                raise ValueError("webhook must be a public HTTPS URL")
            path += "?" + urllib.parse.urlencode({"hf_webhook": webhook})
        response = self.request("POST", path, body)
        if not isinstance(response, dict):
            raise RuntimeError("submission returned no JSON request handle")
        return response

    def _request_url(self, request: str, action: str) -> str:
        if request.startswith(("http://", "https://")):
            url = self._url(request)
            if not urllib.parse.urlsplit(url).path.endswith("/" + action):
                raise ValueError(f"URL must end with /{action}")
            return url
        if not re.fullmatch(r"[0-9a-fA-F-]{32,36}", request):
            raise ValueError("request must be a request ID or returned API URL")
        return f"/requests/{request}/{action}"

    def status(self, request: str) -> dict[str, Any]:
        response = self.request("GET", self._request_url(request, "status"))
        if not isinstance(response, dict):
            raise RuntimeError("status response was not JSON")
        return response

    def cancel(self, request: str) -> dict[str, Any]:
        response = self.request("POST", self._request_url(request, "cancel"))
        return response if isinstance(response, dict) else {"status": "cancel_requested"}

    def reference_status(self, reference_id: str) -> dict[str, Any]:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", reference_id):
            raise ValueError("invalid Soul ID reference ID")
        response = self.request("GET", "/v1/custom-references/" + reference_id)
        if not isinstance(response, dict):
            raise RuntimeError("reference status response was not JSON")
        return response

    def upload(self, path: Path, content_type: str | None = None) -> dict[str, Any]:
        if not path.is_file():
            raise ValueError(f"not a file: {path}")
        content_type = content_type or mimetypes.guess_type(path.name)[0]
        if content_type not in SUPPORTED_UPLOAD_TYPES:
            raise ValueError(f"unsupported or unknown content type: {content_type}")
        signed = self.request("POST", "/files/generate-upload-url", {"content_type": content_type})
        if not isinstance(signed, dict) or not all(k in signed for k in ("upload_url", "public_url", "upload_headers")):
            raise RuntimeError("upload URL response is missing required fields")
        upload_url = signed["upload_url"]
        parsed = urllib.parse.urlsplit(upload_url)
        if parsed.scheme != "https" and not (self.origin[0] == "http" and parsed.hostname in ("127.0.0.1", "localhost")):
            raise ValueError("presigned upload URL must use HTTPS")
        headers = dict(signed["upload_headers"])
        if not any(key.lower() == "content-type" for key in headers):
            headers["Content-Type"] = content_type
        headers["Content-Length"] = str(path.stat().st_size)

        def chunks():
            with path.open("rb") as stream:
                while True:
                    chunk = stream.read(1024 * 1024)
                    if not chunk:
                        return
                    yield chunk

        if _requests is not None:
            try:
                with path.open("rb") as stream:
                    response = _requests.put(
                        upload_url, data=stream, headers=headers,
                        timeout=max(self.timeout, 120), allow_redirects=False,
                    )
            except _requests.RequestException as exc:
                raise TransportError(f"presigned upload failed: {exc}") from None
            if response.status_code >= 300:
                raise RuntimeError(f"presigned upload failed with HTTP {response.status_code}")
        else:
            request = urllib.request.Request(upload_url, data=chunks(), headers=headers, method="PUT")
            try:
                with urllib.request.urlopen(request, timeout=max(self.timeout, 120)) as response:
                    response.read()
            except urllib.error.HTTPError as exc:
                raise RuntimeError(f"presigned upload failed with HTTP {exc.code}") from None
        return {"public_url": signed["public_url"], "content_type": content_type, "bytes": path.stat().st_size}


def poll(fetch, terminal: set[str], timeout: float) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    delay = 2.0
    while True:
        try:
            result = fetch()
        except ApiError as exc:
            if exc.status < 500:
                raise
            result = None
        except (urllib.error.URLError, TransportError):
            result = None
        if result is not None and result.get("status") in terminal:
            return result
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("request is still pending; resume with status or wait")
        time.sleep(min(remaining, delay + random.uniform(0, 0.5)))
        delay = min(delay * 1.5, 10.0)


def artifact_urls(result: dict[str, Any]) -> list[str]:
    if result.get("status") != "completed":
        raise ValueError("only completed results can be downloaded")
    roots = ("images", "image", "videos", "video", "audios", "audio", "zip", "mov", "jsx", "fbx", "ply", "files", "artifacts", "outputs", "payload")
    urls: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            if isinstance(value.get("url"), str):
                urls.append(value["url"])
            for key, child in value.items():
                if key != "url":
                    walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
        elif isinstance(value, str) and value.startswith("https://"):
            urls.append(value)

    for key in roots:
        if key in result:
            walk(result[key])
    return list(dict.fromkeys(urls))


def download(result: dict[str, Any], directory: Path) -> list[dict[str, Any]]:
    urls = artifact_urls(result)
    if not urls:
        raise ValueError("completed response contained no recognized artifact URLs")
    directory.mkdir(parents=True, exist_ok=True)
    downloaded: list[dict[str, Any]] = []
    for index, url in enumerate(urls, 1):
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("artifact URL must use HTTPS")
        name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(parsed.path).name) or "artifact"
        destination = directory / f"{index:02d}-{name}"
        temp = destination.with_name(destination.name + ".part")
        request = urllib.request.Request(url, headers={"User-Agent": "higgsfield-api-skill/1.0"})
        try:
            if _requests is not None:
                try:
                    with _requests.get(url, stream=True, timeout=120, allow_redirects=True) as response:
                        if urllib.parse.urlsplit(response.url).scheme != "https":
                            raise ValueError("artifact redirected away from HTTPS")
                        response.raise_for_status()
                        with temp.open("wb") as output:
                            for chunk in response.iter_content(chunk_size=1024 * 1024):
                                if chunk:
                                    output.write(chunk)
                except _requests.RequestException as exc:
                    raise TransportError(f"artifact download failed: {exc}") from None
            else:
                with urllib.request.urlopen(request, timeout=120) as response:
                    if urllib.parse.urlsplit(response.geturl()).scheme != "https":
                        raise ValueError("artifact redirected away from HTTPS")
                    with temp.open("wb") as output:
                        while True:
                            chunk = response.read(1024 * 1024)
                            if not chunk:
                                break
                            output.write(chunk)
            temp.replace(destination)
        finally:
            temp.unlink(missing_ok=True)
        downloaded.append({"url": url, "path": str(destination.resolve()), "bytes": destination.stat().st_size})
    return downloaded


def _price_limit(estimate: dict[str, Any], field: str, ceiling: str | None) -> None:
    if ceiling is None:
        return
    if field not in estimate:
        raise ValueError(f"estimate did not include {field}; cannot enforce budget")
    if decimal.Decimal(str(estimate[field])) > decimal.Decimal(ceiling):
        raise ValueError(f"estimated {field} {estimate[field]} exceeds limit {ceiling}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--credentials-file", type=Path, help="Private dotenv file with HF_API_KEY_ID and HF_API_KEY_SECRET")
    parser.add_argument("--api-timeout", type=float, default=30.0)
    commands = parser.add_subparsers(dest="command", required=True)
    models = commands.add_parser("models", help="Search the bundled model workflow catalog")
    models.add_argument("--search", default="")
    models.add_argument("--category", choices=("image", "video", "training"))
    schema = commands.add_parser("schema", help="Show one bundled endpoint and input schema")
    schema.add_argument("endpoint")
    for name in ("estimate", "submit", "run"):
        command = commands.add_parser(name)
        command.add_argument("endpoint")
        command.add_argument("--input", required=True, help="JSON file path, or - for stdin")
        if name in ("submit", "run"):
            command.add_argument("--webhook", help="Public HTTPS callback URL")
        if name == "run":
            command.add_argument("--wait-timeout", type=float, default=900.0)
            command.add_argument("--download-dir", type=Path)
            command.add_argument("--skip-estimate", action="store_true")
            command.add_argument("--max-usd")
            command.add_argument("--max-credits")
    for name in ("status", "wait", "cancel"):
        command = commands.add_parser(name)
        command.add_argument("request", help="Request ID or returned status/cancel URL")
        if name == "wait":
            command.add_argument("--wait-timeout", type=float, default=900.0)
    for name in ("reference-status", "reference-wait"):
        command = commands.add_parser(name)
        command.add_argument("reference_id", help="Soul ID custom reference ID")
        if name == "reference-wait":
            command.add_argument("--wait-timeout", type=float, default=1800.0)
    upload = commands.add_parser("upload", help="Upload input media through a presigned URL")
    upload.add_argument("path", type=Path)
    upload.add_argument("--content-type")
    save = commands.add_parser("download", help="Save artifacts from a completed result JSON file")
    save.add_argument("result", help="JSON file path, or - for stdin")
    save.add_argument("--dir", type=Path, required=True)
    args = parser.parse_args()

    try:
        if args.command == "models":
            query = args.search.lower()
            entries = [
                {key: entry[key] for key in ("endpoint_id", "title", "summary", "category", "docs_url")}
                for entry in catalog()["entries"]
                if (not args.category or entry["category"] == args.category)
                and query in " ".join(str(entry[key]) for key in ("endpoint_id", "title", "summary", "family")).lower()
            ]
            result: Any = {"count": len(entries), "entries": entries}
        elif args.command == "schema":
            result = catalog_entry(args.endpoint)
        elif args.command == "download":
            body = input_body(args.result)
            if "result" in body and isinstance(body["result"], dict):
                body = body["result"]
            result = {"downloaded": download(body, args.dir)}
        else:
            key_id, secret = credentials(args.credentials_file)
            client = Client(key_id, secret, timeout=args.api_timeout)
            if args.command == "upload":
                result = client.upload(args.path, args.content_type)
            elif args.command in ("estimate", "submit", "run"):
                body = input_body(args.input)
                if args.command == "estimate":
                    result = client.estimate(args.endpoint, body)
                elif args.command == "submit":
                    result = client.submit(args.endpoint, body, args.webhook)
                else:
                    if args.endpoint.strip("/") == "v1/custom-references":
                        raise ValueError("Soul ID training uses submit then reference-wait, not the generation run lifecycle")
                    if args.skip_estimate and (args.max_usd or args.max_credits):
                        raise ValueError("cannot enforce a budget when estimate is skipped")
                    estimate = None if args.skip_estimate else client.estimate(args.endpoint, body)
                    if estimate is not None:
                        _price_limit(estimate, "usd", args.max_usd)
                        _price_limit(estimate, "credits", args.max_credits)
                    accepted = client.submit(args.endpoint, body, args.webhook)
                    print(json.dumps({"accepted": accepted}, ensure_ascii=False), file=sys.stderr, flush=True)
                    # The API may return status_url on platform.higgsfield.ai.
                    # Keep credentials on api.higgsfield.ai and poll by ID there.
                    request = accepted.get("request_id") or accepted.get("status_url")
                    if not request:
                        raise RuntimeError("accepted response has no status URL or request ID")
                    completed = poll(lambda: client.status(request), TERMINAL, args.wait_timeout)
                    saved = download(completed, args.download_dir) if args.download_dir and completed.get("status") == "completed" else []
                    result = {"estimate": estimate, "accepted": accepted, "result": completed, "downloaded": saved}
            elif args.command == "status":
                result = client.status(args.request)
            elif args.command == "wait":
                result = poll(lambda: client.status(args.request), TERMINAL, args.wait_timeout)
            elif args.command == "cancel":
                result = client.cancel(args.request)
            elif args.command == "reference-status":
                result = client.reference_status(args.reference_id)
            elif args.command == "reference-wait":
                result = poll(lambda: client.reference_status(args.reference_id), REFERENCE_TERMINAL, args.wait_timeout)
            else:
                raise AssertionError(args.command)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        terminal_result = result.get("result", result) if isinstance(result, dict) else result
        if args.command in ("run", "wait", "reference-wait") and terminal_result.get("status") not in ("completed",):
            return 2
        return 0
    except (ApiError, OSError, ValueError, RuntimeError, TimeoutError, json.JSONDecodeError, decimal.InvalidOperation, urllib.error.URLError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
