/* ==========================================================================
   CH AI STUDIO V6 — INTERACTIVE UI & LEGACY ENGINE BRIDGE
   ========================================================================== */
(function () {
  "use strict";

  let assetFilter = "all";
  let assetSearch = "";
  let projectFilter = "all";
  let templateFilter = "all";
  let templateSearch = "";

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeState() {
    if (typeof state !== "undefined" && state) return state;
    return { credits: 0, assets: [], projects: [], mode: "image" };
  }

  // 1. Page Router & Bottom Nav Highlighter
  const origGo = window.go;
  window.go = function (page, addHistory = true) {
    if (typeof origGo === "function") origGo(page, addHistory);

    document.querySelectorAll("body main > section.page").forEach((el) => {
      const isTarget = el.id === "page-" + page;
      el.classList.toggle("active", isTarget);
      el.style.setProperty("display", isTarget ? (page === "chat" ? "flex" : "block") : "none", "important");
      if (isTarget) {
        el.style.setProperty("padding-top", "64px", "important");
        el.style.setProperty("padding-bottom", page === "chat" ? "82px" : "88px", "important");
      }
    });

    const navMap = { home: "home", assets: "assets", projects: "projects", profile: "profile" };
    const activeTab = navMap[page] || "";
    document.querySelectorAll("#ch-mobile-nav .ch-mobile-item").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-mobile-page") === activeTab);
    });

    if (page === "profile") syncV6ProfilePage();
    if (page === "jedagjedug") cleanV6JJChrome();
    if (page === "assets") window.renderAssets();
    if (page === "projects") window.renderProjects();
  };

  // 2. Sync Mode (Image vs Video) across V6 Generator UI & legacy state
  const origSetMode = window.setMode;
  window.setMode = function (mode) {
    if (typeof origSetMode === "function") origSetMode(mode);
    const genPage = document.getElementById("page-generate");
    const titleEl = document.getElementById("v6GenPageTitle");
    const btnEl = document.getElementById("generateBtn");
    const promptEl = document.getElementById("prompt");
    const tabA = document.getElementById("v6SegTabA");
    const tabB = document.getElementById("v6SegTabB");
    const imgStyleSec = document.getElementById("v6ImageStylesWrap");
    const vidDurSec = document.getElementById("v6VideoDurationWrap");
    const countWrap = document.getElementById("v6CountWrap");

    if (mode === "video") {
      if (genPage) {
        genPage.classList.remove("v6-mode-image");
        genPage.classList.add("v6-mode-video");
      }
      if (titleEl) titleEl.textContent = "Generate Video";
      if (btnEl) btnEl.textContent = "✦ Generate Video";
      if (promptEl) promptEl.placeholder = "Deskripsikan gerakan video... Contoh: Wanita berjalan di jalanan neon malam hari, kamera sinematik";
      if (tabA) tabA.textContent = "Teks ke Video";
      if (tabB) tabB.textContent = "Gambar ke Video";
      if (imgStyleSec) imgStyleSec.style.display = "none";
      if (vidDurSec) vidDurSec.style.display = "block";
      if (countWrap) countWrap.style.display = "none";
    } else {
      if (genPage) {
        genPage.classList.add("v6-mode-image");
        genPage.classList.remove("v6-mode-video");
      }
      if (titleEl) titleEl.textContent = "Generate Image";
      if (btnEl) btnEl.textContent = "✦ Generate Sekarang";
      if (promptEl) promptEl.placeholder = "Masukkan prompt gambar... Contoh: Wanita cantik anime di taman bunga aesthetic, pencahayaan lembut";
      if (imgStyleSec) imgStyleSec.style.display = "block";
      if (vidDurSec) vidDurSec.style.display = "none";
      if (countWrap) countWrap.style.display = "flex";
    }
    window.setV6GenSubMode(mode === "video" ? "ref" : "text");
  };

  window.setV6GenSubMode = function (sub) {
    const tabA = document.getElementById("v6SegTabA");
    const tabB = document.getElementById("v6SegTabB");
    const refRow = document.getElementById("videoReferenceOption");
    const isRef = sub === "ref";
    if (tabA) tabA.classList.toggle("is-active", !isRef);
    if (tabB) tabB.classList.toggle("is-active", isRef);
    if (refRow) {
      refRow.classList.toggle("v6-ref-open", isRef);
      refRow.style.setProperty("display", isRef ? "flex" : "none", "important");
    }
  };

  window.selectV6Style = function (modelName, cardEl) {
    document.querySelectorAll(".v6-style-card").forEach((c) => c.classList.remove("is-active"));
    if (cardEl) cardEl.classList.add("is-active");
    const sel = document.getElementById("model");
    if (sel) {
      sel.value = modelName;
      sel.dispatchEvent(new Event("change"));
    }
  };

  window.selectV6Ratio = function (ratioVal, cardEl) {
    document.querySelectorAll(".v6-ratio-card").forEach((c) => c.classList.remove("is-active"));
    if (cardEl) cardEl.classList.add("is-active");
    const sel = document.getElementById("ratio");
    if (sel) {
      sel.value = ratioVal;
      sel.dispatchEvent(new Event("change"));
    }
  };

  window.stepV6Count = function (delta) {
    const sel = document.getElementById("count");
    const disp = document.getElementById("v6CountDisplay");
    const costEl = document.getElementById("cost");
    if (!sel) return;
    const next = Math.min(2, Math.max(1, Number(sel.value || 1) + delta));
    sel.value = String(next);
    sel.dispatchEvent(new Event("change"));
    if (disp) disp.textContent = String(next);
    if (costEl && safeState().mode !== "video") costEl.textContent = String(next * 2);
  };


  window.selectV6Fps = function (fpsVal, btnEl) {
    document.querySelectorAll("[data-v6-fps]").forEach((b) => b.classList.remove("is-active"));
    if (btnEl) btnEl.classList.add("is-active");
    const sel = document.getElementById("fps");
    if (sel) {
      sel.value = String(fpsVal);
      sel.dispatchEvent(new Event("change"));
    }
  };

  // Auto-reveal & scroll Jedag Jedug rendered video into view when ready
  const jjOutVid = document.getElementById("jj-output-video");
  if (jjOutVid && typeof MutationObserver !== "undefined") {
    new MutationObserver(() => {
      const src = jjOutVid.getAttribute("src");
      if (src) {
        jjOutVid.style.setProperty("display", "block", "important");
        jjOutVid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }).observe(jjOutVid, { attributes: true, attributeFilter: ["src"] });
  }

  window.selectV6Duration = function (sec, btnEl) {
    document.querySelectorAll("[data-v6-dur]").forEach((b) => b.classList.remove("is-active"));
    if (btnEl) btnEl.classList.add("is-active");
    const sel = document.getElementById("duration");
    if (sel) {
      if (![...sel.options].some((o) => o.value === String(sec))) {
        const opt = document.createElement("option");
        opt.value = String(sec);
        opt.textContent = sec + " detik";
        sel.appendChild(opt);
      }
      sel.value = String(sec);
      sel.dispatchEvent(new Event("change"));
    }
  };

  // 3. Credits Sync
  const origRenderCredits = window.renderCredits;
  window.renderCredits = function () {
    if (typeof origRenderCredits === "function") origRenderCredits();
    const val = String(safeState().credits ?? 0);
    ["v6HeaderCredits", "v6HomeWalletCredits", "v6ProfilePageCredits"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  };

  // 4. Recent Items on Beranda
  window.renderRecent = function () {
    const el = document.getElementById("recentGrid");
    if (!el) return;
    const assets = Array.isArray(safeState().assets) ? safeState().assets.slice(0, 4) : [];
    if (!assets.length) {
      el.innerHTML = `<div class="v6-card" style="text-align:center;padding:18px;font-size:0.78rem;color:var(--v6-dim);">Belum ada karya terbaru. Mulai buat gambar atau video pertama kamu.</div>`;
      return;
    }
    el.innerHTML = `<div class="v6-grid-2">${assets.map((item, idx) => {
      const isVid = item.type === "video" || Boolean(item.video);
      const src = isVid ? item.video : item.image;
      return `
        <div class="v6-visual-card" onclick="openV6Lightbox(${idx})">
          <div class="v6-visual-card-media">
            ${isVid ? `<video src="${esc(src)}" muted playsinline></video>` : `<img src="${esc(src)}" alt="Karya AI" loading="lazy">`}
          </div>
          <div class="v6-visual-card-body">
            <p style="margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.prompt || "Karya AI")}</p>
          </div>
        </div>`;
    }).join("")}</div>`;
  };

  // 5. Aset Gallery (2-Column Grid + Search + Filter + Fullscreen Lightbox + Download/Delete)
  window.renderAssets = function () {
    const el = document.getElementById("assetGrid");
    if (!el) return;
    const allAssets = Array.isArray(safeState().assets) ? safeState().assets : [];
    const filtered = allAssets
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const isVid = item.type === "video" || Boolean(item.video);
        if (assetFilter === "image" && isVid) return false;
        if (assetFilter === "video" && !isVid) return false;
        if (assetSearch.trim()) {
          return String(item.prompt || "").toLowerCase().includes(assetSearch.toLowerCase());
        }
        return true;
      });

    if (!filtered.length) {
      el.innerHTML = `<div class="v6-card" style="text-align:center;padding:30px 16px;">
        <strong style="display:block;margin-bottom:6px;">Belum Ada Aset</strong>
        <p style="margin:0 0 14px;font-size:0.78rem;color:var(--v6-dim);">Hasil gambar &amp; video AI kamu akan tersimpan di sini.</p>
        <button type="button" class="v6-topup-pill" onclick="go('home')">Mulai Berkarya</button>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="v6-grid-2">${filtered.map(({ item, originalIndex }) => {
      const isVid = item.type === "video" || Boolean(item.video);
      const src = isVid ? item.video : item.image;
      const fn = isVid ? "ch-ai-studio-video.mp4" : "ch-ai-studio.jpg";
      return `
        <article class="v6-visual-card">
          <div class="v6-visual-card-media" onclick="openV6Lightbox(${originalIndex})">
            ${isVid ? `<video src="${esc(src)}" muted playsinline></video>` : `<img src="${esc(src)}" alt="Aset AI" loading="lazy">`}
          </div>
          <div class="v6-visual-card-body">
            <p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.prompt || "Karya AI")}</p>
            <div class="v6-mini-actions">
              <a class="v6-mini-btn" href="${esc(src)}" download="${fn}">Download</a>
              <button type="button" class="v6-mini-btn danger" onclick="deleteV6Asset(${originalIndex})">Hapus</button>
            </div>
          </div>
        </article>`;
    }).join("")}</div>`;
  };

  window.setV6AssetFilter = function (f, btn) {
    assetFilter = f;
    document.querySelectorAll("[data-asset-filter]").forEach((b) => b.classList.remove("is-active"));
    if (btn) btn.classList.add("is-active");
    window.renderAssets();
  };

  window.searchV6Assets = function (q) {
    assetSearch = q || "";
    window.renderAssets();
  };

  window.deleteV6Asset = function (idx) {
    const s = safeState();
    if (!Array.isArray(s.assets) || !s.assets[idx]) return;
    if (!confirm("Hapus aset ini?")) return;
    s.assets.splice(idx, 1);
    if (typeof save === "function") save();
    window.renderAssets();
    window.renderRecent();
  };

  window.openV6Lightbox = function (idx) {
    const item = safeState().assets?.[idx];
    const box = document.getElementById("v6Lightbox");
    const media = document.getElementById("v6LightboxMedia");
    const caption = document.getElementById("v6LightboxCaption");
    const dl = document.getElementById("v6LightboxDownload");
    if (!item || !box || !media) return;
    const isVid = item.type === "video" || Boolean(item.video);
    const src = isVid ? item.video : item.image;
    media.innerHTML = isVid ? `<video src="${esc(src)}" controls autoplay playsinline></video>` : `<img src="${esc(src)}" alt="Preview">`;
    if (caption) caption.textContent = item.prompt || "Karya CH AI Studio";
    if (dl) {
      dl.href = src;
      dl.download = isVid ? "ch-ai-studio-video.mp4" : "ch-ai-studio.jpg";
    }
    box.classList.add("is-open");
  };

  window.closeV6Lightbox = function () {
    const box = document.getElementById("v6Lightbox");
    const media = document.getElementById("v6LightboxMedia");
    if (box) box.classList.remove("is-open");
    if (media) media.innerHTML = "";
  };

  // 6. Projek Gallery (Real User State Only — No Fake Data)
  window.renderProjects = function () {
    const el = document.getElementById("projectList");
    if (!el) return;
    const allProjects = Array.isArray(safeState().projects) ? safeState().projects : [];
    const filtered = allProjects
      .map((project, originalIndex) => ({ project, originalIndex }))
      .filter(({ project }) => {
        if (projectFilter === "all") return true;
        const type = String(project.type || "image").toLowerCase();
        const status = String(project.status || "selesai").toLowerCase();
        if (projectFilter === "processing") return status.includes("proses");
        if (projectFilter === "done") return !status.includes("proses");
        return type.includes(projectFilter);
      });

    if (!filtered.length) {
      el.innerHTML = `<div class="v6-card" style="text-align:center;padding:30px 16px;">
        <strong style="display:block;margin-bottom:6px;">Belum Ada Projek</strong>
        <p style="margin:0 0 14px;font-size:0.78rem;color:var(--v6-dim);">Buat projek gambar, video, atau storyboard pertamamu.</p>
        <button type="button" class="v6-topup-pill" onclick="go('generate');setMode('image')">＋ Projek Baru</button>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="v6-grid-2">${filtered.map(({ project, originalIndex }) => `
      <article class="v6-visual-card">
        <div class="v6-visual-card-media" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#131D3B,#251444);">
          ${project.thumbnail
            ? `<img src="${esc(project.thumbnail)}" alt="${esc(project.name)}">`
            : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#82B4FF" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 10h8M8 14h5"/></svg>`}
        </div>
        <div class="v6-visual-card-body">
          <h4>${esc(project.name || "Projek")}</h4>
          <p>${esc(project.created || "-")} · ${esc(project.status || "Selesai")}</p>
          <div class="v6-mini-actions">
            <button type="button" class="v6-mini-btn" onclick="openV6Project(${originalIndex})">Buka</button>
            <button type="button" class="v6-mini-btn" onclick="manageV6Project(${originalIndex})">Kelola</button>
          </div>
        </div>
      </article>`).join("")}</div>`;
  };

  window.setV6ProjectFilter = function (f, btn) {
    projectFilter = f;
    document.querySelectorAll("[data-project-filter]").forEach((b) => b.classList.remove("is-active"));
    if (btn) btn.classList.add("is-active");
    window.renderProjects();
  };

  window.openV6Project = function (idx) {
    const p = safeState().projects?.[idx];
    if (!p) return;
    if (p.prompt && document.getElementById("prompt")) document.getElementById("prompt").value = p.prompt;
    go("generate");
    setMode(String(p.type || "").toLowerCase().includes("video") ? "video" : "image");
  };

  window.manageV6Project = function (idx) {
    const s = safeState();
    const p = s.projects?.[idx];
    if (!p) return;
    const next = prompt(`Ubah nama projek atau ketik HAPUS untuk menghapus:\n(${p.name})`, p.name);
    if (next === null || !next.trim()) return;
    if (next.trim().toUpperCase() === "HAPUS") {
      s.projects.splice(idx, 1);
    } else {
      p.name = next.trim();
    }
    if (typeof save === "function") save();
    window.renderProjects();
    window.renderRecent();
  };

  // 7. Template Filter & Search
  window.filterV6Templates = function (cat, btn) {
    templateFilter = cat;
    document.querySelectorAll("[data-tpl-filter]").forEach((b) => b.classList.remove("is-active"));
    if (btn) btn.classList.add("is-active");
    applyV6TemplateFilter();
  };

  window.searchV6Templates = function (q) {
    templateSearch = (q || "").toLowerCase();
    applyV6TemplateFilter();
  };

  function applyV6TemplateFilter() {
    document.querySelectorAll("[data-tpl-cat]").forEach((card) => {
      const cat = card.getAttribute("data-tpl-cat") || "";
      const txt = card.textContent.toLowerCase();
      const matchCat = templateFilter === "all" || cat.includes(templateFilter);
      const matchSearch = !templateSearch || txt.includes(templateSearch);
      card.style.display = matchCat && matchSearch ? "flex" : "none";
    });
  }

  // 8. Jedag Jedug Tool Dock Scroll Helper

  window.__v6JJActiveAnim = "none";


  window.selectV6JJTransition = function (transVal, cardEl) {
    document.querySelectorAll("#v6JJTransGrid .v6-jj-anim-item").forEach((el) => el.classList.remove("is-active"));
    if (cardEl) cardEl.classList.add("is-active");

    const radio = document.querySelector(`input[name="jj-transition"][value="${transVal}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const preview = document.getElementById("jj-preview");
    if (preview) {
      preview.classList.remove("v6-trans-pulse");
      void preview.offsetWidth;
      if (transVal !== "none") preview.classList.add("v6-trans-pulse");
    }
  };

  window.filterV6JJTrans = function (cat, btnEl) {
    document.querySelectorAll(".v6-jj-trans-tab").forEach((b) => b.classList.remove("is-active"));
    if (btnEl) btnEl.classList.add("is-active");
    document.querySelectorAll("#v6JJTransGrid .v6-jj-anim-item").forEach((card) => {
      const cats = card.getAttribute("data-trans-cat") || "";
      card.style.display = cat === "all" || cats.includes(cat) ? "flex" : "none";
    });
  };

  window.selectV6JJAnim = function (animId, cardEl) {
    window.__v6JJActiveAnim = animId || "none";
    document.querySelectorAll(".v6-jj-anim-item").forEach((el) => el.classList.remove("is-active"));
    if (cardEl) cardEl.classList.add("is-active");

    const preview = document.getElementById("jj-preview");
    if (preview) {
      preview.classList.remove(
        "v6-anim-flash2",
        "v6-anim-shake",
        "v6-anim-neon",
        "v6-anim-spin",
        "v6-anim-echo",
        "v6-anim-disperse",
        "v6-anim-scan"
      );
      if (animId && animId !== "none") {
        preview.classList.add("v6-anim-" + animId);
      }
    }

    // Sync compatible legacy .jj-effect flags so app.js renderer also enriches the output
    const effectMap = {
      none: [],
      shake: ["stars"],
      neon: ["fire", "stars"],
      flash2: ["stars"],
      disperse: ["butterflies", "stars"],
      spin: ["stars"],
      scan: ["water"],
      echo: ["stars"]
    };
    const activeVals = effectMap[animId] || [];
    document.querySelectorAll(".jj-effect").forEach((cb) => {
      cb.checked = activeVals.includes(cb.value);
    });
  };

  // Overlay selected beat animation onto Jedag Jedug render canvas during export
  if (typeof CanvasRenderingContext2D !== "undefined") {
    const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    let inV6DrawHook = false;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      origDrawImage.apply(this, args);
      if (inV6DrawHook) return;
      const anim = window.__v6JJActiveAnim;
      const jjActive = document.getElementById("page-jedagjedug")?.classList.contains("active");
      if (!jjActive || !anim || anim === "none") return;
      const c = this.canvas;
      if (!c || c.width < 300 || c.height < 300) return;

      inV6DrawHook = true;
      try {
        const t = performance.now() / 1000;
        const beat = Math.abs(Math.sin(t * Math.PI * 2.2));
        this.save();
        if (anim === "flash2" && beat > 0.82) {
          this.fillStyle = "rgba(255,255,255," + ((beat - 0.82) * 2.2).toFixed(2) + ")";
          this.fillRect(0, 0, c.width, c.height);
        } else if (anim === "echo") {
          const sc = 1 + beat * 0.14;
          this.globalAlpha = 0.24 * beat;
          this.translate(c.width / 2, c.height / 2);
          this.scale(sc, sc);
          this.translate(-c.width / 2, -c.height / 2);
          origDrawImage.apply(this, args);
        } else if (anim === "neon") {
          this.strokeStyle = beat > 0.5 ? "rgba(236,53,201,0.55)" : "rgba(56,189,248,0.55)";
          this.lineWidth = Math.max(6, c.width * 0.018);
          this.strokeRect(4, 4, c.width - 8, c.height - 8);
        } else if (anim === "scan") {
          const y = ((t * 0.85) % 1) * c.height;
          const grad = this.createLinearGradient(0, y - 18, 0, y + 18);
          grad.addColorStop(0, "rgba(56,189,248,0)");
          grad.addColorStop(0.5, "rgba(56,189,248,0.55)");
          grad.addColorStop(1, "rgba(56,189,248,0)");
          this.fillStyle = grad;
          this.fillRect(0, y - 18, c.width, 36);
        } else if (anim === "spin") {
          this.strokeStyle = "rgba(244,114,182,0.35)";
          this.lineWidth = 4;
          this.beginPath();
          this.arc(c.width / 2, c.height / 2, (c.width * 0.32) * (0.85 + beat * 0.2), 0, Math.PI * 2);
          this.stroke();
        } else if (anim === "disperse" || anim === "shake") {
          this.fillStyle = "rgba(254,240,138," + (0.22 * beat).toFixed(2) + ")";
          for (let i = 0; i < 6; i++) {
            const px = ((Math.sin(t * 2 + i * 1.7) + 1) * 0.5) * c.width;
            const py = ((Math.cos(t * 1.6 + i * 2.1) + 1) * 0.5) * c.height;
            this.beginPath();
            this.arc(px, py, 3 + beat * 3, 0, Math.PI * 2);
            this.fill();
          }
        }
        this.restore();
      } finally {
        inV6DrawHook = false;
      }
    };
  }

  window.scrollV6JJPanel = function (stepIdx, btn) {
    document.querySelectorAll(".v6-jj-dock-btn").forEach((b) => b.classList.remove("is-active"));
    if (btn) btn.classList.add("is-active");
    const stepPanels = document.querySelectorAll("#page-jedagjedug .v6-jj-step-panel");
    stepPanels.forEach((p, i) => {
      p.classList.toggle("is-open", i === stepIdx - 1);
      p.style.setProperty("display", i === stepIdx - 1 ? "block" : "none", "important");
    });
  };

  // 9. Clerk Profile & Greeting Sync
  function syncV6ProfilePage() {
    const user = window.Clerk?.user || null;
    const greetName = document.getElementById("v6GreetingName");
    const picEl = document.getElementById("v6ProfilePic");
    const hdrAvatar = document.getElementById("v6HeaderAvatar");
    const nameEl = document.getElementById("v6ProfileName");
    const emailEl = document.getElementById("v6ProfileEmail");
    const authLabel = document.getElementById("v6ProfileAuthLabel");

    window.renderCredits();

    if (user) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "Kreator";
      const email = user.primaryEmailAddress?.emailAddress || "-";
      const avatarHtml = user.imageUrl ? `<img src="${esc(user.imageUrl)}" alt="${esc(fullName)}">` : esc(fullName.charAt(0).toUpperCase());
      if (greetName) greetName.textContent = fullName;
      if (picEl) picEl.innerHTML = avatarHtml;
      if (hdrAvatar) hdrAvatar.innerHTML = avatarHtml;
      if (nameEl) nameEl.textContent = fullName;
      if (emailEl) emailEl.textContent = email;
      if (authLabel) {
        authLabel.textContent = "Keluar";
        authLabel.style.color = "#FF85B3";
      }
    } else {
      if (greetName) greetName.textContent = "Kreator";
      if (picEl) picEl.textContent = "CH";
      if (hdrAvatar) hdrAvatar.textContent = "CH";
      if (nameEl) nameEl.textContent = "Mode Tamu";
      if (emailEl) emailEl.textContent = "Masuk untuk sinkronisasi akun";
      if (authLabel) {
        authLabel.textContent = "Masuk / Daftar";
        authLabel.style.color = "#82B4FF";
      }
    }
  }

  window.handleV6AuthMenuClick = function () {
    if (window.Clerk?.user) {
      if (typeof logoutCH === "function") logoutCH();
    } else if (typeof openAuth === "function") {
      openAuth();
    }
  };

  // 10. Honest Bug Report Submission
  window.submitV6BugReport = async function (e) {
    e.preventDefault();
    const title = (document.getElementById("v6BugTitle")?.value || "").trim();
    const category = document.getElementById("v6BugCategory")?.value || "Umum";
    const desc = (document.getElementById("v6BugDesc")?.value || "").trim();
    const statusBox = document.getElementById("v6BugStatus");
    if (!title || !desc || !statusBox) return;

    statusBox.style.display = "block";
    statusBox.style.color = "var(--v6-dim)";
    statusBox.textContent = "Mengirim laporan...";

    try {
      const headers = { "Content-Type": "application/json" };
      if (window.Clerk?.session) {
        const token = await window.Clerk.session.getToken();
        if (token) headers.Authorization = "Bearer " + token;
      }
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers,
        body: JSON.stringify({ title, category, description: desc })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      statusBox.style.color = "#6EE7B7";
      statusBox.textContent = "Laporan bug berhasil tersimpan di server.";
      document.getElementById("v6BugForm")?.reset();
    } catch (_err) {
      statusBox.style.color = "#FBBF24";
      statusBox.textContent = "Endpoint /api/bug-report belum aktif di server sehingga laporan belum tersimpan di database.";
    }
  };


  function cleanV6JJChrome() {
    const jjPage = document.getElementById("page-jedagjedug");
    if (!jjPage) return;
    // Hide any dynamic step tab bar injected by app.js above the preview
    Array.from(jjPage.children).forEach((child) => {
      if (
        !child.classList.contains("v6-subpage-bar") &&
        !child.classList.contains("v6-jj-dock") &&
        !child.classList.contains("jj-panel") &&
        child.id !== "jj-render-btn" &&
        child.id !== "jj-output-video" &&
        child.id !== "jj-download"
      ) {
        child.style.setProperty("display", "none", "important");
      }
    });
    const outVid = document.getElementById("jj-output-video");
    const dlBtn = document.getElementById("jj-download");
    if (outVid && !outVid.getAttribute("src")) outVid.style.setProperty("display", "none", "important");
    if (dlBtn && !dlBtn.getAttribute("href")) dlBtn.style.setProperty("display", "none", "important");
  }

  window.openV6BugModal = function () {
    document.getElementById("v6BugModal")?.classList.add("is-open");
  };
  window.closeV6BugModal = function () {
    document.getElementById("v6BugModal")?.classList.remove("is-open");
  };

  // Reveal Hasil Generate section automatically once #results receives content
  const resultsEl = document.getElementById("results");
  if (resultsEl && typeof MutationObserver !== "undefined") {
    new MutationObserver(() => {
      const hasItems = !resultsEl.classList.contains("empty-state") && resultsEl.children.length > 0 && !resultsEl.textContent.includes("Hasil generate akan muncul di sini.");
      const head = document.getElementById("v6ResultsHead");
      if (head) head.classList.toggle("is-empty", !hasItems);
    }).observe(resultsEl, { childList: true, attributes: true });
  }

  window.toggleV6Notif = function () {
    document.getElementById("v6NotifPopover")?.classList.toggle("is-open");
  };

  window.addEventListener("load", () => {
    const allJJ = document.querySelectorAll("#page-jedagjedug .jj-panel");
    allJJ.forEach((p, i) => {
      if (i > 0) {
        p.classList.add("v6-jj-step-panel");
        if (i === 1) p.classList.add("is-open");
      }
    });
    cleanV6JJChrome();
    setTimeout(cleanV6JJChrome, 250);
    const firstDock = document.querySelector(".v6-jj-dock-btn");
    if (firstDock) window.scrollV6JJPanel(1, firstDock);
    const startPage = (location.hash || "").replace(/^#/, "") || "home";
    window.go(document.getElementById("page-" + startPage) ? startPage : "home", false);
    window.renderCredits();
    window.renderRecent();
    syncV6ProfilePage();
    if (window.Clerk?.addListener) window.Clerk.addListener(() => syncV6ProfilePage());
  });
})();




/* === V6_CLERK_AND_CREDIT_SYNC_ENGINE === */
(function () {
  "use strict";

  const CLERK_PK = "pk_test_ZmluZS10b2FkLTYzNDYuY2xlcmsuYWNjb3VudHMuZGV2JA";
  let clerkBootPromise = null;

  function getInitials(name) {
    const clean = String(name || "").trim();
    if (!clean) return "CH";
    const parts = clean.split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  function applyCreditsToAllUI(credits) {
    const num = Number(credits);
    if (Number.isNaN(num)) return;
    window.__v6SyncedCredits = num;
    window.userCredits = num;

    // 1. Header Credit Chip
    const chip = document.querySelector(".v6-credit-chip");
    if (chip) {
      chip.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#FBBF24;display:inline-block;"></span> <span>' + num + '</span>';
    }

    // 2. Beranda Wallet Card
    const walletVal = document.querySelector(".v6-wallet-value");
    if (walletVal) walletVal.textContent = String(num);

    // 3. Profil & Legacy Elements
    document.querySelectorAll("#v6ProfileCredits, .v6-profile-credits, #credits, #creditCount, #creditBalance").forEach((el) => {
      el.textContent = String(num);
    });
  }

  function applyClerkProfileToAllUI(user) {
    const signedIn = Boolean(user);
    const fullName = signedIn
      ? (user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress.split("@")[0]) || "Kreator")
      : "Kreator";
    const email = signedIn
      ? ((user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress) || "Akun Clerk Terhubung")
      : "Ketuk avatar untuk masuk Clerk";
    const imageUrl = signedIn ? (user.imageUrl || "") : "";
    const initials = getInitials(fullName);

    const greetH2 = document.querySelector(".v6-greeting-row h2");
    if (greetH2) greetH2.textContent = "Halo, " + fullName + " 👋";

    const hdrAvatar = document.querySelector(".v6-avatar-btn");
    if (hdrAvatar) {
      hdrAvatar.title = signedIn ? fullName : "Masuk Akun Clerk";
      hdrAvatar.innerHTML = imageUrl ? '<img src="' + imageUrl + '" alt="' + initials + '">' : initials;
    }

    const profRing = document.querySelector(".v6-profile-ring-inner");
    if (profRing) {
      profRing.innerHTML = imageUrl ? '<img src="' + imageUrl + '" alt="' + initials + '">' : initials;
    }

    const profName = document.getElementById("v6ProfileName") || document.querySelector(".v6-profile-top strong, .v6-profile-top h3");
    if (profName) profName.textContent = fullName;

    const profEmail = document.getElementById("v6ProfileEmail") || document.querySelector(".v6-profile-top p");
    if (profEmail) profEmail.textContent = email;

    const authLabel = document.getElementById("v6AuthMenuLabel");
    if (authLabel) {
      authLabel.textContent = signedIn ? "Keluar Akun (" + fullName + ")" : "Masuk / Daftar dengan Clerk";
    }
  }

  async function ensureClerkReady() {
    if (clerkBootPromise) return clerkBootPromise;
    clerkBootPromise = (async () => {
      for (let i = 0; i < 40; i++) {
        if (window.Clerk) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      const clerk = window.Clerk;
      if (!clerk) return null;
      if (!clerk.loaded && typeof clerk.load === "function") {
        await clerk.load(CLERK_PK ? { publishableKey: CLERK_PK } : undefined);
      }
      return clerk;
    })();
    return clerkBootPromise;
  }

  window.syncV6ClerkAndCredits = async function () {
    try {
      const clerk = await ensureClerkReady();
      if (!clerk) return;

      applyClerkProfileToAllUI(clerk.user || null);

      if (!clerk.user || !clerk.session) {
        applyCreditsToAllUI(0);
        return;
      }

      const token = await clerk.session.getToken();
      if (!token) return;

      const res = await fetch("/api/credits", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + token
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.credits === "number") {
          applyCreditsToAllUI(data.credits);
        }
      } else {
        console.warn("[CH Credits] HTTP", res.status);
      }
    } catch (err) {
      console.warn("[CH Sync Error]", err);
    }
  };

  window.handleV6AuthMenuClick = async function () {
    const clerk = await ensureClerkReady();
    if (!clerk) {
      const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      const isLiveKey = CLERK_PK.startsWith("pk_live_");
      if (isLocal && isLiveKey) {
        alert("Clerk menggunakan key produksi (pk_live_) yang hanya berjalan di domain https://ch-ai-studio.vercel.app. Saat deploy ke Vercel, login Clerk & kredit otomatis aktif.");
      } else {
        alert("SDK Clerk belum siap. Periksa koneksi internet Anda lalu muat ulang halaman.");
      }
      return;
    }

    if (clerk.user) {
      await clerk.signOut();
      applyClerkProfileToAllUI(null);
      applyCreditsToAllUI(0);
    } else if (typeof clerk.openSignIn === "function") {
      clerk.openSignIn();
    }
  };

  // Ketuk avatar header: buka Sign In Clerk jika belum masuk
  document.addEventListener("click", async function (ev) {
    const avatarBtn = ev.target.closest(".v6-avatar-btn");
    if (!avatarBtn) return;
    const clerk = await ensureClerkReady();
    if (clerk && !clerk.user && typeof clerk.openSignIn === "function") {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      clerk.openSignIn();
    }
  }, true);

  // Pantau perubahan sesi Clerk secara real-time (setelah login / logout)
  ensureClerkReady().then((clerk) => {
    if (!clerk) return;
    window.syncV6ClerkAndCredits();
    if (typeof clerk.addListener === "function") {
      clerk.addListener(() => {
        window.syncV6ClerkAndCredits();
      });
    }
  });

  // Sinkronkan ulang kredit otomatis setiap selesai transaksi / generate API
  if (typeof window.fetch === "function" && !window.__v6CreditFetchHook) {
    window.__v6CreditFetchHook = true;
    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const res = await origFetch(input, init);
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (
        url.includes("/api/generate") ||
        url.includes("/api/use-credit") ||
        url.includes("/api/midtrans") ||
        url.includes("/api/storytelling")
      ) {
        res.clone().json().then((data) => {
          if (data && typeof data.credits === "number") {
            applyCreditsToAllUI(data.credits);
          } else {
            setTimeout(() => window.syncV6ClerkAndCredits(), 700);
          }
        }).catch(() => {});
      }
      return res;
    };
  }
})();
