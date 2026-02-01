# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libglib2.0-0 \
    gcc \
    python3-dev \
    libpq-dev \
    dos2unix \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.1 \
    torchvision==0.18.1 \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY backend/ .

# Pre-download ML models to prevent startup timeouts
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" && \
    python -m spacy download en_core_web_sm

# Expose the port the app runs on
EXPOSE 8000

# Copy startup script and make executable
COPY backend/start.sh .
RUN dos2unix start.sh && chmod +x start.sh

# Command to run the application
CMD ["./start.sh"]
