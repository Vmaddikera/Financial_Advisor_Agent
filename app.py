"""
Run the Financial AI Analyst Frontend

This script starts both the backend API and opens the frontend in your browser.
"""

import subprocess
import webbrowser
import time
import os
import sys
from pathlib import Path

def start_backend():
    """Start the FastAPI backend server"""
    print("Starting backend API server...")
    backend_process = subprocess.Popen(
        [sys.executable, "backend_api.py"],
        cwd=Path(__file__).parent
    )
    return backend_process

def open_frontend():
    """Open the frontend in the browser"""
    frontend_path = Path(__file__).parent / "frontend" / "index.html"
    if frontend_path.exists():
        print("Opening frontend in browser...")
        time.sleep(2)  # Wait for backend to start
        webbrowser.open(f"file://{frontend_path.absolute()}")
    else:
        print(f"Error: Frontend file not found at {frontend_path}")

def main():
    print("="*60)
    print("Financial AI Analyst - Starting Application")
    print("="*60)
    print()
    
    # Check if .env exists
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        print("⚠️  WARNING: .env file not found!")
        print("Please create a .env file with your GROQ_API_KEY")
        print("Example: GROQ_API_KEY=your_key_here")
        print()
    
    # Start backend
    backend = start_backend()
    
    try:
        # Open frontend
        open_frontend()
        
        print()
        print("="*60)
        print("Application Started!")
        print("="*60)
        print("Backend API: http://localhost:8000")
        print("Frontend: Check your browser")
        print()
        print("Press Ctrl+C to stop the server")
        print("="*60)
        
        # Keep running
        backend.wait()
        
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        backend.terminate()
        backend.wait()
        print("Server stopped.")

if __name__ == "__main__":
    main()

