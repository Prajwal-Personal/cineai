"""Check what the API returns for takes and their emotions."""
import requests
import json

response = requests.get("http://localhost:8000/api/v1/media")
takes = response.json()

print(f"\n📦 API Response: {len(takes)} takes\n")
print("-" * 60)

emotion_dist = {}
for t in takes:
    meta = t.get("ai_metadata") or {}
    emotion = meta.get("emotion", "MISSING")
    emotion_dist[emotion] = emotion_dist.get(emotion, 0) + 1
    
    fname = t.get("file_name", "unnamed")[:35]
    conf = t.get("confidence_score") or 0
    print(f"ID {t['id']:2d} | {fname:35s} | {emotion:12s} | {conf}/100")

print("-" * 60)
print("\n📊 Emotion Distribution from API:")
for e, c in sorted(emotion_dist.items(), key=lambda x: -x[1]):
    print(f"  {e:15s}: {c} takes")
