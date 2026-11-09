# Quay các cảnh game cho video quảng cáo bằng Edge (Playwright + CDP screencast).
# Dùng: python capture.py <url> <out_dir> <vertical|horizontal>
import json, sys, time, base64, pathlib
from playwright.sync_api import sync_playwright

URL, OUT, MODE = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3]
OUT.mkdir(parents=True, exist_ok=True)
if MODE == 'vertical':
    VIEW, DPR, MAXW, MAXH = {'width': 432, 'height': 768}, 2.5, 1080, 1920
else:
    VIEW, DPR, MAXW, MAXH = {'width': 1280, 'height': 720}, 1.5, 1920, 1080

# Bản lưu mẫu: HLV cấp cao, đội hình mạnh, nhiều thẻ để cảnh quay đẹp
SEED = r"""
(() => {
  const best = r => CARDS.filter(c => c.role === r).sort((a, b) => b.rating - a.rating);
  const used = new Set(); S.cards = {}; S.lineup = {};
  ROLES.forEach(r => {
    const c = best(r).find(c => !used.has(c.name)); used.add(c.name);
    S.cards[c.id + '+5'] = 1; S.lineup[r] = c.id + '+5';
  });
  const pool = CARDS.slice().sort((a, b) => b.rating - a.rating);
  for (let i = 0; i < 60; i++) { const c = pool[(i * 7) % pool.length]; S.cards[c.id] = (S.cards[c.id] || 0) + (i % 5 === 0 ? 2 : 1); }
  S.level = 27; S.exp = 40; S.money = 284500; S.tut = 1;
  S.stats = Object.assign(S.stats, { w: 142, l: 51, titles: 9, fw: 20, maxUp: 6, maxPow: 99, ups: 30 });
  ['VCS', 'PCS', 'LCS', 'LEC'].forEach(id => { if (TOUR[id]) { S.won[id] = 1; S.best[id] = TOUR[id].stages.length - 1; } });
  S.teamName = 'Saigon Phoenix'; S.nameKey = nameKey('Saigon Phoenix');
  save();
})();
"""

# Bản quảng cáo không được có người/thương hiệu thật (TikTok, Facebook chặn):
# - bỏ ảnh chụp tuyển thủ/logo đội → game tự dùng chân dung vẽ
# - đổi tên tuyển thủ, mã đội, tên giải thật sang tên giả ngay trên màn hình (chỉ khi quay)
ANON = r"""
(() => {
  const A = ['Ka','Ry','Zen','Vo','Lu','Mi','Ta','Ze','No','Ki','Ra','Xi','Do','Fe','Ji','Sa','Ha','Bo','Qu','Ny','Ve','Ko'];
  const B = ['ro','vik','sel','nox','ra','ko','lis','dan','ven','mo','zy','rin','thos','ka','lux','ne','vo','ris','gan','tor'];
  const L = 'BCDFGHKLMNPRSTVXZ';
  let re = null, map = null;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function build() {
    if (typeof CARDS === 'undefined' || typeof TEAM_INFO === 'undefined') return false;
    map = {};
    // tên giả không được trùng tên thật (tránh đổi qua đổi lại vô tận)
    const names = new Set(CARDS.map(c => c.name));
    const used = new Set(['KR', 'CN', 'EU', 'NA', 'VN', 'APAC', 'GMS']);
    [...names].forEach((n, i) => {
      let k = i * 3, f;
      do { f = A[k % A.length] + B[Math.floor(k / A.length) % B.length]; k++; } while (used.has(f) || names.has(f));
      used.add(f); map[n] = f;
    });
    const codes = [...new Set([...Object.keys(TEAM_INFO), ...CARDS.map(c => c.team)])];
    codes.forEach((c, i) => {
      let k = i * 7 + 20, f;
      do { f = L[k % L.length] + L[Math.floor(k / L.length) % L.length] + L[(k * 3 + 5) % L.length]; k++; } while (used.has(f) || codes.includes(f) || names.has(f));
      used.add(f); map[c] = f; if (TEAM_INFO[c]) map[TEAM_INFO[c].name] = 'Team ' + f;
    });
    Object.assign(map, { LCK: 'KR', LPL: 'CN', LEC: 'EU', LCS: 'NA', VCS: 'VN', PCS: 'APAC', MSI: 'GMS' });
    const keys = Object.keys(map).sort((a, b) => b.length - a.length).map(esc);
    re = new RegExp('(?<![\\w.])(' + keys.join('|') + ')(?![\\w])', 'g');
    return true;
  }
  function fix(node) {
    if (!re && !build()) return;
    if (node.nodeType === 3) {
      const t = node.nodeValue;
      if (t && re.test(t)) { re.lastIndex = 0; node.nodeValue = t.replace(re, m => map[m]); }
      re.lastIndex = 0;
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9) return;
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(fix);
  }
  new MutationObserver(ms => ms.forEach(m => {
    if (m.type === 'characterData') fix(m.target); else m.addedNodes.forEach(fix);
  })).observe(document, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', () => fix(document));
})();
"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch(channel='msedge', headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        ctx = br.new_context(viewport=VIEW, device_scale_factor=DPR, is_mobile=(MODE == 'vertical'), has_touch=(MODE == 'vertical'))
        ctx.route('**/js/photo-manifest.js*', lambda r: r.fulfill(content_type='text/javascript', body='const PHOTO_MANIFEST={players:{},teams:{}};'))
        ctx.route('**/js/credits.js*', lambda r: r.fulfill(content_type='text/javascript', body='const IMAGE_CREDITS=[];'))
        ctx.route('**/img/players/**', lambda r: r.abort())
        ctx.route('**/img/teams/**', lambda r: r.abort())
        ctx.add_init_script(ANON)
        page = ctx.new_page()
        page.goto(URL, wait_until='load')
        page.wait_for_timeout(2500)
        page.evaluate("() => { const b = document.querySelector('#w-go'); if (b) b.click(); }")
        page.evaluate(SEED)
        page.reload(wait_until='load')
        page.wait_for_timeout(300)
        cdp = ctx.new_cdp_session(page)
        frames = []
        def on_frame(e):
            frames.append((e['metadata']['timestamp'], e['data']))
            try: cdp.send('Page.screencastFrameAck', {'sessionId': e['sessionId']})
            except Exception: pass
        cdp.on('Page.screencastFrame', on_frame)

        def scene(name, actions):
            frames.clear()
            cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 88, 'maxWidth': MAXW, 'maxHeight': MAXH, 'everyNthFrame': 1})
            t0 = time.time()
            actions()
            cdp.send('Page.stopScreencast')
            page.wait_for_timeout(200)
            d = OUT / name; d.mkdir(exist_ok=True)
            for f in d.glob('*.jpg'): f.unlink()
            lines = []
            fr = list(frames)
            for i, (ts, data) in enumerate(fr):
                (d / f'{i:05d}.jpg').write_bytes(base64.b64decode(data))
            # danh sách khung + thời lượng cho ffmpeg concat
            for i, (ts, _) in enumerate(fr):
                nxt = fr[i + 1][0] if i + 1 < len(fr) else ts + 0.1
                lines.append(f"file '{i:05d}.jpg'\nduration {max(0.001, nxt - ts):.4f}")
            if fr: lines.append(f"file '{len(fr)-1:05d}.jpg'")
            (d / 'list.txt').write_text('\n'.join(lines), encoding='utf-8')
            print(name, len(fr), 'frames', round(time.time() - t0, 1), 's', flush=True)

        w = page.wait_for_timeout
        js = page.evaluate

        # 1) Mở đầu: màn hình tải rồi trang đội hình
        def s_intro():
            page.reload(wait_until='commit'); w(4200)
            js("() => window.scrollTo({top: 0})"); w(800)
        scene('intro', s_intro)

        # 2) Đội hình + sức mạnh: cuộn chậm
        def s_team():
            js("() => switchView('team')"); w(600)
            for y in range(0, 9):
                js(f"() => window.scrollTo({{top: {y * (70 if MODE == 'vertical' else 40)}, behavior: 'smooth'}})"); w(450)
            w(500)
        scene('team', s_team)

        # 3) Mở gói Huyền Thoại (ép ra thẻ xịn cho cảnh quay)
        def s_pack():
            js("() => { switchView('shop'); }"); w(1200)
            js("() => document.querySelector('[data-buy=legend]').scrollIntoView({block:'center'})"); w(800)
            js("() => { const q = ['SSS','SS','SSS']; let k = 0; window.rollTier = () => q[k++ % q.length]; }")
            page.click('[data-buy=legend]'); w(1000)
            page.click('#po-next'); w(8200)
            page.click('#po-next'); w(6800)
            page.click('#po-next'); w(8200)
            page.click('#po-next'); w(2500)
            js("() => closeModal()"); w(300)
        scene('pack', s_pack)

        # 4) Bộ sưu tập + nâng cấp
        def s_collect():
            js("() => switchView('collection')"); w(1200)
            for y in range(1, 6):
                js(f"() => window.scrollTo({{top: {y * 160}, behavior: 'smooth'}})"); w(500)
            js("() => switchView('upgrade')"); w(2500)
        scene('collect', s_collect)

        # 5) Bản đồ giải đấu rồi trận đấu
        def s_match():
            js("() => switchView('map')"); w(1200)
            js("() => window.scrollTo({top: 380, behavior: 'smooth'})"); w(1600)
            js("() => switchView('team')"); w(300)
            js("() => friendly()"); w(1800)
            js("() => { const b = document.querySelector('.spd[data-s=\"4\"]'); }")
            page.click('#pm-watch'); w(500)
            js("() => { const b = document.querySelector('.spd[data-s=\"4\"]'); if (b && !b.disabled) b.click(); }")
            w(16000)
        scene('match', s_match)

        br.close()

main()
