from flask import Flask, render_template, request, jsonify, send_from_directory
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from waitress import serve

app = Flask(__name__)

# =========================
# CONFIG
# =========================

UPLOAD_FOLDER = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024  # 10GB

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

# Create upload folder if not exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Store messages in memory
messages = []

# =========================
# ROUTES
# =========================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/send", methods=["POST"])
def send():
    name = request.form.get("name", "Unknown")
    message = request.form.get("message", "")
    file = request.files.get("file")

    file_name = None

    if file and file.filename != "":
        original_name = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_name = f"{timestamp}_{original_name}"
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], file_name)
        file.save(file_path)

    messages.append({
        "name": name,
        "message": message,
        "file": file_name,
        "time": datetime.now().strftime("%H:%M")
    })

    return jsonify({"status": "ok"})


@app.route("/messages")
def get_messages():
    return jsonify(messages)


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


# =========================
# RUN SERVER (LOCAL ONLY)
# =========================

if __name__ == "__main__":

    print("\n===== SERVER STARTED =====")
    print("Local URL: http://127.0.0.1:5000")
    print("Network access disabled (localhost only)")
    print("==========================\n")

    serve(
        app,
        host="127.0.0.1",   # ONLY localhost
        port=5000,
        threads=4
    )