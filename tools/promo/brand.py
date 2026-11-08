# Xuất ảnh thương hiệu từ img/brand/*.svg: python brand.py
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
B = ROOT / 'img' / 'brand'
LOGO = (B / 'logo.svg').read_text(encoding='utf-8')
ICON = (B / 'icon.svg').read_text(encoding='utf-8')
FONT = '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Chakra+Petch:wght@700&display=swap" rel="stylesheet">'
BG = '''background:#0b0920;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;
  font-family:'Be Vietnam Pro',sans-serif;color:#fff'''
GLOW = '''<div style="position:absolute;inset:0;background:
  radial-gradient(circle at 25% 30%,rgba(139,92,246,.55),transparent 45%),
  radial-gradient(circle at 80% 75%,rgba(255,79,216,.35),transparent 45%),
  radial-gradient(circle at 70% 15%,rgba(34,211,238,.25),transparent 40%)"></div>'''
def word(size, sub=None):
    s = f'''<div style="position:relative;font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:{size}px;letter-spacing:{size*0.06:.0f}px;line-height:1.05">
      HÀNH TRÌNH <span style="color:#ffd23f">CKTG</span></div>'''
    if sub: s += f'<div style="position:relative;font-weight:600;font-size:{size*0.36:.0f}px;color:#cfc8ff;margin-top:{size*0.25:.0f}px">{sub}</div>'
    return s

PAGES = {
    # Biểu tượng nền trong suốt
    'icon-512.png': (512, 512, f'<div style="width:512px;height:512px;display:flex;align-items:center;justify-content:center">{ICON.replace("<svg ", "<svg width=\"440\" height=\"500\" ")}</div>', True),
    'icon-192.png': (192, 192, f'<div style="width:192px;height:192px;display:flex;align-items:center;justify-content:center">{ICON.replace("<svg ", "<svg width=\"164\" height=\"188\" ")}</div>', True),
    'logo-600.png': (600, 640, f'<div style="width:600px;height:640px">{LOGO.replace("<svg ", "<svg width=\"600\" height=\"640\" ")}</div>', True),
    'favicon-32.png': (32, 32, f'<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">{ICON.replace("<svg ", "<svg width=\"28\" height=\"32\" ")}</div>', True),
    # Biểu tượng nền tối (iPhone không dùng ảnh trong suốt)
    'apple-touch-icon.png': (180, 180, f'<div style="width:180px;height:180px;{BG}">{GLOW}<div style="position:relative">{ICON.replace("<svg ", "<svg width=\"128\" height=\"150\" ")}</div></div>', False),
    # Ảnh đại diện mạng xã hội
    'avatar-1080.png': (1080, 1080, f'<div style="width:1080px;height:1080px;{BG};flex-direction:column">{GLOW}<div style="position:relative">{LOGO.replace("<svg ", "<svg width=\"620\" height=\"661\" ")}</div></div>', False),
    # Ảnh hiện khi chia sẻ link (Facebook, Zalo, Messenger)
    'og-image.png': (1200, 630, f'''<div style="width:1200px;height:630px;{BG};gap:56px">{GLOW}
        <div style="position:relative">{LOGO.replace("<svg ", "<svg width=\"360\" height=\"384\" ")}</div>
        <div style="position:relative">{word(64, "Game quản lý đội tuyển eSports")}
          <div style="position:relative;display:inline-block;margin-top:34px;padding:14px 30px;border-radius:999px;background:#7b5cff;font-weight:800;font-size:34px">cktg.online</div>
          <div style="position:relative;margin-top:18px;font-size:22px;color:#a49fc4">Chơi miễn phí · Không cần tải</div></div></div>''', False),
    # Ảnh bìa trang Facebook
    'cover-fb.png': (1640, 624, f'''<div style="width:1640px;height:624px;{BG};gap:60px">{GLOW}
        <div style="position:relative">{LOGO.replace("<svg ", "<svg width=\"330\" height=\"352\" ")}</div>
        <div style="position:relative">{word(76, "Build team · Leo rank · Vô địch thế giới")}
          <div style="position:relative;margin-top:26px;font-weight:800;font-size:34px;color:#22d3ee">cktg.online</div></div></div>''', False),
}

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', headless=True)
    for name, (w, h, body, transparent) in PAGES.items():
        pg = br.new_page(viewport={'width': w, 'height': h})
        pg.set_content(f'<!doctype html><html><head><meta charset="utf-8">{FONT}</head><body style="margin:0;background:transparent">{body}</body></html>', wait_until='networkidle')
        pg.evaluate('document.fonts.ready')
        pg.screenshot(path=str(B / name), omit_background=transparent, clip={'x': 0, 'y': 0, 'width': w, 'height': h})
        pg.close(); print(name)
    br.close()
