from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/upload":
            self.send_error(404)
            return
        ext = parse_qs(parsed.query).get("ext", ["webm"])[0]
        if ext not in {"mp4", "webm"}:
            self.send_error(400, "Unsupported extension")
            return
        length = int(self.headers.get("Content-Length", "0"))
        output = ROOT / f"claimflow-ai-product-story-90s.{ext}"
        remaining = length
        with output.open("wb") as stream:
            while remaining:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                stream.write(chunk)
                remaining -= len(chunk)
        body = f"saved {output.name} ({output.stat().st_size} bytes)".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Serving ClaimFlow renderer at http://127.0.0.1:8765/renderer.html", flush=True)
    server.serve_forever()
