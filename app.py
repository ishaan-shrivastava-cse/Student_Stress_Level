import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

def run():
    if shutil.which("python") is None and shutil.which("py") is None:
        raise SystemExit("Python was not found on PATH.")
    if shutil.which("npm") is None:
        raise SystemExit("Node.js/npm was not found. Install Node.js LTS, then run app.py again.")

    print("\n  StressLens — local full-stack launcher")
    print("  Backend : http://127.0.0.1:8000")
    print("  Frontend: http://127.0.0.1:5173\n")

    # Install frontend packages the first time.
    if not (FRONTEND / "node_modules").exists():
        print("Installing React/Vite dependencies (first run only)...")
        subprocess.run(["npm.cmd", "install"], cwd=FRONTEND, check=True)

    py = sys.executable
    backend_cmd = [py, "manage.py", "runserver", "127.0.0.1:8000", "--noreload"]
    frontend_cmd = ["npm.cmd", "run", "dev", "--", "--host", "127.0.0.1"]

    processes = []
    try:
        processes.append(subprocess.Popen(backend_cmd, cwd=BACKEND))
        time.sleep(1.5)
        processes.append(subprocess.Popen(frontend_cmd, cwd=FRONTEND))
        print("Open http://127.0.0.1:5173 in your browser.")
        print("Press Ctrl+C here to stop both servers.\n")
        while True:
            if any(p.poll() is not None for p in processes):
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping StressLens...")
    finally:
        for p in processes:
            if p.poll() is None:
                p.terminate()
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()

if __name__ == "__main__":
    run()
