import re
import sys
import os
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
from urllib.request import urlopen, Request

# ---- Konfiqurasiya (sənin istədiyin defaultlar) ----
DEFAULT_BASE_PREFIX = "https://smartnet.az/assets/css/"  # nisbi yollar üçün prefiks
DEFAULT_OUT_DIR = r"D:/cssfiles"                         # bütün fayllar buraya enəcək

URL_ABS_RE = re.compile(r'^https?://', re.IGNORECASE)
URL_FUNC_RE = re.compile(r'''url\(\s*(['"]?)(?!data:)([^'")]+)\1\s*\)''', re.IGNORECASE)
IMPORT_RE   = re.compile(r'''@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)''', re.IGNORECASE)

def get_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req) as r:
        return r.read().decode("utf-8", errors="ignore")

def download_binary(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req) as r:
        return r.read()

def unique_path(out_dir: Path, suggested_name: str) -> Path:
    # fayl adını URL-dən götür, boşdursa "file"
    name = suggested_name or "file"
    name = unquote(name)
    # pis simvolları təmizlə (minimum)
    name = name.replace("/", "_").replace("\\", "_")
    target = out_dir / name
    stem, ext = os.path.splitext(target.name)
    i = 2
    while target.exists():
        target = out_dir / f"{stem}-{i}{ext}"
        i += 1
    return target

def filename_from_url(u: str) -> str:
    path = urlparse(u).path
    name = os.path.basename(path)
    return unquote(name) or "file"

def absolutize(u: str, base_prefix: str) -> str:
    # http/https isə olduğu kimi qaytar
    if URL_ABS_RE.match(u):
        return u
    # nisbi və ya root-vari yol üçün sənin dediyin prefikslə birləşdir
    # urljoin ../, ./, / kimi halları ağıllı həll edir
    return urljoin(base_prefix, u)

def process_css(css_url: str, out_dir: Path, base_prefix: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1) CSS faylının özünü endir və saxla
    css_text = get_text(css_url)
    css_name = filename_from_url(css_url)
    css_out_path = unique_path(out_dir, css_name)

    # @import-ları əvvəlcə çıxar (sonra endirəcəyik, 1 səviyyə)
    imported_urls = []
    def _imp_collect(m):
        u = m.group(2) or m.group(4)  # url(...) və ya "..."
        imported_urls.append(u)
        return m.group(0)
    css_text = IMPORT_RE.sub(_imp_collect, css_text)

    # 2) url(...) resurslarını tap, endir, lokala çevir
    def _url_replace(m):
        q = m.group(1) or ""
        u = m.group(2).strip()
        abs_url = absolutize(u, base_prefix)
        try:
            data = download_binary(abs_url)
            out_file = unique_path(out_dir, filename_from_url(abs_url))
            out_file.write_bytes(data)
            # CSS-də yalnız lokal fayl adını yazırıq (eyni qovluqdadır)
            return f"url({q}{out_file.name}{q})"
        except Exception:
            # alınmasa, toxunma
            return m.group(0)

    css_text = URL_FUNC_RE.sub(_url_replace, css_text)

    # 3) @import edilmiş CSS fayllarını endir (1 səviyyə) və içlərində url(...)ləri də lokallaşdır
    #    @import-ların ünvanlarını da lokala çevir
    for u in imported_urls:
        abs_import = absolutize(u, base_prefix)
        try:
            imp_text = get_text(abs_import)
            imp_name = filename_from_url(abs_import)
            imp_out = unique_path(out_dir, imp_name)

            # import edilmiş CSS-də də url(...)ləri lokallaşdır
            def _imp_url_replace(m):
                q = m.group(1) or ""
                u2 = m.group(2).strip()
                abs_u2 = absolutize(u2, base_prefix)
                try:
                    data2 = download_binary(abs_u2)
                    out2 = unique_path(out_dir, filename_from_url(abs_u2))
                    out2.write_bytes(data2)
                    return f"url({q}{out2.name}{q})"
                except Exception:
                    return m.group(0)

            imp_text = URL_FUNC_RE.sub(_imp_url_replace, imp_text)
            imp_out.write_text(imp_text, encoding="utf-8")

            # əsas CSS-də bu import URL-ni lokal fayl adına dəyiş
            css_text = css_text.replace(u, imp_out.name)
            css_text = css_text.replace(abs_import, imp_out.name)
        except Exception:
            # alınmasa, keç
            pass

    # 4) əsas CSS-i yaz
    css_out_path.write_text(css_text, encoding="utf-8")
    return css_out_path

if __name__ == "__main__":
    # DEFAULT-lar: sənin istədiyin dəyərlər
    DEFAULT_OUT_DIR = r"D:/cssfiles"
    DEFAULT_BASE_PREFIX = "https://smartnet.az/assets/css/"

    # Arg-lar yoxdursa belə, Default-larla işləsin
    css_url_arg = sys.argv[1] if len(sys.argv) > 1 else "https://smartnet.az/assets/css/icons.min.css"
    out_dir_arg = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(DEFAULT_OUT_DIR)
    base_prefix_arg = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_BASE_PREFIX

    out_dir_arg.mkdir(parents=True, exist_ok=True)

    out_path = process_css(css_url_arg, out_dir_arg, base_prefix_arg)
    print(f"✓ Yazıldı: {out_path}")

