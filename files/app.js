  document.addEventListener("DOMContentLoaded", async () => {
    // Header + Aside yüklə (scripts-lə)
    await includeHTML("#hdr", "header.html",   { runScripts: true });
    await includeHTML("#sidebar1", "aside.html", { runScripts: true });

    // Yalnız aside içində aktiv link sinfini qur
    setSidebarActiveByCurrentFile("#sidebar1");
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
      el.innerHTML = "<!-- Yükləmə alınmadı: " + url + " -->";
    }
  }

  function setSidebarActiveByCurrentFile(sidebarSel = "#sidebar1") {
    const sidebar = document.querySelector(sidebarSel);
    if (!sidebar) return;

    // Cari HTML fayl adı (məs: "meselen.html")
    let currentFile = location.pathname.split("/").pop();
    if (!currentFile || currentFile.endsWith("/")) currentFile = "index.html";
    currentFile = currentFile.toLowerCase();

    const links = sidebar.querySelectorAll("a[href], a[data-comment]");
    links.forEach(a => {
      const rawHref = a.getAttribute("href") || "";
      const hasClass = !!a.getAttribute("class");

      // href fayl adını çıxart
      let hrefFile = "";
      if (rawHref && !rawHref.trim().startsWith("#")) {
        const url = new URL(rawHref, location.href);
        hrefFile = (url.pathname.split("/").pop() || "index.html").toLowerCase();
      }

      // data-comment siyahısını hazırla (məs: "a.html/b.html/c.html")
      const commentRaw = (a.getAttribute("data-comment") || "").toLowerCase();
      const commentList = commentRaw
        .split("/")
        .map(s => s.trim())
        .filter(Boolean); // boşları at

      // Uyğunluq: ya href file uyğun gəlir, ya da data-comment siyahısında var
      const matchesHref = hrefFile && hrefFile === currentFile;
      const matchesComment = commentList.includes(currentFile);
      const isMatch = matchesHref || matchesComment;

      if (!isMatch) return;

      // Sənin qaydan: class yoxdursa -> active; varsa -> nav-link
      const willBeActive = !hasClass || a.className.trim() === "";
      a.className = willBeActive ? "active" : "nav-link";

      // 2) Əlavə: active etdiksə, üst li → onun da üst li → oradakı birbaşa <a>-nı "nav-link" et
      if (willBeActive) {
        const li = a.closest("li");
        const grandLi = li?.parentElement?.closest("li"); // üst li-nin üst li-si
        const topA = grandLi?.querySelector(":scope > a"); // birbaşa altındakı <a>
        if (topA) topA.className = "nav-link";
      }
    });
  }
