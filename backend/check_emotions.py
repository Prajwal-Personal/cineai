"""Check database emotion values for all takes."""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import database as models

db = SessionLocal()
takes = db.query(models.Take).all()
print(f"\n📊 Database Report: {len(takes)} takes\n")
print("-" * 80)

emotion_counts = {}
for t in takes:
    meta = t.ai_metadata or {}
    emotion = meta.get("emotion") or "unknown"
    confidence = t.confidence_score if t.confidence_score else 0
    transcript = ""
    if meta.get("audio") and meta.get("audio").get("transcript"):
        transcript = meta["audio"]["transcript"][:40]
    
    emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    fname = t.file_name[:35] if t.file_name else "unnamed"
    print(f"ID {t.id:2d} | {fname:35s} | {emotion:12s} | {int(confidence):3d}/100")

print("-" * 80)
print("\n📈 Emotion Distribution:")
for e, c in sorted(emotion_counts.items(), key=lambda x: -x[1]):
    print(f"  {e:15s}: {c} takes")

db.close()
