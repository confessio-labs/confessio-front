import os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get("Range")
        if not rng or os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()
        m = re.match(r"bytes=(\d+)-(\d*)", rng)
        size = os.path.getsize(path)
        start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        f = open(path, "rb"); f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        n = getattr(self, "_remaining", None)
        if n is None:
            return super().copyfile(source, outputfile)
        outputfile.write(source.read(n))

os.chdir(os.path.dirname(os.path.abspath(__file__)))
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8765), RangeHandler).serve_forever()
