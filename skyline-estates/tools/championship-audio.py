#!/usr/bin/env python3
"""One-time branch-only Kokoro af_heart recording for the Skyline Championship finale.
Uses the identical natural model/voice and ffmpeg mastering settings as
tools/coach-voice/generate.py. Do not ship an unrecorded or robotic substitute.
"""
import json, os, subprocess, sys, tempfile
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"coach/natural-en-f"
MAN=DEST/"manifest.json"
lines={
  "champ_5":"Skyline Championship! Five rounds remaining.",
  "champ_4":"Four rounds left. Make every move count.",
  "champ_3":"Three rounds to go. It is getting close!",
  "champ_2":"Two rounds remain. Time to make your move.",
  "champ_1":"Final round! This is your last chance to build your skyline!"
}
assert MAN.exists(),"Existing natural voice manifest missing"
manifest=json.loads(MAN.read_text(encoding="utf-8"))
modeldir=Path(sys.argv[1])
k=Kokoro(str(modeldir/"kokoro-v1.0.onnx"),str(modeldir/"voices-v1.0.bin"))
for key,phrase in lines.items():
    dst=DEST/(key+".mp3")
    if not dst.exists():
        wave,sr=k.create(phrase,voice="af_heart",speed=1.0,lang="en-us")
        with tempfile.NamedTemporaryFile(suffix=".wav") as temp:
            sf.write(temp.name,wave,sr)
            subprocess.run(["ffmpeg","-loglevel","error","-y","-i",temp.name,
                "-af","silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5",
                "-ac","1","-ar","24000","-b:a","48k",str(dst)],check=True)
    assert dst.stat().st_size>6000, f"Audio is unexpectedly small: {dst}"
    subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(dst)],check=True,
        stdout=subprocess.DEVNULL)
    manifest["files"][key]=dst.name
    manifest.setdefault("index",{}).setdefault("text",{})[phrase]=key
manifest["bytes"]=sum((DEST/name).stat().st_size for name in manifest["files"].values())
MAN.write_text(json.dumps(manifest,ensure_ascii=False,indent=0)+"\n",encoding="utf-8")
print(f"Recorded {len(lines)} exact Voice A clips; manifest has {len(manifest['files'])} entries; bytes={manifest['bytes']}")
