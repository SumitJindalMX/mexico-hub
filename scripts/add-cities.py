import json
from pathlib import Path

p = Path("data/events.json")
data = json.loads(p.read_text(encoding="utf-8"))


def city(e):
    hay = f"{e.get('name', '')} {e.get('audience', '')} {e.get('highlight', '')}".lower()
    if "gdl" in hay or "guadalajara" in hay:
        return "GDL"
    if "cdmx" in hay or "mexico city" in hay:
        return "CDMX"
    return "Mexico"


for e in data["events"]:
    e["city"] = city(e)

p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print("updated", len(data["events"]), "events")
