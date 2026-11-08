# Tạo giọng đọc cho từng câu thoại: python voice.py <out_dir>
import asyncio, json, sys, pathlib
import edge_tts

HERE = pathlib.Path(__file__).parent
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
cfg = json.loads((HERE / 'script.json').read_text(encoding='utf-8'))

async def main():
    for ln in cfg['lines']:
        await edge_tts.Communicate(ln['say'], cfg['voice'], rate=cfg['rate']).save(str(OUT / f"{ln['id']}.mp3"))
        print(ln['id'], 'ok')

asyncio.run(main())
