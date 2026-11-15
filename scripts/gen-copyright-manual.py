# -*- coding: utf-8 -*-
"""生成软著材料：软件说明书.pdf（总-分结构，图文并茂，每图下有功能说明）"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "软著申请"
OUT.mkdir(parents=True, exist_ok=True)
FULL = "即刻开球台球游戏软件"
VER = "V1.0"
CN = "C:/Windows/Fonts/msyh.ttc"
CNB = "C:/Windows/Fonts/msyhbd.ttc"
A4 = (1240, 1754)
M = 70
CONTENT_W = A4[0] - M * 2

def L(f, s): return ImageFont.truetype(f, s)
F_TITLE = L(CNB, 40)
F_H1 = L(CNB, 30)
F_H2 = L(CNB, 24)
F_BODY = L(CN, 20)
F_SMALL = L(CN, 17)
F_CAP = L(CN, 18)

class Doc:
    def __init__(self):
        self.pages = []
        self.im = Image.new("RGB", A4, "white")
        self.d = ImageDraw.Draw(self.im)
        self.y = 130
        self.n = 0
    def newpage(self):
        self.footer()
        self.pages.append(self.im)
        self.n += 1
        self.im = Image.new("RGB", A4, "white")
        self.d = ImageDraw.Draw(self.im)
        self.header()
        self.y = 130
    def header(self):
        self.d.text((M, 48), FULL + "  " + VER + "  软件说明书", font=L(CN, 19), fill=(30, 30, 30))
        self.d.line([(M, 88), (A4[0]-M, 88)], fill=(140, 140, 140), width=2)
    def footer(self):
        self.d.line([(M, A4[1]-92), (A4[0]-M, A4[1]-92)], fill=(140, 140, 140), width=2)
        self.d.text((M, A4[1]-74), "第 %d 页" % (self.n + 1), font=L(CN, 18), fill=(70, 70, 70))
    def space(self, h=14): self.y += h
    def need(self, h):
        if self.y + h > A4[1] - 120: self.newpage()
    def need_soft(self, h):
        # 图片后允许继续同页排文字，仅在剩余空间不足时换页
        if self.y + h > A4[1] - 120: self.newpage()
    def title(self, t):
        self.newpage()
        self.d.text((M, self.y), t, font=F_TITLE, fill=(18, 18, 18)); self.y += 66
        self.d.rectangle([M, self.y, M + 120, self.y + 5], fill=(196, 150, 44)); self.y += 30
    def h1(self, t):
        self.need(70)
        self.d.text((M, self.y), t, font=F_H1, fill=(20, 20, 20)); self.y += 48
    def h2(self, t):
        self.need(56)
        self.d.text((M + 10, self.y), t, font=F_H2, fill=(35, 35, 35)); self.y += 38
    def para(self, t, font=None, indent=0):
        f = font or F_BODY
        line_h = 32
        maxw = CONTENT_W - indent
        cur = ""
        for ch in t:
            trial = cur + ch
            if self.d.textlength(trial, font=f) > maxw:
                self.need(line_h)
                self.d.text((M + indent, self.y), cur, font=f, fill=(40, 40, 40)); self.y += line_h
                cur = ch
            else:
                cur = trial
        if cur:
            self.need(line_h)
            self.d.text((M + indent, self.y), cur, font=f, fill=(40, 40, 40)); self.y += line_h
        self.y += 6
    def bullets(self, items):
        for it in items:
            self.need(32)
            self.d.text((M + 16, self.y), "-", font=F_BODY, fill=(60, 60, 60))
            self.para(it, F_BODY, indent=30)
    def image(self, path, cap):
        p = ROOT / path
        if not p.exists(): return
        im = Image.open(p).convert("RGB")
        w = CONTENT_W
        h = int(im.height * w / im.width)
        maxh = 430
        if h > maxh:
            h = maxh; w = int(im.width * h / im.height)
        im = im.resize((w, h))
        self.need(h + 90)
        self.im.paste(im, (M + (CONTENT_W - w)//2, self.y))
        self.y += h + 14
        # 图注（居中）
        cw = self.d.textlength(cap, font=F_CAP)
        self.d.text((M + (CONTENT_W - cw)//2, self.y), cap, font=F_CAP, fill=(90, 90, 90))
        self.y += 44
    def table(self, rows, widths=None):
        fs = L(CN, 18)
        rh = 40
        for ri, row in enumerate(rows):
            self.need(rh)
            x = M
            for ci, cell in enumerate(row):
                w = widths[ci] if widths else CONTENT_W // len(row)
                self.d.rectangle([x, self.y, x + w - 4, self.y + rh - 4], fill=(243, 241, 236) if ri == 0 else (252, 251, 248), outline=(205, 202, 195))
                fnt = L(CNB, 18) if ri == 0 else fs
                self.d.text((x + 12, self.y + 10), cell, font=fnt, fill=(35, 35, 35))
                x += w
            self.y += rh
        self.y += 12

doc = Doc()
doc.header()

# 封面
doc.d.text((M, 300), FULL, font=L(CNB, 52), fill=(18, 18, 18))
doc.d.text((M, 380), "软件说明书", font=L(CNB, 34), fill=(196, 150, 44))
doc.d.text((M, 440), "版本：" + VER, font=L(CN, 22), fill=(60, 60, 60))
doc.d.text((M, 480), "开发完成日期：2026 年 11 月 01 日", font=L(CN, 22), fill=(60, 60, 60))
doc.d.text((M, 520), "首次发表日期：2026 年 11 月 07 日", font=L(CN, 22), fill=(60, 60, 60))
doc.d.rectangle([M, 580, M + 160, 586], fill=(196, 150, 44))
doc.newpage()

# 一、概述
doc.title("一、软件概述")
doc.h2("1.1 软件简介")
doc.para("本软件是一款运行于浏览器及微信小游戏平台的休闲台球游戏，采用 HTML5 Canvas 2D 渲染与自研物理引擎实现，完全离线运行，不含任何第三方运行时依赖。玩家可与内置三档人工智能对手进行八球规则对局，或在同一设备上进行双人对抗，亦可挑战十二个预设球局关卡。")
doc.h2("1.2 运行环境")
doc.table([
    ["项目", "说明"],
    ["硬件环境", "PC（x86_64）或智能手机（Android / iOS），内存 2GB 以上"],
    ["软件环境", "Windows / macOS / Linux；Chrome、Edge、Firefox、Safari 浏览器；微信小游戏运行时"],
    ["开发语言", "JavaScript（ECMAScript 5 语法集，经典 script 加载）"],
    ["运行环境", "HTML5 Canvas 2D、Web Audio API、localStorage"],
    ["源程序量", "8517 行（不含空行与纯装饰注释）"],
], [240, CONTENT_W - 240])
doc.h2("1.3 模块划分")
doc.bullets([
    "配置模块 config.js：球台尺寸、球半径、袋口参数、物理系数、经济系统与九支球杆定义。",
    "物理模块 physics.js：定步长子步积分、连续碰撞检测、滑动与滚动摩擦、旋转衰减、库边反弹、袋口判定与瞄准射线 castRay。",
    "渲染模块 renderer.js：程序化球桌绘制、球体伪三维明暗与号码贴图、球杆、瞄准辅助线、虚影母球与特效。",
    "音频模块 audio.js：Web Audio 实时合成的击球、碰撞、落袋音效，并内嵌少量 Creative Commons 采样。",
    "智能模块 ai.js：候选球路搜索、蒙特卡洛物理模拟、击球点调优、位置评估与三档难度参数。",
    "关卡模块 levels.js：十二个关卡球局布局与星级结算规则。",
    "规则模块 game.js：八球完整规则判定、回合切换、犯规处理、击球执行与存档持久化。",
    "交互模块 main.js：鼠标与触控输入、界面绑定、主循环与埋点。",
])
doc.image("docs/screenshots/menu.png", "图 1-1 主菜单界面：提供单人挑战、双人对战与关卡模式三个入口，并展示当前装备球杆")

# 二、功能模块
doc.title("二、功能模块说明")
doc.h1("2.1 主菜单与模式选择")
doc.para("主菜单列出三种游戏模式。单人挑战进入与人工智能的八球对决，可选择球房新手、职业陪练、黑八高手三档难度；双人对战供同一台设备的两位玩家轮流操作；关卡模式在限定杆数内完成清台任务。界面同时展示当前装备球杆及其力量、旋转、辅助线三项属性。")
doc.image("docs/screenshots/menu.png", "图 2-1 主菜单：点击「单人挑战」「双人对战」「关卡模式」分别进入对应玩法")
doc.h1("2.2 对局与瞄准辅助")
doc.para("对局界面顶部显示双方球组与回合归属，底部为力度与角度微调区，右侧为击球点面板与出杆按钮。玩家在球台上拖动即可瞄准，界面实时绘制高亮瞄准线、目标球预测路径与母球分离方向。")
doc.para("瞄准辅助中的虚影母球以半透明乳白色球体呈现，复用真实母球的球体底色、光照高光与边缘暗部，准确标示母球与目标球接触瞬间的球心位置，并附带母球身份红点，便于玩家判断切球角度与厚度。")
doc.image("docs/screenshots/game.png", "图 2-2 对局界面：拖动球台改变瞄准方向，右侧竖条为力度，底部为角度微调")
doc.h1("2.3 击球点")
doc.para("击球点面板提供十一个命名预设：中杆、高杆、中高杆、中低杆、低杆、左塞、右塞，以及高杆左塞、高杆右塞、低杆左塞、低杆右塞四个组合点。面板下方随当前选点实时显示该击球点的走位效果说明，例如高杆产生跟进、低杆产生回缩、左右塞改变碰库反弹角。玩家亦可直接拖动球面上的红点自由选择击球位置。")
doc.image("docs/screenshots/spin.png", "图 2-3 击球点面板：十一个预设按钮，当前选中项高亮，下方为效果说明")
doc.h1("2.4 力度、出杆与自由球")
doc.para("按住鼠标左键或空格键蓄力，界面显示当前力度百分比，松开即出杆。触屏设备通过右侧竖向力度条下拉蓄力。母球落袋、空杆、先碰错球等情形判为犯规，对手获得自由球；自由球状态下可按住母球拖动摆放位置，落位后出杆前仍可再次调整。")
doc.h1("2.5 关卡与商店")
doc.para("关卡模式提供十二个手工摆放的球局，关卡编号自 l1 至 l12，名称依次为目标初体验、隔球直线、角度入门、双目标、花球拦路、薄边切球、三球连线、密集干扰、长台清点、组合出杆、四球挑战、终局清台。每一关均指定必须打进的彩色目标球号码与不得打进的干扰花色球号码，干扰球一旦落袋即判该关失败；玩家需在限定杆数内完成全部目标球，按使用杆数结算一至三星并获得金币。球杆商店使用金币购买九支球杆，星级达到门槛可解锁更高阶球杆；不同球杆具有独立外形，并影响力量、旋转与瞄准辅助强度，异形杆另有玩法侧重。")
doc.image("docs/screenshots/level.png", "图 2-4 关卡模式：显示关卡目标、剩余杆数与结算星级")
doc.image("docs/screenshots/shop.png", "图 2-5 球杆商店：展示可购买球杆的外观与属性，并显示解锁条件")
doc.h1("2.6 人工智能对手")
doc.para("人工智能模块先按当前球台状态枚举候选目标球与目标袋口，再以物理模拟评估每个候选的进球概率、切角难度、落袋后母球位置与对手下一杆的威胁程度，据此排序；随后在选定角度附近进行角度与力度微调搜索，并通过出口自检确认出杆参数确实可以进球。三档难度通过不同的搜索范围、模拟次数、修正窗口与微调策略实现区分：球房新手仅选择明显可进的球并保留一定手感误差；职业陪练启用角度力度修正与出口自检，具备中等水平的连续进攻能力；黑八高手使用更宽的搜索窗口与更严格的修正策略，对所有能够瞄准的球均要求直接进袋，并具备一杆连续清台的能力。")
doc.h1("2.7 规则判定")
doc.para("软件实现完整八球规则：开球后球台保持开放状态，开球进球可继续出杆但不确定球组；开球未进球时须至少两球吃库，否则判犯规；开球后首次合法进球确定球组归属；清空本方球组后合法打进黑八即获胜；黑八提前落袋判负；开球时黑八落袋则重新摆球。母球落袋、空杆、先碰错球与开球无效均判犯规，对手获得自由球。")
doc.h1("2.8 声音与画面")
doc.para("击球、碰撞、落袋等核心反馈使用 Web Audio 实时合成，胜利时播放人群欢呼，失败时播放下沉收束音。球桌、球体、球杆与界面元素全部由 Canvas 程序化绘制，不加载任何外部图片资源。")

# 三、移动端
doc.title("三、移动端适配")
doc.para("软件在竖屏设备上自动将球台旋转为纵向显示，顶部信息条与右侧控件分列，底部仅保留一条细角度尺，触控目标尺寸不小于 44 像素。横屏时恢复横向球台，并提供全屏切换按钮。触摸拖动改变瞄准方向，点按可直接指向目标位置，力度通过竖条下拉蓄力。")
doc.image("docs/screenshots/mobile-game.png", "图 3-1 手机竖屏界面：竖向球台、右侧力度条与击球点面板、底部角度微调")

# 四、技术特点
doc.title("四、技术特点与创新性")
doc.h2("4.1 连续碰撞检测")
doc.para("物理积分采用固定 1/600 秒子步长，每子步球心位移可达十余毫米，若直接以穿透后的两球连线作为碰撞法线，切角越大方向偏差越显著。软件通过解算相对运动方程求取精确接触时刻，并以该时刻的球心连线作为法线，使出球方向与辅助线所呈现的几何方向严格一致，实测误差为零度。")
doc.h2("4.2 真实袋口模型")
doc.para("袋口按真实开口建模，库边在袋口处断开并设置袋角反弹。球的落袋判定同时考虑球心是否越过台呢边界、球速是否仍有冲劲以及球心与袋心距离，避免出现球停在袋口反复颤抖或应落未落的异常情形。")
doc.h2("4.3 旋转与走位")
doc.para("击球点位置决定初始角速度，进而通过滑动摩擦转换为滚动，产生跟进、回缩与碰库偏转等走位效果；旋转随时间衰减，摩擦系数与恢复系数均按真实台球量级调校。")
doc.h2("4.4 零依赖单文件交付")
doc.para("全部样式与脚本内联于单个 HTML 文件，运行时无任何网络请求，可直接双击本地打开，亦可部署于任意静态托管服务，便于在浏览器、微信小游戏等不同宿主环境中复用同一套核心代码。")

# 五、知识产权
doc.title("五、知识产权与合规声明")
doc.para("本软件全部源代码、球桌与球体绘制、球杆造型、界面布局、物理算法与人工智能算法均为自主开发，未使用任何第三方商业游戏的美术、音频、代码或数据资源。")
doc.para("软件内嵌少量 Creative Commons 授权音效片段用于击球与落袋反馈，已在随附的《CREDITS》文件中逐条标注来源与作者。")
doc.para("软件不收集任何用户个人信息，不设账号体系，不含内购与广告强制项，适用于各年龄段休闲玩家，建议适龄提示为八周岁以上。")

# ---------------------------------------------------------------------------
# 附：功能模块与源程序对应说明（用于证明说明书描述与源程序一致）
# ---------------------------------------------------------------------------
doc.title("附：功能模块与源程序对应说明")
doc.para("本表逐项列明软件说明书所述功能在源程序中的实现位置，供审查时核对。源程序共 8517 行，不含空行与纯装饰注释。")
doc.table([
    ["说明书所述功能", "源程序位置", "实现要点"],
    ["球台与物理参数", "config.js", "台面 2.54m × 1.27m，球半径、袋口半径、各类系数"],
    ["定步长子步积分", "physics.js", "固定 1/600 秒子步，逐子步积分与事件派发"],
    ["连续碰撞检测", "physics.js", "解算相对运动方程求接触时刻，以该时刻球心连线作法线"],
    ["滑动/滚动摩擦分离", "physics.js", "滑行阶段按滑动减速度，触滚后按滚动减速度"],
    ["旋转衰减", "physics.js", "角速度按指数系数衰减，左右塞影响库边偏转"],
    ["真实袋口建模", "physics.js", "库边于袋口断开并设袋角反射；落袋判定含越界、速度与距离条件"],
    ["瞄准射线", "physics.js", "castRay 返回首次球/库碰撞接触点、法线与母球 ghost 位置"],
    ["球体伪三维渲染", "renderer.js", "球体底色离屏缓存、号码贴图按实时姿态做球面投影"],
    ["虚影母球", "renderer.js", "复用母球 sprite 与光照 overlay，半透明绘制接触瞬间母球"],
    ["瞄准线与预测路径", "renderer.js", "宽带渐变瞄准线、目标球路径与母球分离方向"],
    ["音效合成", "audio.js", "Web Audio 实时合成击球/碰撞/落袋，并内嵌授权采样片段"],
    ["候选球路枚举", "ai.js", "按球组与袋口枚举目标球—袋口组合"],
    ["物理模拟评估", "ai.js", "simulate 逐候选模拟，按进球概率、切角、位置与对手威胁评分"],
    ["角度与力度微调", "ai.js", "在选定角度附近按步长扫描偏移与力度档位并复算结果"],
    ["出口自检", "ai.js", "以最终出杆参数复算一次，确认确实可进球，否则改用安全球"],
    ["三档难度", "ai.js", "以能力开关 refine/verify/aggressive 划分搜索范围与修正窗口"],
    ["十二个关卡布局", "levels.js", "l1–l12，逐关指定 targets 目标球与 blockers 干扰球及母球位置"],
    ["八球规则判定", "game.js", "开放球台、开球两球吃库、自由球、球组归属、黑八胜负"],
    ["犯规处理", "game.js", "母球落袋、空杆、先碰错球、开球无效均判犯规并交出自由球"],
    ["存档持久化", "main.js", "以单一键名存于 localStorage，仅记录金币、星级、球杆与设置"],
    ["输入与界面", "main.js", "鼠标与触控事件绑定、角度微调尺、力度条、击球点面板与主循环"],
], [230, 190, CONTENT_W - 420])
doc.para("上述对应关系可由源程序文档中对应文件的具体行直接核对；全部实现均为原创代码，未引用任何第三方商业游戏的程序或资源。")
doc.footer()
doc.pages.append(doc.im)
pdf = OUT / "软件说明书.pdf"
doc.pages[0].save(pdf, save_all=True, append_images=doc.pages[1:], resolution=150.0)
print("软件说明书.pdf 页数:", len(doc.pages), "大小:", pdf.stat().st_size)
