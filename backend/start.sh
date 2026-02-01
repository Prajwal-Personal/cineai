#!/bin/bash
echo "🚀 Container Started. Current Directory: $(pwd)"
echo "🔧 Environment: PORT=$PORT"

# Ensure we have a port
if [ -z "$PORT" ]; then
    echo "⚠️ PORT variable not set. Defaulting to 8000."
    export PORT=8000
fi

# Run the server with unbuffered output
exec python -u start_server.py
