# Ghép video quảng cáo: python build.py <raw_dir> <voice_dir> <out.mp4> <vertical|horizontal>
import json, subprocess, sys, pathlib, shutil

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
RAW, VOICE, OUT, MODE = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), pathlib.Path(sys.argv[3]).resolve(), sys.argv[4]
V = MODE == 'vertical'
# 'nomusic': chỉ giữ giọng đọc — chọn nhạc từ thư viện nhạc thương mại của TikTok/Facebook khi tạo quảng cáo
NOMUSIC = len(sys.argv) > 5 and sys.argv[5] == 'nomusic'
W, H = (1080, 1920) if V else (1920, 1080)
WORK = OUT.parent / ('work-' + MODE); WORK.mkdir(parents=True, exist_ok=True)
FONT = 'C\\:/Windows/Fonts/segoeuib.ttf'
cfg = json.loads((HERE / 'script.json').read_text(encoding='utf-8'))
MUSIC = ROOT / 'audio' / 'menu-heroic-age.mp3'

def ff(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *map(str, a)], check=True, cwd=WORK)

def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]))

# 1) Mỗi cảnh: chuỗi ảnh (thời lượng không đều) → clip 30 khung/giây
for s in ['intro', 'team', 'pack', 'collect', 'match']:
    ff('-f', 'concat', '-safe', '0', '-i', RAW / s / 'list.txt',
       '-vf', f'fps=30,scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
       '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', f'{s}.mp4')

# 2) Dòng thời gian: (cảnh, từ giây, tới giây, tốc độ)
SEG = [
    [('intro', 0.0, 4.6, 1)],
    [('team', 0.3, 7.0, 1)],
    [('pack', 0.8, 12.8, 2)],
    [('collect', 0.4, 8.9, 1.7)],
    [('match', 0.4, 2.4, 1), ('match', 9.0, 14.4, 2)],
]
parts = [p for seg in SEG for p in seg]
inputs, fl = [], []
for i, (s, a, b, sp) in enumerate(parts):
    inputs += ['-i', f'{s}.mp4']
    fl.append(f'[{i}:v]trim={a}:{b},setpts=(PTS-STARTPTS)/{sp}[p{i}]')
body_len = sum((b - a) / sp for _, a, b, sp in parts)

# 3) Màn hình kết: nền là khung đội hình làm mờ + chữ
END = 5.3
bg = WORK / 'end-bg.jpg'
ff('-ss', '1.5', '-i', 'team.mp4', '-frames:v', '1', bg.name)
(WORK / 't1.txt').write_text('HÀNH TRÌNH CKTG', encoding='utf-8')
(WORK / 't2.txt').write_text('Game quản lý đội tuyển eSports', encoding='utf-8')
(WORK / 't3.txt').write_text('cktg.online', encoding='utf-8')
(WORK / 't4.txt').write_text('Chơi miễn phí · Không cần tải', encoding='utf-8')
k = W / 1080 if V else H / 1080 * 1.1
def dt(f, size, y, color, t0, box=''):
    return (f"drawtext=fontfile='{FONT}':textfile={f}:fontsize={int(size * k)}:fontcolor={color}:x=(w-tw)/2:y={y}{box}"
            f":alpha='min(1,max(0,(t-{t0})/0.4))'")
LOGO_H = int((560 if V else 440) * (W / 1080 if V else 1))
cy = H * 0.5 + (LOGO_H * 0.42 if V else 0)
lx = '(W-w)/2' if V else f'{W * 0.13:.0f}'
ly = f'{cy - 300 * k - LOGO_H:.0f}' if V else f'{(H - LOGO_H) / 2:.0f}'
if not V:  # khung ngang: logo bên trái, chữ bên phải
    k = 1.0
end_f = ','.join([
    f'scale={W}:{H},boxblur=18:2,eq=brightness=-0.28:saturation=1.2',
    dt('t1.txt', 92, f'{cy - 230 * k}', '0xFFD54A', 0.1),
    dt('t2.txt', 46, f'{cy - 110 * k}', 'white', 0.4),
    dt('t3.txt', 110, f'{cy + 10 * k}', 'white', 0.8, f':box=1:boxcolor=0x7B5CFF@0.85:boxborderw={int(34 * k)}'),
    dt('t4.txt', 44, f'{cy + 200 * k}', '0xCFE3FF', 1.2),
    'format=yuv420p'])
if not V:
    end_f = end_f.replace('x=(w-tw)/2', f'x={W * 0.62:.0f}-tw/2')
n = len(parts)
inputs += ['-loop', '1', '-t', str(END), '-i', bg.name, '-loop', '1', '-t', str(END), '-i', ROOT / 'img' / 'brand' / 'logo-600.png']
fl.append(f'[{n}:v]{end_f},fps=30,setpts=PTS-STARTPTS[ebg]')
fl.append(f"[{n + 1}:v]scale=-1:{LOGO_H},format=rgba,fade=t=in:st=0:d=0.5:alpha=1,fps=30,setpts=PTS-STARTPTS[elogo]")
fl.append(f'[ebg][elogo]overlay=x={lx}:y={ly}:shortest=1,format=yuv420p[pend]')
total = body_len + END

# 4) Phụ đề (ASS) căn theo giọng đọc
starts = [0.3]
seg_lens = [sum((b - a) / sp for _, a, b, sp in seg) for seg in SEG]
acc = 0
for L in seg_lens: acc += L; starts.append(acc + 0.15)
starts = starts[:6]
vd = [dur(VOICE / f"{ln['id']}.mp3") for ln in cfg['lines']]
def ts(t):
    h, t = divmod(t, 3600); m, s = divmod(t, 60)
    return f'{int(h)}:{int(m):02d}:{s:05.2f}'
# Khung dọc: phụ đề nằm trên vùng chữ/nút của TikTok, Reels (~ 1/4 dưới màn hình)
fs, mv = (50, 560) if V else (50, 60)
ass = [
    '[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'WrapStyle: 0', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    f'Style: Sub,Segoe UI,{fs},&H00FFFFFF,&H00FFFFFF,&H18E0503F,&H18E0503F,-1,0,0,0,100,100,0,0,3,18,0,2,40,40,{mv},1',
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
for i, ln in enumerate(cfg['lines'][:5]):
    a, b = starts[i], starts[i] + vd[i] + 0.25
    ass.append(f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{{\\fad(120,120)}}{ln['sub'].replace(chr(10), '\\N')}")
(WORK / 'subs.ass').write_text('\n'.join(ass), encoding='utf-8-sig')

# 5) Âm thanh: giọng đọc đặt đúng chỗ + nhạc nền tự hạ khi có giọng
ai = n + 2
for i, ln in enumerate(cfg['lines']):
    inputs += ['-i', VOICE / f"{ln['id']}.mp3"]
if not NOMUSIC: inputs += ['-i', MUSIC]
vo = []
for i in range(6):
    d = int(starts[i] * 1000)
    fl.append(f'[{ai + i}:a]aresample=48000,adelay={d}|{d},volume=1.6[v{i}]')
    vo.append(f'[v{i}]')
fl.append(f"{''.join(vo)}amix=inputs=6:normalize=0,apad,atrim=0:{total}[voice]")
if NOMUSIC:
    fl.append('[voice]alimiter=limit=0.95[aout]')
else:
    fl.append('[voice]asplit[vx][vsc]')
    fl.append(f'[{ai + 6}:a]aresample=48000,atrim=0:{total},volume=0.55,afade=t=in:d=0.8,afade=t=out:st={total - 1.8}:d=1.8[mus]')
    fl.append('[mus][vsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck]')
    fl.append('[vx][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]')

# 6) Nối hình + phụ đề + mờ dần đầu/cuối
fl.append(''.join(f'[p{i}]' for i in range(n)) + f'[pend]concat=n={n + 1}:v=1:a=0[cat]')
fl.append(f"[cat]subtitles=subs.ass,fade=t=in:d=0.4,fade=t=out:st={total - 0.6}:d=0.6[vout]")
(WORK / 'graph.txt').write_text(';\n'.join(fl), encoding='utf-8')
ff(*inputs, '-/filter_complex', 'graph.txt', '-map', '[vout]', '-map', '[aout]',
   '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
   '-c:a', 'aac', '-b:a', '192k', '-r', '30', '-movflags', '+faststart', '-t', f'{total:.2f}', OUT)
print(OUT, round(total, 1), 's')
