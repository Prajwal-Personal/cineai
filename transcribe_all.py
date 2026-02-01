"""
Re-transcribe all videos using Whisper now that FFmpeg is installed.
This script processes all takes and updates their transcriptions.
"""
import os
import sys
import json
import sqlite3
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# We'll use whisper directly
import whisper

print("\n🎙️ Loading Whisper model (this may take a moment)...")
model = whisper.load_model("tiny")  # Using tiny for speed, can use "base" for better accuracy
print("✅ Whisper model loaded!\n")

# Find the database and storage path
DB_PATH = "c:/Users/Prajw/SampleSmart/smartcut.db"
STORAGE_PATH = "c:/Users/Prajw/SampleSmart/storage"

if not os.path.exists(DB_PATH):
    print(f"❌ Database not found at {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT id, file_name, file_path, ai_metadata FROM takes")
rows = cursor.fetchall()

print(f"📹 Found {len(rows)} videos to transcribe\n")
print("-" * 70)

for row in rows:
    take_id, file_name, file_path, ai_metadata_str = row
    
    # Try multiple path variations
    paths_to_try = [
        file_path,
        os.path.join(STORAGE_PATH, file_name) if file_name else None,
        f"c:/Users/Prajw/SampleSmart/storage/{file_name}" if file_name else None,
    ]
    
    video_path = None
    for p in paths_to_try:
        if p and os.path.exists(p):
            video_path = p
            break
    
    if not video_path:
        print(f"⚠️  ID {take_id}: {file_name} - File not found, skipping")
        continue
    
    print(f"🎬 ID {take_id}: {file_name[:45]}...")
    
    try:
        # Transcribe with Whisper
        result = model.transcribe(video_path, fp16=False)  # fp16=False for CPU
        transcript = result["text"].strip()
        language = result.get("language", "en")
        
        # Update metadata
        try:
            meta = json.loads(ai_metadata_str) if ai_metadata_str else {}
        except:
            meta = {}
        
        # Update audio section
        if "audio" not in meta:
            meta["audio"] = {}
        
        meta["audio"]["transcript"] = transcript
        meta["audio"]["language"] = language
        meta["audio"]["source"] = "whisper"
        meta["audio"]["model"] = "tiny"
        
        # Update database
        cursor.execute(
            "UPDATE takes SET ai_metadata = ? WHERE id = ?",
            (json.dumps(meta), take_id)
        )
        
        # Show preview
        preview = transcript[:60] + "..." if len(transcript) > 60 else transcript
        print(f"   ✅ [{language.upper()}] {preview}")
        
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:50]}")

conn.commit()
conn.close()

print("-" * 70)
print("\n✨ Transcription complete! Refresh the browser to see updates.\n")
