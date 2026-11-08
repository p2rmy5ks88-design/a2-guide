"""Records every Skyline Coach line with the approved natural voice (Kokoro v1.0, voice af_heart, Apache-2.0;
runs offline, no service or account). Writes coach/<voice>/<id>.mp3 (mono, 48 kbps) and manifest.json.
Usage: python generate.py lines-en.json out_dir kokoro-v1.0.onnx voices-v1.0.bin"""
import json, os, sys, subprocess, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro
cat = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
k = Kokoro(sys.argv[3], sys.argv[4]); files = {}; total = 0
for i, (cid, text) in enumerate(cat['lines'].items()):
    dst = os.path.join(out, cid + '.mp3')
    if not os.path.exists(dst):
        a, sr = k.create(text, voice='af_heart', speed=1.0, lang='en-us')
        with tempfile.NamedTemporaryFile(suffix='.wav') as w:
            sf.write(w.name, a, sr)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w.name, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)
    files[cid] = cid + '.mp3'; total += os.path.getsize(dst)
    if i % 50 == 0: print(i, cid, flush=True)
json.dump({'voice': cat['voice'], 'name': 'Natural English - Female', 'model': 'Kokoro-82M v1.0 (Apache-2.0), voice af_heart', 'version': 1, 'bytes': total, 'files': files, 'index': cat.get('index', {})}, open(os.path.join(out, 'manifest.json'), 'w'), indent=0)
print('done', len(files), total)
