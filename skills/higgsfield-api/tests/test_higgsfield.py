import importlib.util
import io
import json
import tempfile
import threading
import unittest
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "higgsfield.py"
SPEC = importlib.util.spec_from_file_location("higgsfield_cli", SCRIPT)
higgsfield = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(higgsfield)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def body(self):
        return self.rfile.read(int(self.headers.get("Content-Length", "0")))

    def send_json(self, data, status=200):
        raw = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        body = self.body()
        self.server.calls.append(("POST", self.path, dict(self.headers), body))
        if self.path == "/files/generate-upload-url":
            self.send_json({
                "upload_url": self.server.base + "/upload",
                "public_url": "https://cdn.example.com/input.jpg",
                "upload_headers": {"Content-Type": "image/jpeg", "x-amz-tagging": "retention=temporary"},
            })
        elif self.path.startswith("/estimate/"):
            self.send_json({"credits": "1.500", "usd": "0.094"})
        elif self.path == "/v1/custom-references":
            self.send_json({"id": "ref_123", "status": "queued"})
        elif self.path.endswith("/cancel"):
            self.send_response(202)
            self.end_headers()
        else:
            self.send_json({
                "status": "queued", "request_id": "11111111-1111-1111-1111-111111111111",
                "status_url": self.server.base + "/requests/11111111-1111-1111-1111-111111111111/status",
                "cancel_url": self.server.base + "/requests/11111111-1111-1111-1111-111111111111/cancel",
            })

    def do_GET(self):
        self.server.calls.append(("GET", self.path, dict(self.headers), b""))
        if self.path.startswith("/v1/custom-references/"):
            self.send_json({"id": "ref_123", "status": "completed"})
        elif self.path.endswith("/status"):
            self.send_json({"status": "completed", "images": [{"url": "https://cdn.example.com/output.jpg"}]})
        elif self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "https://example.com/other")
            self.end_headers()
        else:
            self.send_json({"detail": "not found"}, 404)

    def do_PUT(self):
        body = self.body()
        self.server.calls.append(("PUT", self.path, dict(self.headers), body))
        self.send_response(200)
        self.end_headers()


class ClientTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.server.base = f"http://127.0.0.1:{cls.server.server_port}"
        cls.server.calls = []
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self):
        self.server.calls.clear()
        self.client = higgsfield.Client("test-id", "test-secret", self.server.base)

    def test_catalog_has_every_documented_workflow_and_schema(self):
        entries = higgsfield.catalog()["entries"]
        self.assertEqual(len(entries), 82)
        self.assertEqual(len({entry["endpoint_id"] for entry in entries}), 82)
        self.assertTrue(all(entry["input_schema"]["type"] == "object" for entry in entries))
        soul_id = higgsfield.catalog_entry("v1/custom-references")
        self.assertEqual(soul_id["category"], "training")

    def test_estimate_submit_status_without_duplicate_post(self):
        body = {"prompt": "A lake"}
        self.assertEqual(self.client.estimate("higgsfield-ai/soul/v2/standard", body)["usd"], "0.094")
        accepted = self.client.submit("higgsfield-ai/soul/v2/standard", body)
        final = higgsfield.poll(lambda: self.client.status(accepted["status_url"]), higgsfield.TERMINAL, 2)
        self.assertEqual(final["status"], "completed")
        self.assertEqual([call[0] for call in self.server.calls], ["POST", "POST", "GET"])
        self.assertTrue(all(call[2].get("Authorization") == "Key test-id:test-secret" for call in self.server.calls))

    def test_upload_sends_presigned_headers_without_api_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.jpg"
            path.write_bytes(b"binary-image")
            result = self.client.upload(path)
        self.assertEqual(result["public_url"], "https://cdn.example.com/input.jpg")
        put = next(call for call in self.server.calls if call[0] == "PUT")
        self.assertEqual(put[3], b"binary-image")
        headers = {key.lower(): value for key, value in put[2].items()}
        self.assertEqual(headers["x-amz-tagging"], "retention=temporary")
        self.assertNotIn("Authorization", put[2])

    def test_rejects_cross_origin_urls_and_redirects(self):
        with self.assertRaises(ValueError):
            self.client.status("https://other.example.com/requests/abc/status")
        with self.assertRaises(higgsfield.ApiError) as caught:
            self.client.request("GET", "/redirect")
        self.assertEqual(caught.exception.status, 302)

    def test_soul_id_has_its_own_status_path(self):
        accepted = self.client.submit("v1/custom-references", {"name": "Test", "input_images": []})
        result = self.client.reference_status(accepted["id"])
        self.assertEqual(result["status"], "completed")
        self.assertEqual(self.server.calls[-1][1], "/v1/custom-references/ref_123")

    def test_artifact_url_extraction_deduplicates(self):
        result = {"status": "completed", "images": [{"url": "https://cdn.example.com/a.jpg"}],
                  "video": {"url": "https://cdn.example.com/b.mp4"},
                  "zip": "https://cdn.example.com/c.zip",
                  "payload": {"images": [{"url": "https://cdn.example.com/a.jpg"}]},
                  "status_url": "https://api.higgsfield.ai/requests/1/status"}
        self.assertEqual(higgsfield.artifact_urls(result), [
            "https://cdn.example.com/a.jpg", "https://cdn.example.com/b.mp4", "https://cdn.example.com/c.zip"
        ])
        with self.assertRaises(ValueError):
            higgsfield.artifact_urls({"status": "failed"})

    def test_download_streams_artifact_without_auth_header(self):
        class Response:
            url = "https://cdn.example.com/output.jpg"

            def __enter__(self):
                return self

            def __exit__(self, *_):
                pass

            def raise_for_status(self):
                pass

            def iter_content(self, chunk_size):
                yield b"image-data"

        with tempfile.TemporaryDirectory() as directory:
            with patch.object(higgsfield._requests, "get", return_value=Response()) as fetch:
                files = higgsfield.download(
                    {"status": "completed", "images": [{"url": "https://cdn.example.com/output.jpg"}]},
                    Path(directory),
                )
            self.assertEqual(Path(files[0]["path"]).read_bytes(), b"image-data")
            self.assertNotIn("headers", fetch.call_args.kwargs)

    def test_curl_fallback_keeps_secret_out_of_argv(self):
        with patch.object(higgsfield, "_requests", None):
            response = self.client.estimate("higgsfield-ai/soul/v2/standard", {"prompt": "A lake"})
        self.assertEqual(response["usd"], "0.094")
        self.assertEqual(self.server.calls[0][2]["Authorization"], "Key test-id:test-secret")

    def test_run_polls_by_request_id_when_returned_status_url_has_another_origin(self):
        request_id = "11111111-1111-1111-1111-111111111111"
        with tempfile.TemporaryDirectory() as directory:
            body = Path(directory) / "body.json"
            body.write_text('{"prompt":"A lake"}')
            with patch.object(higgsfield, "credentials", return_value=("test-id", "test-secret")), \
                 patch.object(higgsfield, "Client") as client_class, \
                 patch.object(higgsfield.sys, "argv", ["higgsfield.py", "run", "higgsfield-ai/soul/v2/standard", "--input", str(body)]), \
                 redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                client = client_class.return_value
                client.estimate.return_value = {"usd": "0.094", "credits": "1.500"}
                client.submit.return_value = {
                    "request_id": request_id,
                    "status_url": f"https://platform.higgsfield.ai/requests/{request_id}/status",
                }
                client.status.return_value = {"status": "completed", "request_id": request_id}
                self.assertEqual(higgsfield.main(), 0)
                client.status.assert_called_once_with(request_id)


if __name__ == "__main__":
    unittest.main()
