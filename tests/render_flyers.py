"""Renderiza los afiches con Chrome headless y arma hojas de contacto para revisarlos.

Uso (desde la carpeta del proyecto, con un servidor local corriendo):
    python -m http.server 8104 --bind 127.0.0.1
    python tests/render_flyers.py --out <carpeta> [--base http://127.0.0.1:8104] [--only producto] [--jobs 6]

Deja <out>/<plantilla>-<formato>-<producto>-v<n>.png y <out>/hoja-<plantilla>-<formato>-<k>.png.
"""
import argparse
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw

CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
SIZES = {"story": (1080, 1920), "post": (1080, 1080)}
MAR = ["mar-crocante-maracuya", "mar-arandanos", "mar-fresa", "mar-aguaje", "mar-ron-pasas"]
PLAN = {
    "producto": MAR + ["emp-hawaiana", "emp-mixto", "caja-china", "kekesitos"],
    "lanzamiento": MAR,
    "delivery": ["emp-mixto", "emp-hawaiana"] + MAR[:4],  # ron con pasas no entra en delivery
    "cajachina": ["caja-china"],
    "promo": MAR,
}


def shot(job):
    url, png, size = job
    with tempfile.TemporaryDirectory() as prof:
        cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={prof}",
               f"--window-size={size[0]},{size[1]}", "--virtual-time-budget=8000", f"--screenshot={png}", url]
        subprocess.run(cmd, capture_output=True, timeout=90)
    return png


def blank(png):
    """True si falta la captura o quedó solo el fondo de la página (#222): el afiche no llegó a dibujarse."""
    if not os.path.exists(png):
        return True
    px = Image.open(png).convert("L").resize((54, 96)).tobytes()
    return sum(abs(v - 34) < 3 for v in px) > 0.9 * len(px)


def sheet(paths, size, dest, label):
    cw = 216 if size[1] > size[0] else 288
    ch = int(cw * size[1] / size[0])
    cols = max(len(r) for r in paths)
    img = Image.new("RGB", (cols * cw + (cols + 1) * 8, len(paths) * ch + (len(paths) + 1) * 8 + 24), "#202020")
    ImageDraw.Draw(img).text((8, 6), label, fill="#eeeeee")
    for r, row in enumerate(paths):
        for c, p in enumerate(row):
            if os.path.exists(p):
                img.paste(Image.open(p).convert("RGB").resize((cw, ch), Image.LANCZOS), (8 + c * (cw + 8), 32 + r * (ch + 8)))
    img.save(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--base", default="http://127.0.0.1:8104")
    ap.add_argument("--only", default="")
    ap.add_argument("--formats", default="story,post")
    ap.add_argument("--jobs", type=int, default=4)  # http.server de Python rechaza conexiones con más
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    jobs, grids = [], []
    for tpl, prods in PLAN.items():
        if a.only and tpl not in a.only.split(","):
            continue
        for fmt in a.formats.split(","):
            for k in range(0, len(prods), 5):  # hojas de hasta 5 productos (columnas) x 3 variantes (filas)
                chunk = prods[k:k + 5]
                rows = []
                for v in range(3):
                    row = []
                    for p in chunk:
                        png = os.path.join(a.out, f"{tpl}-{fmt}-{p}-v{v}.png")
                        jobs.append((f"{a.base}/tests/flyers.html?t={tpl}&f={fmt}&p={p}&v={v}", png, SIZES[fmt]))
                        row.append(png)
                    rows.append(row)
                grids.append((rows, SIZES[fmt], os.path.join(a.out, f"hoja-{tpl}-{fmt}-{k // 5}.png"), f"{tpl} · {fmt} · " + ", ".join(chunk)))
    with ThreadPoolExecutor(a.jobs) as ex:
        list(ex.map(shot, jobs))
    for _ in range(2):  # reintenta en serie las capturas vacías
        bad = [j for j in jobs if blank(j[1])]
        for j in bad:
            shot(j)
    bad = [j[1] for j in jobs if blank(j[1])]
    if bad:
        print("SIN DIBUJAR:", *bad, sep="\n  ")
    for g in grids:
        sheet(*g)
    print(f"{len(jobs)} afiches, {len(grids)} hojas en {a.out}")


if __name__ == "__main__":
    main()
