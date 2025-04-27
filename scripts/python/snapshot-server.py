import http.server
import json
import os

class MockFileSystemService(http.server.SimpleHTTPRequestHandler):
	def do_POST(self):
		data = self.rfile.read(int(self.headers['Content-Length']))
		json_data = json.loads(data.decode('utf-8'))

		if self.path == "/get-script-file-path":
			with open("./sourcemap.json", "r") as snapshot_file:
				snapshot = json.load(snapshot_file)

				root = snapshot

				for name in json_data["scriptPath"]:
					try:
						root = next(x for x in root["children"] if x["name"] == name)
					except StopIteration:
						self.send_response(404)
						self.end_headers()
						return

			self.send_response(200)
			self.end_headers()

			self.wfile.write(root["filePaths"][0].replace("\\", "/").encode('utf-8'))
		elif self.path == "/write-file":
			file_path = json_data["filePath"].replace("\\", "/")

			os.makedirs(os.path.dirname(file_path), exist_ok = True)
			with open(file_path, "w") as file:
				file.write(json_data["contents"])

			self.send_response(200)
			self.end_headers()
		else:
			print(f"unknown path: {self.path}")

			self.send_response(404)
			self.end_headers()

print("starting mock snapshot services host (port 9998)")
with http.server.HTTPServer(("", 9998), MockFileSystemService) as httpd:
	httpd.serve_forever()
