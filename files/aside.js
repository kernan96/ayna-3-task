// assets/js/site-nav.js
document.addEventListener("DOMContentLoaded", async () => {
  await includeHTML("#hdr", "header.html",   { runScripts: true });
  await includeHTML("#sidebar", "aside.html", { runScripts: true });

  // Aktiv linki qur
  setSidebarActiveByCurrentFile("#sidebar1");

  // Aside vəziyyətini saxla/bərpa et (collapse + scrollTop)
  initSidebarPersistence("#sidebar1");
});

async function includeHTML(sel, url, { runScripts = false } = {}) {
  const el = document.querySelector(sel);
  if (!el) return;
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    el.innerHTML = await res.text();

    if (runScripts) {
      el.querySelectorAll("script").forEach(old => {
        const s = document.createElement("script");
        if (old.src) s.src = old.src; else s.textContent = old.textContent;
        [...old.attributes].forEach(a => a.name !== "src" && s.setAttribute(a.name, a.value));
        old.replaceWith(s);
      });
    }
  } catch (e) {
    console.error("Include error:", e);
    if (el) el.innerHTML = "<!-- Yükləmə alınmadı: " + url + " -->";
  }
}

/**
 * Aktiv səhifəyə uyğun linki işarələ və parent collapseları aç.
 * sidebarSel: aside konteyner selektoru (məs: "#sidebar1")
 */
function setSidebarActiveByCurrentFile(sidebarSel = "#sidebar1") {
  const sidebar = document.querySelector(sidebarSel);
  if (!sidebar) return;

  let currentFile = location.pathname.split("/").pop();
  if (!currentFile || currentFile.endsWith("/")) currentFile = "index.html";
  currentFile = currentFile.toLowerCase();

  const links = sidebar.querySelectorAll("a[href], a[data-comment]");
  links.forEach(a => {
    const rawHref = a.getAttribute("href") || "";
    const hasClass = !!a.getAttribute("class");

    let hrefFile = "";
    if (rawHref && !rawHref.trim().startsWith("#")) {
      const url = new URL(rawHref, location.href);
      hrefFile = (url.pathname.split("/").pop() || "index.html").toLowerCase();
    }

    const commentRaw = (a.getAttribute("data-comment") || "").toLowerCase();
    const commentList = commentRaw.split("/").map(s => s.trim()).filter(Boolean);

    const matchesHref = hrefFile && hrefFile === currentFile;
    const matchesComment = commentList.includes(currentFile);
    const isMatch = matchesHref || matchesComment;
    if (!isMatch) return;

    const willBeActive = !hasClass || a.className.trim() === "";
    a.className = willBeActive ? "active" : "nav-link";

    if (willBeActive) {
      // Parent nav-link-i də normal vəziyyətə gətir
      const contentUl = a.closest('ul.nav-content');
      const navItemLi = contentUl?.closest('li.nav-item');
      const topA =
        navItemLi?.querySelector('a.nav-link[data-bs-toggle="collapse"]') ||
        navItemLi?.querySelector('a.nav-link') ||
        navItemLi?.querySelector('a');
      if (topA) topA.className = 'nav-link';

      // ✅ Aktiv linkin parent collapselarını aç (əgər bağlı qalıbsa)
      for (let c = a.closest('.collapse'); c; c = c.parentElement?.closest('.collapse')) {
        c.classList.add('show');
        const pid = c.id;
        // toggler-ın aria-expanded dəyərini düzəlt
        if (pid) {
          const toggler = sidebar.querySelector(
            `[data-bs-toggle="collapse"][href="#${pid}"],
             [data-bs-toggle="collapse"][data-bs-target="#${pid}"]`
          );
          if (toggler) toggler.setAttribute('aria-expanded', 'true');
        }
      }
    }
  });
}

/**
 * Aside (sidebar) açıq/bağlı collapse-ları və scrollTop-u saxlayıb bərpa edir.
 * rootSel: aside konteyner selektoru (məs: "#sidebar1")
 */
function initSidebarPersistence(rootSel = "#sidebar1") {
  const root = document.querySelector(rootSel);
  if (!root) return;

  // Eyni domen/sayt üçün stabil açar; istəsən "v1" versiyasını dəyişməklə reset edə bilərsən
  const STORAGE_KEY = 'aside:openIds:v1';
  const SCROLL_KEY  = 'aside:scrollTop:v1';

  // ---- BƏRPA (on load) ----
  try {
    // 1) saxlanmış açıq ID-ləri bərpa et
    const openIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    openIds.forEach((id) => {
      if (!id) return;
      const panel = root.querySelector(`#${cssEscape(id)}`);
      if (panel && panel.classList.contains('collapse')) {
        panel.classList.add('show'); // BS5-də class kifayətdir
        const toggler = root.querySelector(
          `[data-bs-toggle="collapse"][href="#${id}"],
           [data-bs-toggle="collapse"][data-bs-target="#${id}"]`
        );
        if (toggler) toggler.setAttribute('aria-expanded', 'true');
      }
    });

    // 2) Scroll mövqeyini bərpa et
    const st = localStorage.getItem(SCROLL_KEY);
    if (st !== null) root.scrollTop = +st;
  } catch (e) {
    console.warn('Aside state restore failed:', e);
  }

  // ---- YADDA SAXLA (dinamik) ----
  const saveOpenIds = () => {
    const ids = Array.from(root.querySelectorAll('.collapse.show'))
      .map(c => c.id)
      .filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  // Collapse event-lərini dinlə (Bootstrap 5)
  root.addEventListener('shown.bs.collapse', saveOpenIds);
  root.addEventListener('hidden.bs.collapse', saveOpenIds);

  // Link klikində (yeni səhifəyə keçməzdən əvvəl) vəziyyəti saxla
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    saveOpenIds();
    localStorage.setItem(SCROLL_KEY, root.scrollTop);
  });

  // Scroll-u throttle ilə saxla
  let t;
  root.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      localStorage.setItem(SCROLL_KEY, root.scrollTop);
    }, 120);
  });

  // Səhifədən çıxarkən də son vəziyyəti yaz
  window.addEventListener('beforeunload', () => {
    saveOpenIds();
    localStorage.setItem(SCROLL_KEY, root.scrollTop);
  });
}

/* Köməkçi: universal CSS.escape polyfill (köhnə brauzerlər üçün) */
function cssEscape(id) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(id);
  }
  // Sadə fallback: boşluqları və problemli simvolları qaçırdır
  return String(id).replace(/[^a-zA-Z0-9\-_]/g, s => '\\' + s);
}
