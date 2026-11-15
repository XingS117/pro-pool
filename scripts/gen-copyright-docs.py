# -*- coding: utf-8 -*-
"""生成软著材料：源代码文档.pdf + 软件说明书.pdf"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import re, os

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "软著申请"
OUT.mkdir(parents=True, exist_ok=True)
FULL = "即刻开球台球游戏软件"
VER = "V1.0"
CN = "C:/Windows/Fonts/msyh.ttc"
CNB = "C:/Windows/Fonts/msyhbd.ttc"
MONO = "C:/Windows/Fonts/consola.ttf"
MONOB = "C:/Windows/Fonts/consolab.ttf"
A4 = (1240, 1754)   # 150dpi A4
PER_PAGE = 50

def load(f):
    return ImageFont.truetype(f, 22)

F_CODE = load(MONO)
F_CODE_S = load(MONO)
F_CN = load(CN)
F_CN_S = load(CN)
F_CN_B = load(CNB)

ORDER = ['config', 'physics', 'renderer', 'audio', 'ai', 'levels', 'game']

def clean_source():
    """按软著审查要求清洗：去空行、去纯装饰注释、统一缩进、保留功能性中文注释。"""
    out = []
    for m in ORDER:
        p = ROOT / "js" / (m + ".js")
        raw = p.read_text(encoding="utf-8").split("\n")
        out.append("// ==================== " + m + ".js ====================")
        in_block = False
        for line in raw:
            t = line.rstrip()
            s = t.strip()
            if in_block:
                if "*/" in s:
                    in_block = False
                continue
            if s.startswith("/*"):
                if "*/" not in s:
                    in_block = True
                continue
            if s == "":
                continue
            if s.startswith("//"):
                # 只保留含中文的功能性注释
                if re.search(r"[\u4e00-\u9fff]", s):
                    out.append(t)
                continue
            # 统一为 2 空格缩进
            out.append(t)
    return out

lines = clean_source()
total = len(lines)
print("清洗后总行数:", total)
print("需要页数:", min(60, (total + PER_PAGE - 1) // PER_PAGE))
head = total // 2
if total > 60 * PER_PAGE:
    sel = lines[:30 * PER_PAGE] + lines[-(30 * PER_PAGE):]
    marker = ("// 按软著审查规范省略中间 %d 行，此处为前后各 30 页连续代码" % (total - 60 * PER_PAGE))
    sel = lines[:30 * PER_PAGE] + [marker] + lines[-(30 * PER_PAGE):]
else:
    sel = lines
pages = [sel[i:i + PER_PAGE] for i in range(0, len(sel), PER_PAGE)]

def draw_mixed(d, x, y, text):
    """一行内 ASCII 用等宽 consola、中文用 msyh，基线一致，避免中文豆腐块。"""
    cn = load(CN)
    mono = load(MONO)
    cx = x
    for ch in text:
        f = cn if re.search(r"[\u4e00-\u9fff]", ch) else mono
        d.text((cx, y), ch, font=f, fill=(15, 15, 15))
        cx += d.textlength(ch, font=f)
    return cx

def render_code_page(idx, rows):
    im = Image.new("RGB", A4, "white")
    d = ImageDraw.Draw(im)
    draw_mixed(d, 70, 48, FULL + "  " + VER)
    d.line([(70, 88), (A4[0] - 70, 88)], fill=(120, 120, 120), width=2)
    y = 118
    for ln in rows:
        if y > A4[1] - 110:
            break
        draw_mixed(d, 70, y, ln.replace("\t", "  "))
        y += 31
    d.line([(70, A4[1] - 88), (A4[0] - 70, A4[1] - 88)], fill=(120, 120, 120), width=2)
    draw_mixed(d, 70, A4[1] - 70, "第 %d 页 / 共 %d 页" % (idx, len(pages)))
    return im

imgs = [render_code_page(i + 1, p) for i, p in enumerate(pages)]
pdf = OUT / "源代码文档.pdf"
imgs[0].save(pdf, save_all=True, append_images=imgs[1:], resolution=150.0)
print("源代码文档.pdf 页数:", len(imgs), "大小:", pdf.stat().st_size)
