(function () {
  "use strict";

  const STORAGE_KEY = "ch_storytelling_projects_v1";
  const CHAR_KEY = "ch_storytelling_saved_chars_v1";

  function loadProjects() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  }
  function saveProjects(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function loadSavedChars() {
    try { return JSON.parse(localStorage.getItem(CHAR_KEY) || "[]"); } catch { return []; }
  }
  function saveSavedChars(list) {
    localStorage.setItem(CHAR_KEY, JSON.stringify(list));
  }

  let activeProjectId = null;

  window.openStorytellingStudio = function () {
    if (typeof window.go === "function") {
      window.go("storytelling");
    } else {
      document.querySelectorAll("section.page").forEach((s) => s.classList.remove("active"));
      document.getElementById("page-storytelling")?.classList.add("active");
    }
    switchStorytellingRoom("projects");
    renderSTProjects();
  };

  window.switchStorytellingRoom = function (room, tabBtn) {
    document.querySelectorAll(".st-room-tab").forEach((b) => b.classList.remove("is-active"));
    if (tabBtn) {
      tabBtn.classList.add("is-active");
    } else {
      const target = document.querySelector(`.st-room-tab[data-st-room="${room}"]`);
      if (target) target.classList.add("is-active");
    }
    document.querySelectorAll(".st-view").forEach((v) => v.classList.remove("is-active"));
    document.getElementById(`st-view-${room}`)?.classList.add("is-active");

    if (room === "projects") renderSTProjects();
    if (room === "character") renderSTCharacterRoom();
    if (room === "storyboard") renderSTStoryboard();
    if (room === "subtitle") renderSTSubtitles();
  };

  function getActiveProject() {
    const list = loadProjects();
    return list.find((p) => p.id === activeProjectId) || list[0] || null;
  }

  function updateProject(mutator) {
    const list = loadProjects();
    const idx = list.findIndex((p) => p.id === activeProjectId);
    if (idx === -1) return null;
    mutator(list[idx]);
    saveProjects(list);
    return list[idx];
  }

  function computeProgress(proj) {
    if (!proj || !Array.isArray(proj.scenes) || proj.scenes.length === 0) return 0;
    const totalSteps = proj.scenes.length * 2;
    let done = 0;
    proj.scenes.forEach((sc) => {
      if (sc.imageStatus === "Completed") done += 1;
      if (sc.videoStatus === "Completed") done += 1;
    });
    return Math.round((done / totalSteps) * 100);
  }

  window.renderSTProjects = function () {
    const wrap = document.getElementById("stProjectsList");
    if (!wrap) return;
    const list = loadProjects();
    if (!list.length) {
      wrap.innerHTML = `
        <div class="v6-card" style="text-align:center;padding:22px 14px;">
          <p style="margin:0 0 10px;font-size:0.78rem;color:var(--v6-dim);">Belum ada proyek film AI. Mulai dengan membuat cerita baru.</p>
          <button type="button" class="v6-cta-full" onclick="switchStorytellingRoom('creator')">＋ Create New Story</button>
        </div>`;
      return;
    }

    wrap.innerHTML = list.map((p) => {
      const pct = computeProgress(p);
      const firstThumb = (p.scenes || []).find((s) => s.imageUrl)?.imageUrl;
      return `
        <div class="st-project-card">
          <div class="st-project-top">
            <div class="st-project-thumb">
              ${firstThumb ? `<img src="${firstThumb}" alt="">` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <strong style="font-size:0.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title)}</strong>
                <span class="st-status-pill st-status-${(p.status || 'waiting').toLowerCase()}">${escapeHtml(p.status || 'Draft')}</span>
              </div>
              <div class="st-meta-chips">
                <span class="st-chip">${p.duration || 30} dtk</span>
                <span class="st-chip">${(p.scenes || []).length} scene</span>
                <span class="st-chip">${escapeHtml(p.ratio || '9:16')}</span>
                <span class="st-chip">${escapeHtml(p.createdAt || '')}</span>
              </div>
            </div>
          </div>
          <div class="st-progress-track"><div class="st-progress-fill" style="width:${pct}%"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--v6-dim);margin-bottom:8px;">
            <span>Progress Produksi</span>
            <strong>${pct}%</strong>
          </div>
          <div class="v6-mini-actions">
            <button type="button" class="v6-mini-btn" style="background:rgba(139,53,255,0.24);border-color:rgba(139,53,255,0.5);" onclick="continueSTProject('${p.id}')">Continue</button>
            <button type="button" class="v6-mini-btn" onclick="duplicateSTProject('${p.id}')">Duplicate</button>
            <button type="button" class="v6-mini-btn danger" onclick="deleteSTProject('${p.id}')">Delete</button>
          </div>
        </div>`;
    }).join("");
  };

  window.continueSTProject = function (id) {
    activeProjectId = id;
    switchStorytellingRoom("storyboard");
  };

  window.duplicateSTProject = function (id) {
    const list = loadProjects();
    const src = list.find((p) => p.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = "st_" + Date.now();
    copy.title = src.title + " (Copy)";
    copy.createdAt = new Date().toLocaleDateString("id-ID");
    list.unshift(copy);
    saveProjects(list);
    renderSTProjects();
  };

  window.deleteSTProject = function (id) {
    const next = loadProjects().filter((p) => p.id !== id);
    saveProjects(next);
    if (activeProjectId === id) activeProjectId = next[0]?.id || null;
    renderSTProjects();
  };

  window.saveSTCharacter = function (e) {
    e.preventDefault();
    const charObj = {
      id: "char_" + Date.now(),
      name: document.getElementById("stCharName").value.trim(),
      physical: document.getElementById("stCharPhysical").value.trim(),
      outfit: document.getElementById("stCharOutfit").value.trim(),
      expression: document.getElementById("stCharExpression").value.trim(),
      personality: document.getElementById("stCharPersonality").value.trim(),
      voice: document.getElementById("stCharVoice").value.trim(),
      refImage: document.getElementById("stCharRefData").value || ""
    };
    if (!charObj.name) return;
    const saved = loadSavedChars();
    saved.unshift(charObj);
    saveSavedChars(saved);

    if (activeProjectId) {
      updateProject((p) => { p.character = charObj; });
    }
    renderSTCharacterRoom();
  };

  window.handleSTCharFile = function (input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("stCharRefData").value = reader.result;
      const prev = document.getElementById("stCharRefPreview");
      if (prev) {
        prev.src = reader.result;
        prev.style.display = "block";
      }
    };
    reader.readAsDataURL(file);
  };

  window.renderSTCharacterRoom = function () {
    const proj = getActiveProject();
    const lockEl = document.getElementById("stActiveCharLock");
    if (lockEl) {
      if (proj && proj.character) {
        lockEl.innerHTML = `<strong>Karakter Terkunci untuk "${escapeHtml(proj.title)}":</strong> ${escapeHtml(proj.character.name)} — ${escapeHtml(proj.character.physical)}, ${escapeHtml(proj.character.outfit)}`;
      } else {
        lockEl.textContent = "Belum ada karakter terkunci pada proyek aktif. Simpan atau pilih karakter di bawah agar konsisten di semua scene.";
      }
    }
    const listEl = document.getElementById("stSavedCharsList");
    if (!listEl) return;
    const chars = loadSavedChars();
    listEl.innerHTML = chars.length ? chars.map((c) => `
      <div class="v6-card" style="padding:9px 11px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div>
            <strong style="font-size:0.8rem;">${escapeHtml(c.name)}</strong>
            <p style="margin:2px 0 0;font-size:0.66rem;color:var(--v6-dim);">${escapeHtml(c.physical)} • ${escapeHtml(c.outfit)}</p>
          </div>
          <button type="button" class="v6-inline-action-btn" onclick="bindCharToProject('${c.id}')">Pakai</button>
        </div>
      </div>`).join("") : `<p style="font-size:0.7rem;color:var(--v6-muted);">Belum ada karakter tersimpan.</p>`;
  };

  window.bindCharToProject = function (charId) {
    const c = loadSavedChars().find((item) => item.id === charId);
    if (!c || !activeProjectId) return;
    updateProject((p) => { p.character = c; });
    renderSTCharacterRoom();
  };

  window.createSTProjectFromForm = async function (e) {
    e.preventDefault();
    const title = document.getElementById("stTitle").value.trim();
    const idea = document.getElementById("stIdea").value.trim();
    const category = document.getElementById("stCategory").value;
    const language = document.getElementById("stLanguage").value;
    const duration = Number(document.getElementById("stDuration").value) || 30;
    const sceneCount = Math.max(1, Math.min(12, Number(document.getElementById("stSceneCount").value) || 5));
    const style = document.getElementById("stVisualStyle").value;
    const ratio = document.getElementById("stRatio").value;
    const mood = document.getElementById("stMood").value;
    const narrationMode = document.getElementById("stNarrationMode").value;
    const dialogueMode = document.getElementById("stDialogueMode").value;

    const statusEl = document.getElementById("stCreatorStatus");
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.textContent = "Menyiapkan cerita & menyusun storyboard terstruktur...";
    }

    const savedChar = loadSavedChars()[0] || {
      name: "Tokoh Utama",
      physical: "Wajah ekspresif, pencahayaan sinematik",
      outfit: "Jaket modern minimalis",
      expression: "Fokus dan emosional",
      personality: "Berani",
      voice: "Hangat & jelas"
    };

    const perSceneSec = Math.max(3, Math.round(duration / sceneCount));
    const charLockPrompt = `${savedChar.name}, ${savedChar.physical}, wearing ${savedChar.outfit}`;

    let generatedStory = null;
    try {
      const resp = await fetch("/api/storytelling/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, idea, category, language, duration, sceneCount, style, ratio, mood, narrationMode, dialogueMode, character: savedChar
        })
      });
      if (resp.ok) {
        generatedStory = await resp.json();
      }
    } catch (_) {
      // Backend endpoint will be wired in Tahap 3 after repository audit
    }

    const scenes = (generatedStory && Array.isArray(generatedStory.scenes) && generatedStory.scenes.length)
      ? generatedStory.scenes
      : Array.from({ length: sceneCount }, (_, idx) => {
          const n = idx + 1;
          const arcLabels = ["Hook Pembuka", "Pengenalan Konflik", "Ketegangan Meningkat", "Klimaks Emosional", "Resolusi & Pesan"];
          const label = arcLabels[idx] || `Adegan ${n}`;
          return {
            id: `sc_${Date.now()}_${n}`,
            number: n,
            title: `${label} — ${title}`,
            description: `${idea} (Bagian ${n}/${sceneCount}: ${label})`,
            duration: perSceneSec,
            character: savedChar.name,
            location: "Lokasi sinematik sesuai alur",
            action: `Aksi utama adegan ${n}`,
            expression: savedChar.expression,
            cameraAngle: n === 1 ? "Wide Establishing Shot" : "Medium Close-Up",
            cameraMovement: n % 2 === 1 ? "Slow Dolly In" : "Smooth Tracking Pan",
            lighting: `${mood} cinematic rim lighting`,
            imagePrompt: `Single frame cinematic still, ${style}, ${charLockPrompt}, ${idea}, scene ${n} ${label}, ${mood} lighting, 8k film grain, no collage, single scene only`,
            videoPrompt: `Smooth ${perSceneSec}s cinematic motion, ${n % 2 === 1 ? "slow dolly in" : "gentle camera pan"}, natural character breathing and movement, ${mood} atmosphere`,
            negativePrompt: "collage, split screen, multi-panel, grid, blurry, deformed hands, watermark, text overlay",
            narration: narrationMode === "off" ? "" : `Narasi adegan ${n}: ${idea}.`,
            dialogue: dialogueMode === "off" ? "" : `${savedChar.name}: "Kita harus melangkah sekarang."`,
            soundEffect: "Ambient cinematic whoosh & subtle atmosphere",
            imageStatus: "Waiting",
            videoStatus: "Waiting",
            imageUrl: "",
            videoUrl: ""
          };
        });

    const newProj = {
      id: "st_" + Date.now(),
      title: generatedStory?.title || title,
      idea,
      hook: generatedStory?.hook || `Pembuka kuat untuk ${title}`,
      synopsis: generatedStory?.synopsis || idea,
      conflict: generatedStory?.conflict || "Konflik utama cerita",
      climax: generatedStory?.climax || "Titik puncak cerita",
      ending: generatedStory?.ending || "Penutup berkesan",
      message: generatedStory?.message || "Pesan moral cerita",
      category,
      language,
      duration,
      style,
      ratio,
      mood,
      narrationMode,
      dialogueMode,
      character: savedChar,
      status: "Ready",
      createdAt: new Date().toLocaleDateString("id-ID"),
      scenes
    };

    const list = loadProjects();
    list.unshift(newProj);
    saveProjects(list);
    activeProjectId = newProj.id;

    if (statusEl) statusEl.style.display = "none";
    switchStorytellingRoom("storyboard");
  };

  window.renderSTStoryboard = function () {
    const proj = getActiveProject();
    const headEl = document.getElementById("stStoryboardHeader");
    const listEl = document.getElementById("stScenesList");
    if (!headEl || !listEl) return;

    if (!proj) {
      headEl.innerHTML = `<p style="margin:0;font-size:0.75rem;color:var(--v6-dim);">Pilih atau buat proyek terlebih dahulu di tab <strong>Story Creator</strong>.</p>`;
      listEl.innerHTML = "";
      return;
    }

    headEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px;">
        <div style="min-width:0;">
          <strong style="font-size:0.86rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(proj.title)}</strong>
          <span style="font-size:0.65rem;color:var(--v6-dim);">${proj.scenes.length} Scene • ${proj.duration}s • ${escapeHtml(proj.ratio)} • Karakter: ${escapeHtml(proj.character?.name || '-')}</span>
        </div>
        <button type="button" class="v6-inline-action-btn" onclick="addSTScene()">＋ Scene</button>
      </div>
      <button type="button" class="v6-cta-full" style="min-height:36px;font-size:0.76rem;" onclick="generateAllSTImages()">✦ Generate All Images (${proj.scenes.length} Scene)</button>
    `;

    listEl.innerHTML = proj.scenes.map((sc, idx) => `
      <div class="st-scene-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <strong style="font-size:0.8rem;">Scene ${sc.number}: ${escapeHtml(sc.title)}</strong>
          <div style="display:flex;gap:4px;">
            <span class="st-status-pill st-status-${sc.imageStatus.toLowerCase()}">Img: ${sc.imageStatus}</span>
            <span class="st-status-pill st-status-${sc.videoStatus.toLowerCase()}">Vid: ${sc.videoStatus}</span>
          </div>
        </div>
        <p style="margin:4px 0;font-size:0.68rem;color:var(--v6-dim);">${escapeHtml(sc.description)}</p>
        <div class="st-meta-chips">
          <span class="st-chip">${sc.duration}s</span>
          <span class="st-chip">${escapeHtml(sc.cameraAngle)}</span>
          <span class="st-chip">${escapeHtml(sc.cameraMovement)}</span>
          <span class="st-chip">${escapeHtml(sc.lighting)}</span>
        </div>
        <div class="st-scene-media">
          ${sc.videoUrl ? `<video src="${sc.videoUrl}" controls playsinline></video>` : (sc.imageUrl ? `<img src="${sc.imageUrl}" alt="Scene ${sc.number}">` : `<span style="font-size:0.68rem;color:var(--v6-muted);">1 Scene = 1 Gambar Terpisah (${escapeHtml(proj.ratio)})</span>`)}
        </div>
        <label class="st-label">Image Prompt (Single Scene — Karakter Terkunci)</label>
        <textarea class="v6-textarea" rows="2" onchange="editSTSceneField(${idx}, 'imagePrompt', this.value)">${escapeHtml(sc.imagePrompt)}</textarea>
        <label class="st-label">Motion / Video Prompt</label>
        <input type="text" class="v6-input" value="${escapeHtml(sc.videoPrompt)}" onchange="editSTSceneField(${idx}, 'videoPrompt', this.value)">
        <label class="st-label">Narasi & Dialog</label>
        <input type="text" class="v6-input" value="${escapeHtml(sc.narration)}" onchange="editSTSceneField(${idx}, 'narration', this.value)">
        <div class="v6-mini-actions" style="margin-top:4px;">
          <button type="button" class="v6-mini-btn" onclick="generateSingleSTImage(${idx})">${sc.imageUrl ? 'Regenerate Img' : 'Generate Img'}</button>
          <button type="button" class="v6-mini-btn" onclick="generateSingleSTVideo(${idx})">${sc.videoUrl ? 'Regenerate Vid' : 'Generate Vid'}</button>
          <button type="button" class="v6-mini-btn" onclick="moveSTScene(${idx}, -1)">↑</button>
          <button type="button" class="v6-mini-btn" onclick="moveSTScene(${idx}, 1)">↓</button>
          <button type="button" class="v6-mini-btn danger" onclick="deleteSTScene(${idx})">Hapus</button>
        </div>
      </div>`).join("");
  };

  window.editSTSceneField = function (idx, field, val) {
    updateProject((p) => { if (p.scenes[idx]) p.scenes[idx][field] = val; });
  };

  window.addSTScene = function () {
    updateProject((p) => {
      const n = p.scenes.length + 1;
      const charLock = p.character ? `${p.character.name}, ${p.character.physical}, wearing ${p.character.outfit}` : "Main character";
      p.scenes.push({
        id: `sc_${Date.now()}_${n}`,
        number: n,
        title: `Adegan Tambahan ${n}`,
        description: "Deskripsi adegan baru",
        duration: 6,
        character: p.character?.name || "Tokoh Utama",
        location: "Lokasi cerita",
        action: "Aksi adegan",
        expression: "Ekspresif",
        cameraAngle: "Medium Shot",
        cameraMovement: "Slow Push In",
        lighting: "Cinematic lighting",
        imagePrompt: `Single frame cinematic still, ${p.style}, ${charLock}, single scene only, no collage`,
        videoPrompt: "Smooth 6s cinematic camera movement",
        negativePrompt: "collage, split screen, grid, watermark, blurry",
        narration: "",
        dialogue: "",
        soundEffect: "Ambient tone",
        imageStatus: "Waiting",
        videoStatus: "Waiting",
        imageUrl: "",
        videoUrl: ""
      });
    });
    renderSTStoryboard();
  };

  window.deleteSTScene = function (idx) {
    updateProject((p) => {
      p.scenes.splice(idx, 1);
      p.scenes.forEach((s, i) => { s.number = i + 1; });
    });
    renderSTStoryboard();
  };

  window.moveSTScene = function (idx, dir) {
    updateProject((p) => {
      const target = idx + dir;
      if (target < 0 || target >= p.scenes.length) return;
      const tmp = p.scenes[idx];
      p.scenes[idx] = p.scenes[target];
      p.scenes[target] = tmp;
      p.scenes.forEach((s, i) => { s.number = i + 1; });
    });
    renderSTStoryboard();
  };

  window.generateSingleSTImage = async function (idx) {
    const proj = getActiveProject();
    if (!proj || !proj.scenes[idx]) return;
    updateProject((p) => { p.scenes[idx].imageStatus = "Processing"; });
    renderSTStoryboard();

    try {
      const resp = await fetch("/api/storytelling/generate-scene-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: proj.id,
          scene: proj.scenes[idx],
          character: proj.character,
          ratio: proj.ratio,
          style: proj.style
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.imageUrl) throw new Error(data.error || "Endpoint belum terhubung");
      updateProject((p) => {
        p.scenes[idx].imageUrl = data.imageUrl;
        p.scenes[idx].imageStatus = "Completed";
      });
    } catch (err) {
      updateProject((p) => { p.scenes[idx].imageStatus = "Failed"; });
      alert("Generate Image Scene gagal: " + err.message + " (Akan dihubungkan penuh pada Tahap 4 setelah audit API)");
    }
    renderSTStoryboard();
  };

  window.generateAllSTImages = async function () {
    const proj = getActiveProject();
    if (!proj) return;
    for (let i = 0; i < proj.scenes.length; i++) {
      await window.generateSingleSTImage(i);
    }
  };

  window.generateSingleSTVideo = async function (idx) {
    const proj = getActiveProject();
    if (!proj || !proj.scenes[idx]) return;
    if (!proj.scenes[idx].imageUrl) {
      alert("Buat gambar scene ini terlebih dahulu sebelum Generate Video.");
      return;
    }
    updateProject((p) => { p.scenes[idx].videoStatus = "Processing"; });
    renderSTStoryboard();

    try {
      const resp = await fetch("/api/storytelling/generate-scene-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: proj.id,
          scene: proj.scenes[idx],
          ratio: proj.ratio
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.videoUrl) throw new Error(data.error || "Endpoint DeAPI Storytelling belum terhubung");
      updateProject((p) => {
        p.scenes[idx].videoUrl = data.videoUrl;
        p.scenes[idx].videoStatus = "Completed";
      });
    } catch (err) {
      updateProject((p) => { p.scenes[idx].videoStatus = "Failed"; });
      alert("Generate Video Scene gagal: " + err.message + " (Akan dihubungkan ke DeAPI pada Tahap 5 setelah audit API)");
    }
    renderSTStoryboard();
  };

  window.renderSTSubtitles = function () {
    const proj = getActiveProject();
    const wrap = document.getElementById("stSubtitleList");
    if (!wrap) return;
    if (!proj) {
      wrap.innerHTML = `<p style="font-size:0.72rem;color:var(--v6-muted);">Belum ada proyek aktif.</p>`;
      return;
    }
    let cursor = 0;
    wrap.innerHTML = proj.scenes.map((sc, idx) => {
      const start = cursor;
      const end = cursor + (Number(sc.duration) || 6);
      cursor = end;
      return `
        <div class="v6-card" style="padding:9px 11px;">
          <div style="display:flex;justify-content:space-between;font-size:0.66rem;color:#7CC0FF;margin-bottom:4px;">
            <strong>Scene ${sc.number}</strong>
            <span>00:0${start} → 00:${end < 10 ? '0' + end : end}</span>
          </div>
          <input type="text" class="v6-input" style="margin-bottom:0;" value="${escapeHtml(sc.narration || sc.dialogue || sc.description)}" onchange="editSTSceneField(${idx}, 'narration', this.value)">
        </div>`;
    }).join("");
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
