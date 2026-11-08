# Serveur de développement local sans cache : chaque rechargement prend les derniers fichiers.
# Usage : python tools/serve.py [port]   (la variable d'environnement PORT, si elle existe, est prioritaire)
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
port = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8765))
os.chdir(root)
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
