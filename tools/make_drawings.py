"""
Caliraya Coffee House — black & white architectural plan set (PDF + DXF).

Generates from tools/layout.json (exported from src/config/layout.ts, the same data the 3D model uses):
  drawings/Caliraya-Coffee-House_Plan-Set.pdf     A3 landscape, 4 sheets
  drawings/dxf/A-00x_*.dxf                        one DXF per sheet, real-world metres (1 unit = 1 m)

Plan convention: +X = East, +Y = North (model -Z). Plan cut ~1.2 m above each finished floor.
Run:  python tools/make_drawings.py
"""
import json
import math
import os
import datetime

import ezdxf
from ezdxf.enums import TextEntityAlignment
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.backends.backend_pdf import PdfPages  # noqa: E402
from matplotlib.patches import Polygon, Circle, Arc  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "drawings")
L = json.load(open(os.path.join(HERE, "layout.json"), encoding="utf-8"))

ISSUE_DATE = "2026-10-25"
PROJECT = "CALIRAYA COFFEE HOUSE"

matplotlib.rcParams["font.family"] = "Arial"
matplotlib.rcParams["pdf.fonttype"] = 42

# ---------------------------------------------------------------- sheet / primitives

PAPER_W, PAPER_H = 420.0, 297.0  # A3 landscape, mm
MARGIN = 10.0
TB_W = 72.0  # title strip width
DA = (MARGIN + 4, MARGIN + 4, PAPER_W - MARGIN - TB_W - 4, PAPER_H - MARGIN - 4)  # drawing area x0,y0,x1,y1

LW = {  # layer -> (lineweight mm, dxf colour)
    "A-WALL": (0.50, 7), "A-WALL-PATT": (0.0, 7), "A-GLAZ": (0.18, 7), "A-DOOR": (0.25, 7), "A-STAIR": (0.25, 7),
    "A-FURN": (0.13, 7), "A-EQPM": (0.18, 7), "A-FIXT": (0.18, 7), "A-FLOR-PATT": (0.09, 7), "A-OVHD": (0.18, 7),
    "A-COLS": (0.35, 7), "A-ROOF": (0.35, 7), "A-ANNO-TEXT": (0.18, 7), "A-ANNO-DIMS": (0.13, 7), "A-GRID": (0.13, 7),
    "A-ANNO-SYMB": (0.25, 7), "G-TTLB": (0.35, 7), "C-SITE": (0.25, 7), "C-PRKG": (0.18, 7), "C-ROAD": (0.25, 7),
    "C-WATR": (0.13, 7), "L-PLNT": (0.13, 7),
}


class Sheet:
    def __init__(self, number, title, scale, center, subtitle=""):
        self.number, self.title, self.scale, self.subtitle = number, title, scale, subtitle
        self.cx, self.cy = center
        self.items = []
        self.dcx = (DA[0] + DA[2]) / 2
        self.dcy = (DA[1] + DA[3]) / 2

    # model (m) <-> paper (mm)
    def m2p(self, x, y):
        k = 1000.0 / self.scale
        return (self.dcx + (x - self.cx) * k, self.dcy + (y - self.cy) * k)

    def p2m(self, px, py):
        k = self.scale / 1000.0
        return (self.cx + (px - self.dcx) * k, self.cy + (py - self.dcy) * k)

    def _add(self, **kw):
        kw.setdefault("space", "model")
        kw.setdefault("ls", "solid")
        kw.setdefault("lw", LW.get(kw.get("layer"), (0.18,))[0])
        self.items.append(kw)

    def poly(self, pts, layer, closed=True, fill=False, **kw):
        self._add(kind="poly", pts=[tuple(p) for p in pts], layer=layer, closed=closed, fill=fill, **kw)

    def rect(self, x0, y0, x1, y1, layer, **kw):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], layer, **kw)

    def line(self, a, b, layer, **kw):
        self._add(kind="poly", pts=[tuple(a), tuple(b)], layer=layer, closed=False, fill=False, **kw)

    def arc(self, c, r, a0, a1, layer, **kw):
        self._add(kind="arc", c=tuple(c), r=r, a0=a0, a1=a1, layer=layer, **kw)

    def circle(self, c, r, layer, fill=False, **kw):
        self._add(kind="circle", c=tuple(c), r=r, layer=layer, fill=fill, **kw)

    def text(self, p, s, h, layer="A-ANNO-TEXT", align="C", rot=0.0, bold=False, **kw):
        # h = cap height in paper mm
        self._add(kind="text", p=tuple(p), s=s, h=h, layer=layer, align=align, rot=rot, bold=bold, **kw)

    def dim(self, p1, p2, off, text=None):
        """Aligned dimension; off (paper mm) to the left of p1->p2."""
        self._add(kind="dim", p1=tuple(p1), p2=tuple(p2), off=off, text=text, layer="A-ANNO-DIMS")


# z (model south) -> plan y (north up)
def P(x, z):
    return (x, -z)


def rectz(s, x0, z0, x1, z1, layer, **kw):
    s.rect(x0, -z1, x1, -z0, layer, **kw)


# ---------------------------------------------------------------- walls

def wall_frame(w):
    a, b = w["a"], w["b"]
    along_x = abs(b[0] - a[0]) > abs(b[1] - a[1])
    length = (b[0] - a[0]) if along_x else (b[1] - a[1])
    start = a[0] if along_x else a[1]
    fixed = a[1] if along_x else a[0]
    return along_x, length, start, fixed


def wall_pt(w, s, n):
    """plan point at along-wall distance s and across-wall offset n (model +normal = +z or +x)."""
    along_x, _, start, fixed = wall_frame(w)
    if along_x:
        return P(start + s, fixed + n)
    return P(fixed + n, start + s)


def wall_rect(w, s0, s1, n0, n1):
    return [wall_pt(w, s0, n0), wall_pt(w, s1, n0), wall_pt(w, s1, n1), wall_pt(w, s0, n1)]


def wall_solids(level):
    rects = []
    for w in L["WALLS"]:
        if w["level"] != level:
            continue
        _, length, _, _ = wall_frame(w)
        t = w["t"]
        cur = 0.0
        for o in sorted(w.get("openings", []), key=lambda o: o["c"]):
            os_, oe = o["c"] - o["w"] / 2, o["c"] + o["w"] / 2
            if os_ > cur:
                rects.append(wall_rect(w, cur, os_, -t / 2, t / 2))
            cur = oe
        if cur < length:
            rects.append(wall_rect(w, cur, length, -t / 2, t / 2))
    return rects


def union_outline(rects):
    """Boundary segments of a union of axis-aligned rectangles (coordinate-compressed grid)."""
    boxes = []
    for r in rects:
        xs, ys = [p[0] for p in r], [p[1] for p in r]
        boxes.append((round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)))
    X = sorted({b[0] for b in boxes} | {b[2] for b in boxes})
    Y = sorted({b[1] for b in boxes} | {b[3] for b in boxes})
    xi = {v: i for i, v in enumerate(X)}
    yi = {v: i for i, v in enumerate(Y)}
    filled = set()
    for b in boxes:
        for i in range(xi[b[0]], xi[b[2]]):
            for j in range(yi[b[1]], yi[b[3]]):
                filled.add((i, j))
    segs = []
    for (i, j) in filled:
        if (i, j - 1) not in filled:
            segs.append(((X[i], Y[j]), (X[i + 1], Y[j])))
        if (i, j + 1) not in filled:
            segs.append(((X[i], Y[j + 1]), (X[i + 1], Y[j + 1])))
        if (i - 1, j) not in filled:
            segs.append(((X[i], Y[j]), (X[i], Y[j + 1])))
        if (i + 1, j) not in filled:
            segs.append(((X[i + 1], Y[j]), (X[i + 1], Y[j + 1])))
    # merge collinear touching segments
    merged = []
    horiz = sorted([s for s in segs if s[0][1] == s[1][1]], key=lambda s: (s[0][1], s[0][0]))
    vert = sorted([s for s in segs if s[0][0] == s[1][0]], key=lambda s: (s[0][0], s[0][1]))
    for group, key in ((horiz, 1), (vert, 0)):
        cur = None
        for s in group:
            if cur and cur[1] == s[0] and cur[0][key] == s[0][key]:
                cur = (cur[0], s[1])
            else:
                if cur:
                    merged.append(cur)
                cur = s
        if cur:
            merged.append(cur)
    return merged


def draw_walls(s, level):
    rects = wall_solids(level)
    for r in rects:
        s.poly(r, "A-WALL-PATT", fill=True, lw=0.0)
    for a, b in union_outline(rects):
        s.line(a, b, "A-WALL")


def draw_openings(s, level):
    ffl = L["FFL0"] if level == 0 else L["FFL1"]
    for w in L["WALLS"]:
        if w["level"] != level:
            continue
        t = w["t"]
        along_x, _, _, _ = wall_frame(w)
        for o in w.get("openings", []):
            os_, oe = o["c"] - o["w"] / 2, o["c"] + o["w"] / 2
            k = o["kind"]
            if k in ("glass", "window"):
                # jamb/sill lines on both faces + double glass line + mullions
                for n in (-t / 2, t / 2):
                    s.line(wall_pt(w, os_, n), wall_pt(w, oe, n), "A-GLAZ", lw=0.13)
                for n in (-0.02, 0.02):
                    s.line(wall_pt(w, os_, n), wall_pt(w, oe, n), "A-GLAZ")
                module = o.get("mullion", o["w"] / 2)
                nmod = max(1, round(o["w"] / module))
                for i in range(nmod + 1):
                    sx = os_ + i * o["w"] / nmod
                    s.line(wall_pt(w, sx, -0.05), wall_pt(w, sx, 0.05), "A-GLAZ", lw=0.25)
                if o.get("capiz"):
                    s.text(wall_pt(w, o["c"], -0.45 if along_x else 0.55), "CAPIZ SCREEN", 1.6, rot=0 if along_x else 90)
            elif k == "slider":
                mid = o["c"]
                for n in (-t / 2, t / 2):
                    s.line(wall_pt(w, os_, n), wall_pt(w, oe, n), "A-GLAZ", lw=0.13)
                s.line(wall_pt(w, os_, -0.035), wall_pt(w, mid + 0.06, -0.035), "A-GLAZ", lw=0.25)
                s.line(wall_pt(w, mid - 0.06, 0.035), wall_pt(w, oe, 0.035), "A-GLAZ", lw=0.25)
                # slide arrow
                a, b = wall_pt(w, mid + 0.25, 0.22 if along_x else -0.22), wall_pt(w, oe - 0.2, 0.22 if along_x else -0.22)
                s.line(a, b, "A-ANNO-SYMB", lw=0.13)
                hx, hy = b[0] - a[0], b[1] - a[1]
                ln = math.hypot(hx, hy) or 1
                ux, uy = hx / ln, hy / ln
                for sgn in (1, -1):
                    s.line(b, (b[0] - ux * 0.15 - uy * 0.08 * sgn, b[1] - uy * 0.15 + ux * 0.08 * sgn), "A-ANNO-SYMB", lw=0.13)
            elif k == "void":
                for n in (-t / 2, t / 2):
                    s.line(wall_pt(w, os_, n), wall_pt(w, oe, n), "A-OVHD", ls="hidden")
                s.text(wall_pt(w, o["c"], 0.0), "PASS", 1.4, rot=90 if not along_x else 0)
            elif k == "door":
                sw = o.get("swing", 1)
                double = o.get("leaf") == "double-glass"
                leaves = [(os_, 1, o["w"] / 2 if double else o["w"])]
                if double:
                    leaves.append((oe, -1, o["w"] / 2))
                for hinge_s, dirn, lw_ in leaves:
                    h = wall_pt(w, hinge_s, 0)
                    closed_end = wall_pt(w, hinge_s + dirn * lw_, 0)
                    open_end = wall_pt(w, hinge_s, sw * lw_)
                    s.line(h, open_end, "A-DOOR", lw=0.35)
                    a0 = math.degrees(math.atan2(closed_end[1] - h[1], closed_end[0] - h[0]))
                    a1 = math.degrees(math.atan2(open_end[1] - h[1], open_end[0] - h[0]))
                    # draw the 90 degree swing the short way round
                    d = (a1 - a0 + 540) % 360 - 180
                    s.arc(h, lw_, min(a0, a0 + d), max(a0, a0 + d), "A-DOOR", lw=0.13)
                # jambs
                for sx in (os_, oe):
                    s.line(wall_pt(w, sx, -t / 2), wall_pt(w, sx, t / 2), "A-DOOR", lw=0.25)
    _ = ffl


# ---------------------------------------------------------------- furniture & symbols

def chair(s, x, z, rot):
    """rot: direction the sitter faces (radians, 0 = +z/south in model)."""
    c, si = math.cos(rot), math.sin(rot)

    def tr(dx, dz):
        return P(x + dx * c + dz * si, z - dx * si + dz * c)

    s.poly([tr(-0.21, -0.21), tr(0.21, -0.21), tr(0.21, 0.21), tr(-0.21, 0.21)], "A-FURN")
    s.line(tr(-0.21, -0.17), tr(0.21, -0.17), "A-FURN", lw=0.09)


def table(s, x, z, w, d, round_=False):
    if round_:
        s.circle(P(x, z), w / 2, "A-FURN")
    else:
        rectz(s, x - w / 2, z - d / 2, x + w / 2, z + d / 2, "A-FURN")


def table_set(s, x, z, seats, w=None, d=None, round_=False, rot=False):
    W = w or (0.7 if seats == 2 else 0.85 if seats == 4 else 2.4)
    D = d or (0.7 if seats == 2 else 0.85 if seats == 4 else 0.9)
    if rot:
        W, D = D, W
    table(s, x, z, W, D, round_)
    if round_ and seats == 4:
        for i in range(4):
            a = i * math.pi / 2 + math.pi / 4
            r = W / 2 + 0.2
            chair(s, x + math.sin(a) * r, z + math.cos(a) * r, a + math.pi)
        return
    if seats == 2:
        if rot:
            chair(s, x - W / 2 - 0.22, z, math.pi / 2)
            chair(s, x + W / 2 + 0.22, z, -math.pi / 2)
        else:
            chair(s, x, z - D / 2 - 0.22, 0)
            chair(s, x, z + D / 2 + 0.22, math.pi)
    elif seats == 4:
        chair(s, x, z - D / 2 - 0.22, 0)
        chair(s, x, z + D / 2 + 0.22, math.pi)
        chair(s, x - W / 2 - 0.22, z, math.pi / 2)
        chair(s, x + W / 2 + 0.22, z, -math.pi / 2)
    else:  # 8 seats on a long table
        long_x = W > D
        per = seats // 2 - 1
        for i in range(per):
            if long_x:
                px = x - W / 2 + (i + 0.5) / per * W
                chair(s, px, z - D / 2 - 0.22, 0)
                chair(s, px, z + D / 2 + 0.22, math.pi)
            else:
                pz = z - D / 2 + (i + 0.5) / per * D
                chair(s, x - W / 2 - 0.22, pz, math.pi / 2)
                chair(s, x + W / 2 + 0.22, pz, -math.pi / 2)
        if long_x:
            chair(s, x - W / 2 - 0.25, z, math.pi / 2)
            chair(s, x + W / 2 + 0.25, z, -math.pi / 2)
        else:
            chair(s, x, z - D / 2 - 0.25, 0)
            chair(s, x, z + D / 2 + 0.25, math.pi)


def sofa(s, x, z, w, facing_south=True):
    d = 0.85
    rectz(s, x - w / 2, z - d / 2, x + w / 2, z + d / 2, "A-FURN")
    back = z - d / 2 + 0.18 if facing_south else z + d / 2 - 0.18
    s.line(P(x - w / 2 + 0.15, back), P(x + w / 2 - 0.15, back), "A-FURN", lw=0.09)
    for sx in (x - w / 2 + 0.15, x + w / 2 - 0.15):
        s.line(P(sx, z - d / 2), P(sx, z + d / 2), "A-FURN", lw=0.09)


def armchair(s, x, z):
    rectz(s, x - 0.39, z - 0.39, x + 0.39, z + 0.39, "A-FURN")
    rectz(s, x - 0.28, z - 0.28, x + 0.28, z + 0.28, "A-FURN", lw=0.09)


def planter(s, x, z, r=0.25):
    s.circle(P(x, z), r, "A-FURN")
    s.circle(P(x, z), r * 0.55, "A-FURN", lw=0.09)


def label_box(s, x0, z0, x1, z1, txt, layer="A-EQPM", h=1.3):
    rectz(s, x0, z0, x1, z1, layer)
    w, d = abs(x1 - x0), abs(z1 - z0)
    rot = 90 if d > w * 1.6 and d > 0.9 else 0
    s.text(P((x0 + x1) / 2, (z0 + z1) / 2), txt, h, rot=rot)


def floor_grid(s, x0, z0, x1, z1, step=0.6):
    x = x0 + step
    while x < x1 - 1e-6:
        s.line(P(x, z0), P(x, z1), "A-FLOR-PATT")
        x += step
    z = z0 + step
    while z < z1 - 1e-6:
        s.line(P(x0, z), P(x1, z), "A-FLOR-PATT")
        z += step


def boards(s, x0, z0, x1, z1, step=0.3):
    z = z0 + step
    while z < z1 - 1e-6:
        s.line(P(x0, z), P(x1, z), "A-FLOR-PATT")
        z += step


def arrow(s, a, b, layer="A-ANNO-SYMB", head=0.25, lw=0.25):
    s.line(a, b, layer, lw=lw)
    dx, dy = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(dx, dy) or 1
    ux, uy = dx / ln, dy / ln
    s.poly([b, (b[0] - ux * head - uy * head * 0.4, b[1] - uy * head + ux * head * 0.4),
            (b[0] - ux * head + uy * head * 0.4, b[1] - uy * head - ux * head * 0.4)], layer, fill=True, lw=0.0)


def room_tag(s, room, show_area=True, h=2.2, dy=0.0):
    r = room["rect"]
    lx, lz = room.get("label") or ((r["x0"] + r["x1"]) / 2, (r["z0"] + r["z1"]) / 2)
    area = abs((r["x1"] - r["x0"]) * (r["z1"] - r["z0"]))
    name = room["name"].upper()
    k = s.scale / 1000.0
    s.text(P(lx, lz - dy), name, h, bold=True)
    if show_area:
        s.text(P(lx, lz - dy + h * 1.9 * k), f"{area:.1f} m²", h * 0.8)


def level_tag(s, x, z, txt):
    p = P(x, z)
    k = s.scale / 1000.0
    s.poly([(p[0] - 1.2 * k, p[1]), (p[0] + 1.2 * k, p[1]), (p[0], p[1] - 1.8 * k)], "A-ANNO-SYMB", fill=True, lw=0)
    s.text((p[0] + 2.0 * k, p[1] - 0.6 * k), txt, 1.6, align="L")


def grid(s, xs, zs, labels_x, labels_z, extent):
    """Structural / setting-out grid with bubbles."""
    xmin, zmin, xmax, zmax = extent
    k = s.scale / 1000.0
    rb = 3.2 * k
    for x, lab in zip(xs, labels_x):
        s.line(P(x, zmin), P(x, zmax), "A-GRID", ls="center")
        for zz, sgn in ((zmin, -1), (zmax, 1)):
            c = P(x, zz + sgn * rb)
            s.circle(c, rb, "A-GRID", lw=0.18)
            s.text(c, lab, 2.4)
    for z, lab in zip(zs, labels_z):
        s.line(P(xmin, z), P(xmax, z), "A-GRID", ls="center")
        for xx, sgn in ((xmin, -1), (xmax, 1)):
            c = P(xx + sgn * rb, z)
            s.circle(c, rb, "A-GRID", lw=0.18)
            s.text(c, lab, 2.4)


def stair_plan(s, level):
    st = L["STAIR"]
    x0, z0, z1 = st["x0"], st["z0"], st["z1"]
    going, n = st["going"], st["risers"]
    cut = 9  # tread index where the plan cut crosses the stair
    for i in range(n):
        x = x0 + i * going
        if level == 0:
            ls = "solid" if i <= cut else "hidden"
            s.line(P(x, z0), P(x, z1), "A-STAIR", lw=0.18, ls=ls)
        else:
            s.line(P(x, z0), P(x, z1), "A-STAIR", lw=0.13)
    xe = x0 + (n - 1) * going
    for z in (z0, z1):
        s.line(P(x0, z), P(xe, z), "A-STAIR", lw=0.18)
    s.line(P(x0, z1 - 0.05), P(xe, z1 - 0.05), "A-STAIR", lw=0.13)  # handrail
    zc = (z0 + z1) / 2
    if level == 0:
        xc = x0 + (cut + 0.5) * going
        s.line(P(xc - 0.35, z1 + 0.05), P(xc + 0.35, z0 - 0.05), "A-STAIR", lw=0.25)  # break line
        arrow(s, P(x0 + 0.1, zc), P(xc - 0.15, zc), head=0.22, lw=0.18)
        s.text(P(x0 - 0.2, zc), "UP", 1.8, align="R", bold=True)
        s.text(P(x0 + 1.8, zc + 0.85), f"{n}R @ {st['rise'] * 1000:.0f} / T {going * 1000:.0f}", 1.5)
    else:
        arrow(s, P(xe - 0.1, zc), P(x0 + 0.3, zc), head=0.22, lw=0.18)
        s.text(P(xe + 0.25, zc), "DN", 1.8, align="L", bold=True)


# ---------------------------------------------------------------- shared pieces

GRID_X = [-8, -2.5, 3, 5.5, 8]
GRID_XL = ["1", "2", "3", "4", "5"]
GRID_Z = [-6, 0, 2.4, 6]
GRID_ZL = ["A", "B", "C", "D"]


def dims_building(s, level):
    k = s.scale / 1000.0
    north = 6  # +y edge in plan
    # chain along the north face (grid spacing) + overall
    for a, b in zip(GRID_X[:-1], GRID_X[1:]):
        s.dim(P(a, -6.0), P(b, -6.0), off=-14)
    s.dim(P(-8, -6.0), P(8, -6.0), off=-22)
    # chain along the east face (grid spacing) + overall
    for a, b in zip(GRID_Z[:-1], GRID_Z[1:]):
        s.dim(P(8.0, a), P(8.0, b), off=-14)
    s.dim(P(8.0, -6), P(8.0, 6), off=-22)
    if level == 0:
        s.dim(P(-14, 7.5), P(-8, 7.5), off=12, text="DECK 6.00")
        s.dim(P(L["STAIR"]["x0"], -4.6), P(L["STAIR"]["x1"], -4.6), off=6)
    else:
        s.dim(P(L["BALCONY"]["x0"], 6.0), P(-8, 6.0), off=10)
    _ = (k, north)


def north_arrow(s, px, py, size=9.0):
    """paper-space north arrow at (px,py) mm."""
    r = size / 2
    s.circle((px, py), r, "A-ANNO-SYMB", space="paper", lw=0.25)
    s.poly([(px, py + r * 1.25), (px - r * 0.45, py - r * 0.6), (px, py - r * 0.2)], "A-ANNO-SYMB", space="paper", fill=True, lw=0.0)
    s.poly([(px, py + r * 1.25), (px + r * 0.45, py - r * 0.6), (px, py - r * 0.2)], "A-ANNO-SYMB", space="paper", lw=0.25)
    s.text((px, py + r * 1.25 + 3.2), "N", 3.0, space="paper", bold=True)


def scale_bar(s, px, py, total_m, step_m):
    k = 1000.0 / s.scale  # mm per metre
    n = int(round(total_m / step_m))
    for i in range(n):
        x0 = px + i * step_m * k
        s.rect(x0, py, x0 + step_m * k, py + 1.6, "A-ANNO-SYMB", space="paper", fill=(i % 2 == 0), lw=0.18)
        s.text((x0, py - 2.4), f"{i * step_m:g}", 1.6, space="paper")
    s.text((px + n * step_m * k, py - 2.4), f"{total_m:g} m", 1.6, space="paper")
    s.text((px, py + 4.2), f"SCALE 1:{s.scale} @ A3", 1.8, space="paper", align="L", bold=True)


def title_block(s, sheet_no, sheet_total):
    x0, y0, x1, y1 = PAPER_W - MARGIN - TB_W, MARGIN, PAPER_W - MARGIN, PAPER_H - MARGIN
    sp = dict(space="paper")
    s.rect(MARGIN, MARGIN, PAPER_W - MARGIN, PAPER_H - MARGIN, "G-TTLB", lw=0.5, **sp)
    s.line((x0, y0), (x0, y1), "G-TTLB", lw=0.5, **sp)
    cx = (x0 + x1) / 2
    y = y1 - 9
    s.text((cx, y), PROJECT, 3.6, bold=True, **sp)
    s.text((cx, y - 6), "Two-storey lakeside café", 2.0, **sp)
    s.text((cx, y - 10.5), "Caliraya, Lumban–Cavinti, Laguna, Philippines", 1.7, **sp)
    s.line((x0, y - 15), (x1, y - 15), "G-TTLB", lw=0.25, **sp)
    # status box
    by = y - 29
    s.rect(x0 + 4, by, x1 - 4, by + 10, "G-TTLB", lw=0.5, **sp)
    s.text((cx, by + 6.3), "CONCEPTUAL DESIGN", 2.6, bold=True, **sp)
    s.text((cx, by + 2.5), "NOT FOR CONSTRUCTION", 2.0, bold=True, **sp)
    # notes
    notes = [
        "NOTES",
        "1. All dimensions in metres unless noted.",
        "2. Dimensions are preliminary design values,",
        "    not verified site measurements.",
        "3. Levels relative to site datum ±0.00:",
        "    GF FFL +0.15 · 2F FFL +3.75 · eave +7.15.",
        "4. Verify all dimensions on site. Topographic",
        "    survey, structural, MEPFS & fire design",
        "    by licensed professionals required.",
        "5. Plan cut approx. 1.20 m above floor.",
    ]
    ny = by - 7
    for i, n in enumerate(notes):
        s.text((x0 + 4, ny - i * 3.6), n, 1.55 if i else 1.9, align="L", bold=(i == 0), **sp)
    # legend
    ly = ny - len(notes) * 3.6 - 6
    s.text((x0 + 4, ly), "LEGEND", 1.9, align="L", bold=True, **sp)
    items = [("wall", "Wall (cut)"), ("glass", "Glazing / window"), ("door", "Door swing"), ("ovhd", "Overhead / beyond"), ("grid", "Setting-out grid")]
    for i, (kind, lab) in enumerate(items):
        yy = ly - 5 - i * 4.4
        lx0, lx1 = x0 + 5, x0 + 15
        if kind == "wall":
            s.rect(lx0, yy - 1, lx1, yy + 1, "G-TTLB", fill=True, lw=0.0, **sp)
        elif kind == "glass":
            for d in (-1.0, -0.3, 0.3, 1.0):
                s.line((lx0, yy + d), (lx1, yy + d), "G-TTLB", lw=0.13, **sp)
        elif kind == "door":
            s.line((lx0, yy - 1.5), (lx0, yy + 2.0), "G-TTLB", lw=0.35, **sp)
            s.arc((lx0, yy - 1.5), 3.5, 0, 90, "G-TTLB", lw=0.13, **sp)
        elif kind == "ovhd":
            s.line((lx0, yy), (lx1, yy), "G-TTLB", lw=0.18, ls="dashed", **sp)
        else:
            s.line((lx0, yy), (lx1, yy), "G-TTLB", lw=0.13, ls="center", **sp)
        s.text((x0 + 19, yy), lab, 1.55, align="L", **sp)
    # revisions
    ry = y0 + 52
    s.line((x0, ry + 8), (x1, ry + 8), "G-TTLB", lw=0.25, **sp)
    s.text((x0 + 4, ry + 4.5), "REV", 1.5, align="L", bold=True, **sp)
    s.text((x0 + 13, ry + 4.5), "DATE", 1.5, align="L", bold=True, **sp)
    s.text((x0 + 33, ry + 4.5), "DESCRIPTION", 1.5, align="L", bold=True, **sp)
    s.text((x0 + 4, ry + 0.5), "A", 1.5, align="L", **sp)
    s.text((x0 + 13, ry + 0.5), ISSUE_DATE, 1.5, align="L", **sp)
    s.text((x0 + 33, ry + 0.5), "Concept issue", 1.5, align="L", **sp)
    # sheet info
    s.line((x0, y0 + 46), (x1, y0 + 46), "G-TTLB", lw=0.25, **sp)
    s.text((x0 + 4, y0 + 41), "SHEET TITLE", 1.4, align="L", **sp)
    s.text((x0 + 4, y0 + 35.5), s.title, 2.6, align="L", bold=True, **sp)
    if s.subtitle:
        s.text((x0 + 4, y0 + 31.3), s.subtitle, 1.5, align="L", **sp)
    s.line((x0, y0 + 27), (x1, y0 + 27), "G-TTLB", lw=0.25, **sp)
    cells = [("SCALE", f"1:{s.scale} @ A3"), ("DATE", ISSUE_DATE), ("DRAWN", "—"), ("CHECKED", "—")]
    for i, (a, b) in enumerate(cells):
        cxl = x0 + 4 + (i % 2) * 34
        cyl = y0 + 22.5 - (i // 2) * 8
        s.text((cxl, cyl), a, 1.3, align="L", **sp)
        s.text((cxl, cyl - 3.6), b, 1.9, align="L", bold=True, **sp)
    s.line((x0, y0 + 11), (x1, y0 + 11), "G-TTLB", lw=0.25, **sp)
    s.text((x0 + 4, y0 + 5.5), "SHEET", 1.4, align="L", **sp)
    s.text((x1 - 4, y0 + 5.2), sheet_no, 4.2, align="R", bold=True, **sp)
    s.text((x0 + 4, y0 + 2.2), f"{sheet_total}", 1.4, align="L", **sp)


# ---------------------------------------------------------------- data copied from the 3D scene

ROOM = {r["id"]: r for r in L["ROOMS"]}


def gf_contents(s):
    st = L["STAIR"]
    # deck & boards
    D = L["DECK"]
    rectz(s, D["x0"], D["z0"], D["x1"] - 0.1, D["z1"], "C-SITE")
    boards(s, D["x0"], D["z0"], D["x1"] - 0.1, D["z1"])
    rectz(s, D["x0"] - 0.4, D["z0"] + 4, D["x0"], D["z1"] - 4, "C-SITE")  # step
    s.text(P(D["x0"] - 0.95, 0), "STEP", 1.3, rot=90)
    # plaza / walks
    PZ = L["PLAZA"]
    s.poly([P(PZ["x0"], 6.1), P(PZ["x0"], PZ["z1"]), P(PZ["x1"], PZ["z1"]), P(PZ["x1"], 6.1)], "C-SITE", closed=False)
    s.line(P(-14.2, 9.1), P(-8, 9.1), "C-SITE")
    # floor patterns (wet / service areas)
    for rid in ("kitchen", "cr", "storage", "utility"):
        r = ROOM[rid]["rect"]
        floor_grid(s, r["x0"] + 0.07, r["z0"] + 0.07, r["x1"] - 0.07, r["z1"] - 0.07)
    # stair + under-stair planter
    stair_plan(s, 0)
    # dining furniture
    rectz(s, -7.85, -5.9, -3.0, -5.35, "A-FURN")  # banquette
    for x in (-7.0, -5.4, -3.8):
        table(s, x, -4.95, 0.7, 0.6)
        chair(s, x, -4.38, math.pi)
    table_set(s, -6.5, -2.75, 4)
    table_set(s, -4.3, -2.75, 4)
    table_set(s, -7.1, 1.9, 2, rot=True)
    table_set(s, -4.6, 2.0, 4, w=0.9, round_=True)
    table_set(s, -2.6, 2.0, 2, w=0.65, d=0.65, round_=True)
    rectz(s, -7.6, 3.3, -4.4, 5.7, "A-FURN", ls="hidden", lw=0.09)  # rug
    sofa(s, -6.0, 5.35, 2.3, facing_south=False)
    armchair(s, -6.9, 3.55)
    armchair(s, -5.1, 3.55)
    rectz(s, -6.55, 4.15, -5.45, 4.75, "A-FURN")
    for x, z in ((-7.55, 3.0), (-2.75, 5.55), (0.75, 5.6), (-7.55, -1.6)):
        planter(s, x, z)
    rectz(s, 0.75, 2.8, 2.85, 3.25, "A-FURN")  # bench
    # coffee bar
    s.poly([P(0.38, -3.95), P(0.38, 2.4), P(2.3, 2.4), P(2.3, 1.6), P(1.25, 1.6), P(1.25, -3.95)], "A-EQPM")
    s.text(P(0.82, -1.0), "SERVICE COUNTER", 1.3, rot=90)
    rectz(s, 0.58, -2.95, 1.13, -2.17, "A-EQPM", lw=0.13)
    s.text(P(0.86, -2.56), "EM", 1.1)
    for z in (-1.75, -1.45):
        s.circle(P(0.86, z), 0.09, "A-EQPM", lw=0.13)
    rectz(s, 0.57, 0.45, 1.07, 1.45, "A-EQPM", lw=0.13)
    s.text(P(0.82, 0.95), "DISPLAY", 1.0, rot=90)
    rectz(s, 2.26, -3.62, 2.93, -0.08, "A-EQPM")
    s.text(P(2.6, -1.85), "BACK BAR", 1.2, rot=90)
    rectz(s, 2.45, -1.2, 2.85, -0.75, "A-FIXT", lw=0.13)
    # kitchen
    label_box(s, 4.0, -5.9, 5.6, -5.2, "3-COMP SINK")
    for i in range(3):
        rectz(s, 4.06 + i * 0.52, -5.8, 4.5 + i * 0.52, -5.3, "A-FIXT", lw=0.13)
    label_box(s, 5.6, -5.9, 6.2, -5.25, "DW", h=1.1)
    label_box(s, 6.2, -5.9, 7.1, -5.15, "", h=1.1)
    for x in (6.42, 6.88):
        for z in (-5.7, -5.35):
            s.circle(P(x, z), 0.1, "A-EQPM", lw=0.13)
    label_box(s, 7.1, -5.9, 7.9, -5.15, "FRYER", h=1.0)
    rectz(s, 6.1, -5.9, 7.9, -4.95, "A-OVHD", ls="dashed")
    s.text(P(7.0, -4.75), "HOOD OVER", 1.1)
    label_box(s, 3.1, -5.88, 3.88, -5.05, "FRZ", h=1.2)
    rectz(s, 3.1, -4.95, 3.45, -4.75, "A-FIXT", lw=0.13)
    label_box(s, 5.0, -0.88, 6.3, -0.1, "REF", h=1.2)
    label_box(s, 6.4, -0.85, 7.3, -0.1, "U/C FRZ", h=1.0)
    label_box(s, 3.1, -3.4, 3.78, -0.2, "PASS / PREP")
    label_box(s, 4.7, -3.6, 6.3, -2.4, "PREP ISLAND")
    label_box(s, 7.2, -5.1, 7.9, -3.45, "PREP")
    label_box(s, 7.45, -1.9, 7.9, -0.95, "SHELF", h=1.0)
    # storage
    label_box(s, 3.2, 1.85, 5.3, 2.3, "SHELVING", h=1.1)
    label_box(s, 4.6, 0.15, 5.35, 0.65, "PALLET", h=0.9)
    # accessible CR
    rectz(s, 5.2, 5.24, 5.43, 5.62, "A-FIXT")
    bowl = [P(5.0 + 0.27 * math.cos(a), 5.42 + 0.19 * math.sin(a)) for a in [i * math.pi / 16 for i in range(33)]]
    s.poly(bowl, "A-FIXT")
    rectz(s, 3.75, 2.47, 4.35, 2.95, "A-FIXT")
    s.circle(P(4.05, 2.72), 0.17, "A-FIXT", lw=0.13)
    s.line(P(4.4, 5.84), P(5.3, 5.84), "A-FIXT", lw=0.35)
    s.line(P(4.6, 4.95), P(5.3, 4.95), "A-FIXT", lw=0.35)
    s.circle(P(4.25, 4.15), 0.75, "A-FIXT", ls="hidden", lw=0.09)
    s.text(P(4.25, 4.85), "Ø1.50 TURNING", 1.1)
    s.text(P(4.05, 3.2), "LAV", 1.1)
    s.text(P(4.85, 5.45), "WC", 1.1)
    rectz(s, 3.07, 4.8, 3.2, 5.6, "A-FIXT", lw=0.13)
    # utility
    for i in range(6):
        rectz(s, 5.65 + i * 0.36, 5.45, 5.99 + i * 0.36, 5.9, "A-FURN")
    s.text(P(6.7, 5.25), "LOCKERS", 1.1)
    label_box(s, 6.8, 0.07, 7.4, 0.3, "DB", h=0.9)
    s.circle(P(7.6, 0.5), 0.25, "A-EQPM")
    s.text(P(7.6, 0.5), "WH", 0.9)
    table_set(s, 6.7, 3.0, 2, rot=True)
    label_box(s, 5.6, 0.15, 6.2, 0.65, "MOP", h=0.9)
    label_box(s, 7.52, 1.5, 7.88, 2.5, "SHELF", h=0.9)
    # deck & plaza furniture
    for z in (-4.4, -2.6, 2.6, 4.4):
        table_set(s, -9.6, z, 2, rot=True)
    for z in (-5.3, -1.9, 1.9, 5.3):
        table_set(s, -12.6, z, 4, w=0.9, round_=True)
    for z in (-5.3, 5.3):
        s.circle(P(-12.6, z), 1.45, "A-OVHD", ls="dashed", lw=0.13)
    armchair(s, -13.2, 0)
    for x in (-6.6, -4.3):
        table_set(s, x, 8.6, 4, w=0.8, round_=True)
        s.circle(P(x, 8.6), 1.45, "A-OVHD", ls="dashed", lw=0.13)
    rectz(s, 2.4, 9.6, 5.6, 10.0, "A-FURN")
    for x in (-7.5, 9.5):
        rectz(s, x - 0.6, 6.4, x + 0.6, 7.6, "A-FURN")
        planter(s, x, 7.0, 0.35)
    # overhead elements
    B = L["BALCONY"]
    rectz(s, B["x0"], B["z0"], B["x1"], B["z1"], "A-OVHD", ls="dashed")
    s.text(P(-9.4, -6.6), "BALCONY OVER", 1.5)
    rectz(s, -3.4, 6.1, 1.4, 8.2, "A-OVHD", ls="dashed")
    s.text(P(-1.0, 8.0), "CANOPY OVER", 1.4)
    R = L["ROOF"]
    rectz(s, R["x0"], R["z0"], R["x1"], R["z1"], "A-OVHD", ls="dashed", lw=0.13)
    for z in (-5.8, 0, 5.8):
        rectz(s, -10.63, z - 0.08, -10.47, z + 0.08, "A-COLS", fill=True, lw=0.0)
    # entrance & levels
    arrow(s, P(-1.0, 11.6), P(-1.0, 6.6), head=0.35, lw=0.35)
    s.text(P(-1.0, 12.1), "MAIN ENTRANCE", 1.8, bold=True)
    arrow(s, P(9.9, -2.5), P(8.3, -2.5), head=0.3, lw=0.25)
    s.text(P(10.0, -1.9), "SERVICE", 1.4, align="L")
    level_tag(s, -1.2, 1.2, "FFL +0.15")
    level_tag(s, -11.0, 6.9, "DECK +0.15")
    level_tag(s, 4.2, 9.4, "PLAZA ±0.00")
    _ = st


def uf_contents(s):
    # stair seen through the void
    stair_plan(s, 1)
    v = L["STAIR_VOID"]
    rectz(s, v["x0"], v["z0"], v["x1"], v["z1"], "A-OVHD", lw=0.18)
    # void guardrails (glass)
    for a, b in ((P(v["x0"], v["z1"] + 0.04), P(v["x1"], v["z1"] + 0.04)), (P(v["x0"] + 0.04, -5.9), P(v["x0"] + 0.04, v["z1"]))):
        s.line(a, b, "A-GLAZ", lw=0.35)
    s.text(P(-0.2, -4.35), "GLASS GUARD H 1.05", 1.2)
    # floor finishes: balcony deck boards
    B = L["BALCONY"]
    boards(s, B["x0"] + 0.06, B["z0"] + 0.06, -8.1, B["z1"] - 0.06)
    # balcony slab edge + glass rail
    rectz(s, B["x0"] - 0.05, B["z0"] - 0.05, -8.1, B["z1"] + 0.05, "C-SITE", lw=0.35)
    for a, b in ((P(B["x0"] + 0.06, -5.95), P(B["x0"] + 0.06, 5.95)), (P(B["x0"] + 0.06, -5.95), P(-8.12, -5.95)), (P(B["x0"] + 0.06, 5.95), P(-8.12, 5.95))):
        s.line(a, b, "A-GLAZ", lw=0.35)
    for z in (-5.8, 0, 5.8):
        rectz(s, -10.63, z - 0.08, -10.47, z + 0.08, "A-COLS", fill=True, lw=0.0)
    # east facade fins
    for i in range(30):
        z = -5.8 + i * 0.4
        rectz(s, 8.12, z - 0.025, 8.36, z + 0.025, "A-FURN", lw=0.09)
    s.text(P(9.0, 4.2), "TIMBER FINS", 1.2, rot=90)
    # furniture
    rectz(s, -7.6, -5.875, -5.0, -5.525, "A-FURN")
    s.text(P(-6.3, -5.7), "BOOKSHELF", 1.0)
    armchair(s, -7.2, -4.4)
    armchair(s, -5.4, -4.4)
    s.circle(P(-6.3, -4.0), 0.27, "A-FURN")
    table_set(s, -4.6, -0.1, 8, w=2.8, d=1.0)
    for x in (-6.8, -4.6, -2.4, -0.2, 2.0):
        table_set(s, x, 5.05, 2, rot=True)
    rectz(s, -0.7, -2.8, 2.3, -0.2, "A-FURN", ls="hidden", lw=0.09)
    sofa(s, 0.8, -2.55, 2.2, facing_south=True)
    sofa(s, 0.8, -0.45, 2.2, facing_south=False)
    rectz(s, 0.2, -1.8, 1.4, -1.2, "A-FURN")
    armchair(s, -0.9, -1.5)
    table_set(s, -1.6, 2.6, 4, w=0.9, round_=True)
    table_set(s, 1.4, 2.6, 4)
    for x, z in ((3.9, 5.5), (-7.6, 3.6), (-7.55, -2.0), (3.1, -2.2), (4.95, -5.5)):
        planter(s, x, z)
    # function room
    table_set(s, 6.3, -3.0, 8, w=1.0, d=2.6)
    label_box(s, 5.3, -0.6, 7.3, -0.14, "CREDENZA / SCREEN", layer="A-FURN", h=1.0)
    # self-service station
    label_box(s, 4.72, 0.07, 7.92, 0.73, "SELF-SERVICE COUNTER", h=1.1)
    # reading nook
    label_box(s, 4.9, 2.425, 7.7, 2.775, "LOW SHELF", layer="A-FURN", h=1.0)
    armchair(s, 5.4, 4.3)
    armchair(s, 7.2, 4.6)
    s.circle(P(6.3, 4.4), 0.25, "A-FURN")
    # balcony
    rectz(s, -10.62, -5.3, -10.3, 5.3, "A-FURN")
    s.text(P(-10.46, -2.3), "BAR LEDGE", 1.0, rot=90)
    for z in (-4.6, -3.7, -2.8, -1.9, 1.9, 2.8, 3.7, 4.6):
        s.circle(P(-10.0, z), 0.18, "A-FURN")
    armchair(s, -9.6, -0.65)
    armchair(s, -9.6, 0.75)
    # roof over
    R = L["ROOF"]
    rectz(s, R["x0"], R["z0"], R["x1"], R["z1"], "A-OVHD", ls="dashed", lw=0.13)
    s.text(P(R["x0"] + 0.35, 0), "ROOF EAVE OVER", 1.3, rot=90)
    level_tag(s, -1.2, 1.2, "FFL +3.75")
    level_tag(s, -9.4, 2.3, "BALCONY +3.73")


# ---------------------------------------------------------------- sheets

def sheet_ground():
    s = Sheet("A-101", "GROUND FLOOR PLAN", 100, center=(-2.6, -1.2), subtitle="Café, coffee bar, kitchen, CR & service")
    grid(s, GRID_X, GRID_Z, GRID_XL, GRID_ZL, (-16.0, -9.6, 11.4, 7.8))
    draw_walls(s, 0)
    draw_openings(s, 0)
    gf_contents(s)
    for rid in ("dining", "bar", "hall", "kitchen", "storage", "cr", "utility", "deck"):
        r = ROOM[rid]
        if rid == "dining":
            r = dict(r, label=[-3.9, 0.15])
        if rid == "deck":
            r = dict(r, label=[-11.2, 0.15])
        if rid == "bar":
            r = dict(r, label=[1.78, -4.25])
        if rid == "kitchen":
            r = dict(r, label=[5.5, -1.65])
        if rid == "utility":
            r = dict(r, label=[6.75, 4.25])
        room_tag(s, r, h=1.9 if rid in ("storage", "cr", "hall", "utility", "bar") else 2.3)
    dims_building(s, 0)
    north_arrow(s, DA[0] + 10, DA[3] - 14)
    scale_bar(s, DA[0] + 4, DA[1] + 6, 10, 2)
    return s


def sheet_upper():
    s = Sheet("A-102", "SECOND FLOOR PLAN", 100, center=(-2.6, -1.2), subtitle="Upper lounge, function room & sunset balcony")
    grid(s, GRID_X, GRID_Z, GRID_XL, GRID_ZL, (-16.0, -9.6, 11.4, 7.8))
    draw_walls(s, 1)
    draw_openings(s, 1)
    uf_contents(s)
    for rid in ("lounge2", "group", "station", "nook", "balcony"):
        r = ROOM[rid]
        if rid == "lounge2":
            r = dict(r, label=[-4.0, 2.3])
        if rid == "group":
            r = dict(r, label=[6.3, -4.9])
        if rid == "station":
            r = dict(r, label=[6.3, 1.55])
        if rid == "nook":
            r = dict(r, label=[6.3, 5.3])
        if rid == "balcony":
            r = dict(r, label=[-9.3, -3.0])
        room_tag(s, r, h=1.9 if rid in ("station", "nook", "group", "balcony") else 2.3)
    dims_building(s, 1)
    north_arrow(s, DA[0] + 10, DA[3] - 14)
    scale_bar(s, DA[0] + 4, DA[1] + 6, 10, 2)
    return s


def sheet_roof():
    s = Sheet("A-103", "ROOF PLAN", 100, center=(-2.6, -1.2), subtitle="Hip roof, standing-seam metal, 17° pitch")
    R = L["ROOF"]
    grid(s, GRID_X, GRID_Z, GRID_XL, GRID_ZL, (-16.0, -9.6, 11.4, 7.8))
    x0, x1, z0, z1 = R["x0"], R["x1"], R["z0"], R["z1"]
    d = (z1 - z0) / 2
    zc = (z0 + z1) / 2
    xa, xb = x0 + d, x1 - d
    rectz(s, x0, z0, x1, z1, "A-ROOF", lw=0.5)
    s.line(P(xa, zc), P(xb, zc), "A-ROOF", lw=0.35)
    for cx_, cz_, ex in ((x0, z0, xa), (x0, z1, xa), (x1, z0, xb), (x1, z1, xb)):
        s.line(P(cx_, cz_), P(ex, zc), "A-ROOF", lw=0.35)
    # standing seams (indicative, 0.5 m) on the two long slopes
    x = x0 + 0.5
    while x < x1 - 0.2:
        for za, zb in ((z0, zc), (zc, z1)):
            # clip each seam to the slope polygon (trapezoid between hips)
            t0 = max(0.0, min(1.0, (x - x0) / d)) if x < xa else 1.0
            t1 = max(0.0, min(1.0, (x1 - x) / d)) if x > xb else 1.0
            reach = min(t0, t1) * d
            if za == z0:
                s.line(P(x, z0), P(x, z0 + reach), "A-FLOR-PATT")
            else:
                s.line(P(x, z1), P(x, z1 - reach), "A-FLOR-PATT")
        x += 0.5
    # gutters & downpipes
    for z in (z0 - 0.11, z1 + 0.11):
        s.line(P(x0, z), P(x1, z), "A-ROOF", lw=0.18)
    for x_, z_ in ((8.15, 6.15), (8.15, -6.15)):
        s.circle(P(x_, z_), 0.05, "A-ROOF", lw=0.25)
    s.text(P(9.1, 6.9), "DP", 1.3)
    s.text(P(9.1, -6.9), "DP", 1.3)
    # walls below
    for r in wall_solids(1):
        xs, ys = [p[0] for p in r], [p[1] for p in r]
        s.rect(min(xs), min(ys), max(xs), max(ys), "A-OVHD", ls="hidden", lw=0.09)
    # slope arrows
    for a, b in ((P(-1.0, -1.8), P(-1.0, -6.3)), (P(-1.0, 1.8), P(-1.0, 6.3)), (P(x0 + 1.2, 0.0), P(x0 + 4.5, 0.0)), (P(x1 - 1.2, 0.0), P(x1 - 4.5, 0.0))):
        arrow(s, b, a, head=0.3, lw=0.25)
    s.text(P(-0.3, -4.0), "FALL", 1.4, align="L")
    s.text(P(-0.3, 4.0), "FALL", 1.4, align="L")
    s.text(P((xa + xb) / 2, zc - 0.5), "RIDGE +9.52 (approx.)", 1.5)
    s.text(P(-1.0, -3.2), "STANDING-SEAM METAL ROOF · 17°", 1.8, bold=True)
    s.text(P(-1.0, 3.2), "TIMBER FASCIA · VENTED TIMBER SOFFIT", 1.5)
    s.text(P(-9.6, 4.6), "BALCONY", 1.4)
    # dims
    s.dim(P(x0, z0), P(x1, z0), off=-16, text=f"{x1 - x0:.2f}")
    s.dim(P(x1, z0), P(x1, z1), off=-12, text=f"{z1 - z0:.2f}")
    s.dim(P(-8, z0), P(8, z0), off=-8)
    s.dim(P(8, z1), P(x1, z1), off=6, text=f"{x1 - 8:.2f} EAVE")
    s.dim(P(x0, z1), P(-10.8, z1), off=6, text=f"{-10.8 - x0:.2f}")
    level_tag(s, x1 - 2.0, z1 - 0.8, "EAVE +7.15")
    north_arrow(s, DA[0] + 10, DA[3] - 14)
    scale_bar(s, DA[0] + 4, DA[1] + 6, 10, 2)
    return s


SHORE_X = -32.0


def shore_x(z):
    return min(SHORE_X + 3 * math.sin(z * 0.045) + 2 * math.sin(z * 0.11 + 1.3) + 0.0032 * max(0.0, abs(z) - 70) ** 2, 18)


def tree(s, x, z, r, palm=False):
    if palm:
        for i in range(8):
            a = i * math.pi / 4
            s.line(P(x, z), P(x + math.cos(a) * r, z + math.sin(a) * r), "L-PLNT")
        s.circle(P(x, z), 0.2, "L-PLNT")
    else:
        pts = []
        for i in range(25):
            a = i / 24 * math.pi * 2
            rr = r * (1 + 0.08 * math.sin(a * 5))
            pts.append(P(x + math.cos(a) * rr, z + math.sin(a) * rr))
        s.poly(pts, "L-PLNT")
        s.circle(P(x, z), 0.15, "L-PLNT")


PALMS = [(-18.5, -11), (-21.5, -8.4), (-25, -13.5), (-17.5, 12.4), (-22, 10.5), (-26.5, 15.5), (-29.5, -6.5), (-30, 7.5), (-10, 12.2),
         (12.8, 11.5), (18.5, 10.8), (25, 10.8), (31, 10.6), (22.6, -11.2), (24.6, -11.6), (34.5, -11.2), (-14.8, -9.4), (-15.2, 9.6)]
BROAD = [(-4, -13), (4.5, -13.5), (12, -15), (-12, -16), (-3, 25), (12, 24), (-19, 24), (-36, -24), (48, -14), (50, 12), (26, -17.5), (16, -18), (36, 16), (-24, -26), (2, -24)]


def sheet_site():
    s = Sheet("A-001", "SITE PLAN", 500, center=(0.0, 0.0), subtitle="Building, parking, access & lakeside landscape")
    # lake edge + water lines
    zs = [z * 1.0 for z in range(-62, 63, 2)]
    edge = [P(shore_x(z) + 5.0, z) for z in zs]
    s.poly(edge, "C-WATR", closed=False, lw=0.35)
    for zl in range(-60, 61, 4):
        xe = shore_x(zl) + 5.0
        x = -96.0
        while x < xe - 3:
            s.line(P(x, zl), P(min(x + 3.0, xe - 1.5), zl), "C-WATR")
            x += 6.0
    s.text(P(-75, 0), "CALIRAYA LAKE", 4.0, bold=True)
    s.text(P(-75, 6), "(water edge indicative)", 2.0)
    # road
    R = L["ROAD"]
    for x in (R["x0"], R["x1"]):
        s.line(P(x, -62), P(x, 62), "C-ROAD", lw=0.35)
    s.line(P((R["x0"] + R["x1"]) / 2, -62), P((R["x0"] + R["x1"]) / 2, 62), "C-ROAD", ls="dashed", lw=0.18)
    s.text(P((R["x0"] + R["x1"]) / 2 + 2.0, -40), "ACCESS ROAD", 2.2, rot=90, bold=True)
    # parking lot
    PK = L["PARKING"]
    rectz(s, PK["x0"], PK["z0"], PK["x1"], PK["z1"], "C-PRKG", lw=0.35)
    for i in range(9):
        x = 14 + i * 2.5
        s.line(P(x, -9.0), P(x, -4.2), "C-PRKG", lw=0.13)
    for x in (14, 16.4, 17.6):
        s.line(P(x, 2.2), P(x, 7.2), "C-PRKG", lw=0.13)
    for i in range(7):
        s.line(P(17.6 + i, 4.9), P(17.6 + i, 7.2), "C-PRKG", lw=0.13)
    for i in range(5):
        s.line(P(23.6 + i * 2.5, 2.2), P(23.6 + i * 2.5, 7.0), "C-PRKG", lw=0.13)
    s.text(P(15.2, 4.7), "PWD", 1.4, bold=True)
    s.text(P(20.6, 6.1), "MC ×6", 1.4)
    s.text(P(24.0, -6.6), "8 CAR STALLS 2.50 × 5.00", 1.6)
    s.text(P(28.6, 4.6), "4 STALLS", 1.4)
    arrow(s, P(33, -1), P(26, -1), head=1.0, lw=0.25)
    arrow(s, P(15, -2.5), P(11, -2.5), head=1.0, lw=0.25)
    s.text(P(11.5, -5.8), "DROP-OFF / SERVICE", 1.5)
    # walks, plaza, deck, jetty
    PZ = L["PLAZA"]
    rectz(s, PZ["x0"], PZ["z0"], PZ["x1"], PZ["z1"], "C-SITE")
    rectz(s, 12, 7.55, 17.6, 9.9, "C-SITE")
    rectz(s, 8.3, 2.4, 9.5, 6.1, "C-SITE")
    D = L["DECK"]
    rectz(s, D["x0"], D["z0"], D["x1"], D["z1"], "C-SITE", lw=0.25)
    J = L["JETTY"]
    rectz(s, J["x0"], J["z0"], J["x1"], J["z1"], "C-SITE", lw=0.25)
    rectz(s, J["x0"] - 0.5, J["z0"] - 1.8, J["x0"] + 4.5, J["z1"] + 1.8, "C-SITE", lw=0.25)
    s.text(P((J["x0"] + J["x1"]) / 2, -3.6), "TIMBER JETTY", 1.6)
    for i in range(20):
        x = D["x0"] - 1.0 - i * 0.78
        z = math.sin(i * 0.35) * 1.2
        rectz(s, x - 0.28, z - 0.37, x + 0.28, z + 0.37, "C-SITE", lw=0.09)
    # building: roof outline with hips, footprint dashed
    RF = L["ROOF"]
    x0, x1, z0, z1 = RF["x0"], RF["x1"], RF["z0"], RF["z1"]
    d = (z1 - z0) / 2
    zc = (z0 + z1) / 2
    rectz(s, x0, z0, x1, z1, "A-ROOF", lw=0.5)
    s.line(P(x0 + d, zc), P(x1 - d, zc), "A-ROOF", lw=0.25)
    for cx_, cz_, ex in ((x0, z0, x0 + d), (x0, z1, x0 + d), (x1, z0, x1 - d), (x1, z1, x1 - d)):
        s.line(P(cx_, cz_), P(ex, zc), "A-ROOF", lw=0.25)
    rectz(s, -8, -6, 8, 6, "A-OVHD", ls="dashed", lw=0.18)
    s.text(P(-1.0, 3.2), "CALIRAYA COFFEE HOUSE", 2.0, bold=True)
    s.text(P(-1.0, 5.4), "2 STOREYS · GFA 384 m²", 1.5)
    arrow(s, P(-1.0, 16.0), P(-1.0, 10.8), head=1.2, lw=0.35)
    s.text(P(-1.0, 17.6), "ENTRANCE", 1.8, bold=True)
    # planting
    for x, z in PALMS:
        tree(s, x, z, 2.8, palm=True)
    for x, z in BROAD:
        tree(s, x, z, 3.6)
    # bollards & light poles
    for x, z in ((9.2, 7.3), (11.6, 7.3), (14.0, 7.3), (9.2, 10.1), (11.6, 10.1), (-8.6, 10.6), (-3.2, 10.6), (1.4, 10.6),
                 (-16.5, -2.0), (-19.5, 1.8), (-22.5, -1.4), (-25.5, 1.6), (-28.2, -1.2)):
        s.circle(P(x, z), 0.25, "C-SITE", fill=True, lw=0.0)
    for x in (17, 29):
        s.circle(P(x, -9.9), 0.45, "C-SITE", lw=0.25)
        s.line(P(x - 0.45, -9.9), P(x + 0.45, -9.9), "C-SITE", lw=0.13)
    rectz(s, 36.2, 1.7, 36.8, 4.3, "C-SITE", fill=True, lw=0.0)
    s.text(P(35.2, 3.0), "SIGN", 1.3, rot=90)
    # dims
    s.dim(P(PK["x0"], PK["z0"]), P(PK["x1"], PK["z0"]), off=-10)
    s.dim(P(PK["x1"], PK["z0"]), P(PK["x1"], PK["z1"]), off=-14)
    s.dim(P(-8, -6), P(8, -6), off=-14)
    s.dim(P(J["x0"], J["z1"]), P(J["x1"], J["z1"]), off=8)
    s.dim(P(D["x0"], D["z1"]), P(-8, D["z1"]), off=12)
    # area schedule (paper space)
    ax, ay = DA[2] - 66, DA[1] + 46
    rows = [("AREA SCHEDULE (preliminary)", ""), ("Ground floor (enclosed)", "192.0 m²"), ("Second floor (enclosed)", "192.0 m²"),
            ("Gross floor area", "384.0 m²"), ("Sunset balcony", "33.6 m²"), ("Lakeside deck", "90.0 m²"), ("Entrance plaza", "88.0 m²"),
            ("Parking", "12 cars + 1 PWD + 6 MC")]
    s.rect(ax - 2, ay - len(rows) * 4.4 + 1, ax + 64, ay + 4, "G-TTLB", space="paper", lw=0.25)
    for i, (a, b) in enumerate(rows):
        y = ay - i * 4.4
        s.text((ax, y), a, 1.7 if i == 0 else 1.55, align="L", bold=(i == 0 or i == 3), space="paper")
        s.text((ax + 62, y), b, 1.55, align="R", bold=(i == 3), space="paper")
    s.text((DA[0] + 4, DA[1] + 18), "Lot boundary, setbacks and contours to follow topographic survey (not shown).", 1.6, align="L", space="paper")
    north_arrow(s, DA[0] + 10, DA[3] - 14)
    scale_bar(s, DA[0] + 4, DA[1] + 6, 50, 10)
    return s


# ---------------------------------------------------------------- PDF renderer

MM_TO_PT = 72.0 / 25.4
DASHES = {"dashed": (3.0, 1.5), "hidden": (1.5, 1.0), "center": (8.0, 1.5, 1.5, 1.5)}


def ls_pattern(ls, lw):
    if ls == "solid":
        return "-"
    pat = DASHES[ls]
    # matplotlib dash lengths are in units of linewidth
    w = max(lw, 0.13) * MM_TO_PT
    return (0, tuple(v * MM_TO_PT / w for v in pat))


def render_pdf(sheets, path, png_dir=None):
    with PdfPages(path) as pdf:
        for s in sheets:
            fig = plt.figure(figsize=(PAPER_W / 25.4, PAPER_H / 25.4))
            ax = fig.add_axes([0, 0, 1, 1])
            ax.set_xlim(0, PAPER_W)
            ax.set_ylim(0, PAPER_H)
            ax.set_aspect("equal")
            ax.axis("off")
            for it in s.items:
                conv = (lambda x, y: (x, y)) if it["space"] == "paper" else s.m2p
                lw = it["lw"] * MM_TO_PT
                k = it["kind"]
                if k == "poly":
                    pts = [conv(*p) for p in it["pts"]]
                    if it["fill"]:
                        ax.add_patch(Polygon(pts, closed=True, facecolor="black", edgecolor="black" if lw else "none", linewidth=lw or 0))
                    else:
                        xs = [p[0] for p in pts] + ([pts[0][0]] if it["closed"] else [])
                        ys = [p[1] for p in pts] + ([pts[0][1]] if it["closed"] else [])
                        ax.plot(xs, ys, color="black", linewidth=lw, linestyle=ls_pattern(it["ls"], it["lw"]), solid_capstyle="butt", solid_joinstyle="miter")
                elif k == "circle":
                    c = conv(*it["c"])
                    r = it["r"] if it["space"] == "paper" else it["r"] * 1000 / s.scale
                    ax.add_patch(Circle(c, r, facecolor="black" if it["fill"] else "none", edgecolor="black", linewidth=lw,
                                        linestyle=ls_pattern(it["ls"], it["lw"])))
                elif k == "arc":
                    c = conv(*it["c"])
                    r = it["r"] if it["space"] == "paper" else it["r"] * 1000 / s.scale
                    ax.add_patch(Arc(c, 2 * r, 2 * r, theta1=it["a0"], theta2=it["a1"], edgecolor="black", linewidth=lw))
                elif k == "text":
                    p = conv(*it["p"])
                    fs = it["h"] / 0.716 * MM_TO_PT
                    ha = {"C": "center", "L": "left", "R": "right"}[it["align"]]
                    ax.text(p[0], p[1], it["s"], fontsize=fs, ha=ha, va="center", rotation=it["rot"], rotation_mode="anchor",
                            fontweight="bold" if it["bold"] else "normal", color="black")
                elif k == "dim":
                    draw_dim_pdf(ax, s, it)
            if png_dir:
                fig.savefig(os.path.join(png_dir, f"{s.number}.png"), dpi=110)
            pdf.savefig(fig)
            plt.close(fig)
        d = pdf.infodict()
        d["Title"] = f"{PROJECT} — Conceptual Plan Set"
        d["Subject"] = "Conceptual architectural plans (not for construction)"
        d["Keywords"] = "Caliraya, Laguna, coffee shop, floor plan"


def dim_geometry(s, it):
    a, b = s.m2p(*it["p1"]), s.m2p(*it["p2"])
    dx, dy = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    nx, ny = -uy, ux  # left normal
    off = it["off"]
    meters = math.dist(it["p1"], it["p2"])
    return a, b, (ux, uy), (nx, ny), off, meters


def draw_dim_pdf(ax, s, it):
    a, b, (ux, uy), (nx, ny), off, meters = dim_geometry(s, it)
    lw = 0.13 * MM_TO_PT
    da = (a[0] + nx * off, a[1] + ny * off)
    db = (b[0] + nx * off, b[1] + ny * off)
    sg = 1 if off >= 0 else -1
    for p, q in ((a, da), (b, db)):
        ax.plot([p[0] + nx * 1.2 * sg, q[0] + nx * 1.5 * sg], [p[1] + ny * 1.2 * sg, q[1] + ny * 1.5 * sg], color="black", linewidth=lw)
    ax.plot([da[0] - ux * 1.5, db[0] + ux * 1.5], [da[1] - uy * 1.5, db[1] + uy * 1.5], color="black", linewidth=lw)
    t = 1.1
    for q in (da, db):
        ax.plot([q[0] - (ux + nx) * t, q[0] + (ux + nx) * t], [q[1] - (uy + ny) * t, q[1] + (uy + ny) * t], color="black", linewidth=0.35 * MM_TO_PT)
    txt = it["text"] or f"{meters:.2f}"
    ang = math.degrees(math.atan2(uy, ux))
    if ang > 90.1 or ang < -89.9:
        ang += 180
    mx, my = (da[0] + db[0]) / 2, (da[1] + db[1]) / 2
    # text sits on the side away from the measured object
    tx, ty = mx + nx * 1.6 * sg, my + ny * 1.6 * sg
    if abs(ang) > 45:
        tx, ty = mx - 1.6, my
    ax.text(tx, ty, txt, fontsize=1.8 / 0.716 * MM_TO_PT, ha="center", va="center", rotation=ang, rotation_mode="anchor", color="black")


# ---------------------------------------------------------------- DXF writer

DXF_LT = {"solid": "CONTINUOUS", "dashed": "DASHED", "hidden": "HIDDEN", "center": "CENTER"}
VALID_LW = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211]


def lw_code(mm):
    v = int(round(mm * 100))
    return min(VALID_LW, key=lambda x: abs(x - v))


def write_dxf(s, path):
    doc = ezdxf.new("R2018", setup=True, units=6)  # metres
    doc.header["$MEASUREMENT"] = 1
    doc.header["$LTSCALE"] = 0.008 * s.scale
    doc.header["$LWDISPLAY"] = 1
    if "ARIAL" not in doc.styles:
        doc.styles.add("ARIAL", font="arial.ttf")
    if "ARIAL-B" not in doc.styles:
        doc.styles.add("ARIAL-B", font="arialbd.ttf")
    for name, (lw, color) in LW.items():
        if name not in doc.layers:
            doc.layers.add(name, color=color, lineweight=lw_code(lw) if lw else 13)
    ds = doc.dimstyles.new("ARCH", dxfattribs={
        "dimscale": s.scale, "dimtxt": 0.0018, "dimasz": 0.0015, "dimtsz": 0.0011, "dimexo": 0.0012, "dimexe": 0.0015,
        "dimgap": 0.0008, "dimdec": 2, "dimtad": 1, "dimtih": 0, "dimtoh": 0, "dimzin": 0, "dimlunit": 2, "dimdsep": ord("."),
        "dimclrd": 7, "dimclre": 7, "dimclrt": 7, "dimlwd": 13, "dimlwe": 13,
    })
    ds.set_text_style("ARIAL") if hasattr(ds, "set_text_style") else None
    msp = doc.modelspace()
    k = s.scale / 1000.0

    def M(x, y, space):
        return (x, y) if space == "model" else s.p2m(x, y)

    for it in s.items:
        space = it["space"]
        attrs = {"layer": it["layer"], "linetype": DXF_LT[it["ls"]]}
        if it.get("lw"):
            attrs["lineweight"] = lw_code(it["lw"])
        kind = it["kind"]
        if kind == "poly":
            pts = [M(*p, space) for p in it["pts"]]
            if it["fill"]:
                h = msp.add_hatch(color=7, dxfattribs={"layer": it["layer"]})
                h.paths.add_polyline_path(pts, is_closed=True)
            else:
                msp.add_lwpolyline(pts, close=it["closed"], dxfattribs=attrs)
        elif kind == "circle":
            c = M(*it["c"], space)
            r = it["r"] * (k if space == "paper" else 1)
            if it["fill"]:
                h = msp.add_hatch(color=7, dxfattribs={"layer": it["layer"]})
                h.paths.add_edge_path().add_arc(c, r, 0, 360)
            else:
                msp.add_circle(c, r, dxfattribs=attrs)
        elif kind == "arc":
            c = M(*it["c"], space)
            r = it["r"] * (k if space == "paper" else 1)
            msp.add_arc(c, r, it["a0"], it["a1"], dxfattribs=attrs)
        elif kind == "text":
            p = M(*it["p"], space)
            align = {"C": TextEntityAlignment.MIDDLE_CENTER, "L": TextEntityAlignment.MIDDLE_LEFT, "R": TextEntityAlignment.MIDDLE_RIGHT}[it["align"]]
            t = msp.add_text(it["s"], height=it["h"] * k, rotation=it["rot"],
                             dxfattribs={"layer": it["layer"], "style": "ARIAL-B" if it["bold"] else "ARIAL"})
            t.set_placement(p, align=align)
        elif kind == "dim":
            a, b, _, _, off, _ = dim_geometry(s, it)
            dim = msp.add_aligned_dim(p1=it["p1"], p2=it["p2"], distance=off * k, dimstyle="ARCH",
                                      override={"dimtxsty": "ARIAL"}, dxfattribs={"layer": "A-ANNO-DIMS"})
            if it["text"]:
                dim.dimension.dxf.text = it["text"]
            dim.render()
    doc.saveas(path)


# ---------------------------------------------------------------- main

def main():
    os.makedirs(os.path.join(OUT, "dxf"), exist_ok=True)
    preview = os.path.join(HERE, ".preview")
    os.makedirs(preview, exist_ok=True)
    sheets = [sheet_site(), sheet_ground(), sheet_upper(), sheet_roof()]
    for i, s in enumerate(sheets):
        title_block(s, s.number, f"Sheet {i + 1} of {len(sheets)}")
    pdf_path = os.path.join(OUT, "Caliraya-Coffee-House_Plan-Set.pdf")
    render_pdf(sheets, pdf_path, png_dir=preview)
    names = []
    for s in sheets:
        fn = f"{s.number}_{s.title.title().replace(' ', '-')}.dxf"
        write_dxf(s, os.path.join(OUT, "dxf", fn))
        names.append(fn)
    print("PDF :", pdf_path)
    for n in names:
        print("DXF :", os.path.join(OUT, "dxf", n))
    print("Generated", datetime.date.today().isoformat())


if __name__ == "__main__":
    main()
