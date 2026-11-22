
// =========================
// REFERENCE IMAGE PREVIEW
// =========================
window.previewRef = function(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("File harus berupa gambar.");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById("refPreview");
    const img = document.getElementById("refImg");
    if (preview && img) {
      img.src = e.target.result;
      preview.classList.remove("hidden");
    }
  };
  reader.readAsDataURL(file);
};

let KEY = "ch_ai_studio_state";

let state;

try {
  state = JSON.parse(localStorage.getItem(KEY)) || {
    credits: 0,
    assets: [],
    projects: [],
    mode: "image"
  };
} catch {
  state = {
    credits: 0,
    assets: [],
    projects: [],
    mode: "image"
  };
}


function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  renderCredits();
  renderRecent();
  renderAssets();
  renderProjects();
}

function renderCredits() {
  const num = Math.max(0, Number(state.credits || 0));
  const a = document.getElementById("topCredits");
  const b = document.getElementById("sideCredits");
  if (a) a.textContent = String(num);
  if (b) b.textContent = String(num);

  const walletVal = document.querySelector(".v6-wallet-value");
  if (walletVal) walletVal.textContent = String(num);

  const profMain = document.getElementById("ch-profile-credits");
  if (profMain) profMain.textContent = String(num);

  document.querySelectorAll("#v6ProfileCredits, .v6-profile-credits, #credits, #creditCount, #creditBalance").forEach((el) => {
    el.textContent = String(num);
  });
}

async function getFreshClerkToken(forceRefresh = false) {
  if (!window.Clerk?.session) return null;
  try {
    return await window.Clerk.session.getToken(forceRefresh ? { skipCache: true } : undefined);
  } catch {
    return null;
  }
}

async function syncCredits() {
  if (!window.Clerk?.user) {
    KEY = "ch_ai_studio_state";
    state = { credits: 0, assets: [], projects: [], mode: "image" };
    renderCredits();
    renderRecent();
    renderAssets();
    renderProjects();
    return;
  }
  const accountKey = "ch_ai_studio_state_" + Clerk.user.id;
  if (KEY !== accountKey) {
    const saved = JSON.parse(localStorage.getItem(accountKey) || "null");
    KEY = accountKey;
    state.credits = 0;
    state.assets = Array.isArray(saved?.assets) ? saved.assets : [];
    state.projects = Array.isArray(saved?.projects) ? saved.projects : [];
    state.mode = saved?.mode || "image";
    renderCredits();
    renderRecent();
    renderAssets();
    renderProjects();
  }

  try {
    let token = await getFreshClerkToken(false);
    if (!token) return;

    let response = await fetch("/api/credits", {
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + token
      }
    });

    if (response.status === 401) {
      token = await getFreshClerkToken(true);
      if (token) {
        response = await fetch("/api/credits", {
          headers: {
            "Accept": "application/json",
            "Authorization": "Bearer " + token
          }
        });
      }
    }

    if (!response.ok) {
      console.warn("Sync credits HTTP:", response.status);
      return;
    }

    const data = await response.json();
    state.credits = Number(data.credits ?? 0);
    localStorage.setItem(KEY, JSON.stringify(state));
    renderCredits();
  } catch (error) {
    console.error("Sync credits:", error);
  }
}
window.syncCredits = syncCredits;
window.renderCredits = renderCredits;
setTimeout(() => { if (typeof syncCredits === "function") syncCredits(); }, 1500);
setTimeout(() => { if (typeof syncCredits === "function") syncCredits(); }, 4000);

async function useCredit(cost) {
  if (!window.Clerk?.user) return false;

  let token = await getFreshClerkToken(false);
  if (!token) return false;

  let response = await fetch("/api/use-credit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ cost })
  });

  if (response.status === 401) {
    token = await getFreshClerkToken(true);
    if (token) {
      response = await fetch("/api/use-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ cost })
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    if (typeof data.credits === "number") {
      state.credits = Number(data.credits);
      renderCredits();
    }
    return false;
  }

  state.credits = Number(data.credits ?? 0);
  renderCredits();
  localStorage.setItem(KEY, JSON.stringify(state));
  return true;
}
function renderRecent() {
  const el = document.getElementById("recentGrid");
  if (!el) return;

  if (!state.assets.length) {
    el.innerHTML = "<p>Belum ada hasil AI.</p>";
    return;
  }

  el.innerHTML = state.assets
    .slice(0, 6)
    .map(item => {
      if (item.type === "video" || item.video) {
        return `
          <div class="asset-card">
            <video src="${item.video}" controls playsinline style="width:100%;border-radius:12px;"></video>
            <div><small>${item.prompt}</small></div>
          </div>
        `;
      }

      return `
        <div class="asset-card">
          <img src="${item.image}" alt="AI Image">
          <div><small>${item.prompt}</small></div>
        </div>
      `;
    })
    .join("");
}

function renderAssets() {
  const el = document.getElementById("assetGrid");
  if (!el) return;

  if (!state.assets.length) {
    el.innerHTML = "<p>Belum ada asset.</p>";
    return;
  }

  el.innerHTML = state.assets
    .map(item => {
      if (item.type === "video" || item.video) {
        return `
          <div class="asset-card">
            <video src="${item.video}" controls playsinline style="width:100%;border-radius:12px;"></video>
            <p>${item.prompt}</p>
            <a href="${item.video}" download="ch-ai-studio-video.mp4">
              Download Video
            </a>
          </div>
        `;
      }

      return `
        <div class="asset-card">
          <img src="${item.image}" alt="AI Image">
          <p>${item.prompt}</p>
          <a href="${item.image}" download="ch-ai-studio.jpg">
            Download Gambar
          </a>
        </div>
      `;
    })
    .join("");
}

function renderProjects() {
  const el = document.getElementById("projectList");
  if (!el) return;

  if (!state.projects.length) {
    el.innerHTML = "<p>Belum ada project.</p>";
    return;
  }

  el.innerHTML = state.projects
    .map(
      project => `
        <div class="project-card">
          <h3>${project.name}</h3>
          <p>${project.created}</p>
        </div>
      `
    )
    .join("");
}

async function generateImage() {
  const input =
    document.getElementById("prompt") ||
    document.querySelector("textarea");

  if (!input) {
    alert("Kolom prompt tidak ditemukan.");
    return;
  }

  const prompt = input.value.trim();

  if (!prompt) {
    alert("Tulis prompt terlebih dahulu.");
    input.focus();
    return;
  }


  const button =
    document.getElementById("generateBtn") ||
    document.querySelector("[data-generate]");

  if (button) {
    button.disabled = true;
    button.textContent = "Membuat gambar...";
  }

  try {
    const refFile = document.getElementById("refFile");
    let referenceImage = null;

    if (refFile && refFile.files && refFile.files[0]) {
      referenceImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(refFile.files[0]);
      });
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        model: document.getElementById("model")?.value || "CH Image",
        ratio: document.getElementById("ratio")?.value || "9:16",
        resolution: document.getElementById("resolution")?.value || "1K",
        count: Number(document.getElementById("count")?.value || 1),
        image_b64: referenceImage
      })
    });

    const data = await response.json();

    if (!response.ok || !data.image) {
      throw new Error(data.error || "Gagal membuat gambar.");
    }

    if (!(await useCredit(1))) { throw new Error("Credit tidak cukup."); }

    state.assets.unshift({
      image: data.image,
      type: "image",
      prompt,
      created: new Date().toLocaleString("id-ID")
    });

    state.projects.unshift({
      name: prompt.slice(0, 40),
      created: new Date().toLocaleString("id-ID")
    });

    save();

    showGeneratedImage(data.images || [data.image]);

  } catch (error) {
    console.error(error);
    alert(error.message || "Terjadi kesalahan saat membuat gambar.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Generate Image";
    }
  }
}

function showGeneratedImage(images) {
  const list = Array.isArray(images) ? images : [images];
  const validImages = list.filter(Boolean);

  if (!validImages.length) return;

  state.lastGeneratedImage = validImages[0];

  const container = document.getElementById("results");
  if (!container) return;

  container.innerHTML = `
    <div class="generated-result">
      <h3>Hasil AI</h3>
      <div style="display:grid;gap:16px;">
        ${validImages.map((image, index) => `
          <div>
            <img
              src="${image}"
              alt="Generated AI Image ${index + 1}"
              style="max-width:100%;border-radius:16px;"
            >
            <br><br>
            <a href="${image}" download="ch-ai-studio-${index + 1}.jpg">
              Download Gambar ${index + 1}
            </a>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  container.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}
function setupGenerateButton() {
  const button =
    document.getElementById("generateBtn") ||
    document.querySelector("[data-generate]");

  if (button) {
    button.addEventListener("click", async () => {
      if (!window.Clerk?.user) {
        showToast("Silakan login untuk mendapatkan 14 credit gratis.");
        return;
      }
      const requiredCredits = state.mode === "video" ? 10 : 1;
      if (Number(state.credits) < requiredCredits) {
        showToast(`Credit tidak cukup. Butuh ${requiredCredits} credit.`);
        return;
      }
      await generate();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderCredits();
  renderRecent();
  renderAssets();
  renderProjects();
  setupGenerateButton();

  // Mode awal Generate selalu Gambar.
  setMode("image");
  syncCredits();
});


async function generateVideo() {
  const input = document.getElementById("prompt");
  const button = document.getElementById("generateBtn");
  const container = document.getElementById("results");

  if (!input || !input.value.trim()) {
    alert("Tulis prompt video terlebih dahulu.");
    return;
  }


  const prompt = input.value.trim();

    const refFile = document.getElementById("refFile");
    let referenceImages = [];

    if (refFile && refFile.files && refFile.files.length) {
      const files = Array.from(refFile.files).slice(0, 1);

      referenceImages = await Promise.all(
        files.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );
    }

    // Tetap gunakan gambar hasil generate terakhir jika tidak ada referensi.
    let referenceImage = referenceImages[0] || null;

  if (button) {
    button.disabled = true;
    button.textContent = "✦ Generating...";
  }

  if (container) {
    container.innerHTML = `
      <div style="padding:35px 20px;text-align:center;border-radius:20px;background:rgba(255,255,255,.05);margin-top:20px;">
        <div style="font-size:52px;">🎬</div>
        <h3>Creating your video</h3>
        <p style="opacity:.65;">AI sedang membuat video dari prompt kamu...</p>
        <div style="width:100%;height:5px;background:rgba(255,255,255,.1);border-radius:10px;margin:25px 0;overflow:hidden;">
          <div id="videoProgress" style="width:10%;height:100%;border-radius:10px;background:linear-gradient(90deg,#8b5cf6,#ec4899);transition:width 1s ease;"></div>
        </div>
        <small style="opacity:.45;">Jangan tutup halaman ini.</small>
      </div>
    `;
  }

  try {
    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        model: document.getElementById("model")?.value || "CH Image",
        ratio: document.getElementById("ratio")?.value || "9:16",
        resolution: document.getElementById("resolution")?.value || "1K",
        count: Number(document.getElementById("count")?.value || 1),
        fps: Number(document.getElementById("fps")?.value || 24),
        duration: Number(document.getElementById("duration")?.value || 10),
        image_b64: referenceImage
      })
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Server video: " + responseText.slice(0, 500));
    }

    if (!response.ok || !data.pollingUrl) {
      throw new Error(data.error || "Gagal memulai video.");
    }

    let videoUrl = null;

    // Tunggu sampai video benar-benar selesai.
    for (let i = 0; i < 180; i++) {

      await new Promise(resolve =>
        setTimeout(resolve, 5000)
      );

      const progress =
        document.getElementById("videoProgress");

      if (progress) {
        progress.style.width =
          Math.min(10 + (i / 180) * 85, 95) + "%";
      }

      let statusData = null;

      // Retry jika koneksi status gagal.
      for (let retry = 0; retry < 4; retry++) {
        try {
          const statusResponse = await fetch(
            "/api/video-status",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                requestId: data.requestId
              })
            }
          );

          if (!statusResponse.ok) {
            throw new Error(
              "Status HTTP " + statusResponse.status
            );
          }

          statusData = await statusResponse.json();
          break;

        } catch (err) {
          console.log(
            "Status check gagal, mencoba lagi:",
            retry + 1
          );

          if (retry < 3) {
            await new Promise(resolve =>
              setTimeout(resolve, 3000)
            );
          }
        }
      }

      // Jangan langsung gagal kalau satu polling bermasalah.
      if (!statusData) {
        continue;
      }

      console.log(
        "VIDEO STATUS:",
        statusData.status
      );

      if (statusData.status === "COMPLETED") {

        const media =
          statusData?.output?.media_url ||
          statusData?.output?.mediaUrl ||
          statusData?.output?.url;

        videoUrl = Array.isArray(media)
          ? media[0]
          : media;

        if (videoUrl) {
          break;
        }
      }

      if (
        statusData.status === "FAILED" ||
        statusData.status === "ERROR"
      ) {
        throw new Error(
          statusData?.error ||
          "Video gagal dibuat."
        );
      }
    }

    if (!videoUrl) {
      throw new Error(
        "Video belum selesai diproses. Silakan coba lagi."
      );
    }

    if (!(await useCredit(10))) { throw new Error("Credit tidak cukup."); }

    state.assets.unshift({
      type: "video",
      video: videoUrl,
      prompt,
      created: new Date().toLocaleString("id-ID")
    });

    state.projects.unshift({
      name: prompt.slice(0, 40),
      created: new Date().toLocaleString("id-ID")
    });

    save();

    showGeneratedVideo(videoUrl);

  } catch (error) {

    console.error(
      "VIDEO GENERATION ERROR:",
      error
    );

    if (container) {
      container.innerHTML = `
        <div style="padding:30px;text-align:center;">
          <h3>❌ Video gagal</h3>
          <p>${error.message}</p>
        </div>
      `;
    }

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        state.mode === "video"
          ? "✦ Generate Video"
          : "✦ Generate Image";
    }
  }
}

function showGeneratedVideo(videoUrl) {
  let container =
    document.getElementById("results") ||
    document.querySelector(".result") ||
    document.querySelector(".output");

  if (!container) {
    console.warn("Container hasil tidak ditemukan.");
    return;
  }

  container.innerHTML = `
    <div class="generated-video">
      <video
        src="${videoUrl}"
        controls
        playsinline
        style="width:100%;max-width:500px;border-radius:16px;">
      </video>
    </div>
  `;

  container.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function generate() { console.log("MODE SAAT GENERATE:", state.mode);
  if (state.mode === "video") {
    generateVideo();
    return;
  }

  generateImage();
}


function instantIdeas() {
  const ideas = [
    "Kamera bergerak perlahan mendekati subjek, sementara subjek melakukan gerakan natural dan ekspresi halus. Pertahankan wajah, pakaian, bentuk tubuh, dan latar belakang sesuai gambar referensi. Durasi 10 detik, cinematic, smooth motion.",
    "Subjek bergerak secara perlahan mengikuti pose pada gambar referensi dengan gerakan tubuh yang natural. Kamera melakukan slow pan dari kiri ke kanan dengan sedikit efek depth dan parallax. Pertahankan detail gambar asli. Durasi 10 detik.",
    "Buat gambar referensi menjadi adegan hidup. Subjek bergerak secara realistis, rambut dan pakaian bergerak lembut mengikuti angin, sementara kamera perlahan melakukan zoom-in cinematic. Jangan mengubah identitas atau bentuk objek utama. Durasi 10 detik.",
    "Kamera melakukan gerakan cinematic mengelilingi subjek secara perlahan, sementara subjek tetap melakukan gerakan natural dan tidak berlebihan. Tambahkan sedikit pergerakan lingkungan agar adegan terasa hidup. Pertahankan komposisi dan detail utama dari gambar referensi. Durasi 10 detik.",
    "Ubah gambar referensi menjadi video cinematic yang realistis. Subjek melakukan gerakan sederhana dan natural dari awal hingga akhir, dengan kamera bergerak perlahan maju kemudian sedikit bergeser ke samping. Pertahankan wajah, pakaian, objek, warna, dan latar belakang. Durasi 10 detik, smooth realistic motion."
  ];

  const el = document.getElementById("ideas");

  if (!el) return;

  el.innerHTML = ideas
    .map((idea, index) => `
      <div class="idea-item">
        <b>${index + 1}.</b> ${idea}
      </div>
    `)
    .join("");
}


function showToast(message) {
  alert(message);
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.toggle("open"); document.body.classList.toggle("menu-open", sidebar.classList.contains("open"));
  }
}

function go(page, addHistory = true) {
  if (typeof window.closeCHProfile === "function") window.closeCHProfile();
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.remove("open");
    document.body.classList.remove("menu-open");
  }

  const target = document.getElementById("page-" + page);

  if (!target) {
    console.warn("Halaman tidak ditemukan:", page);
    return;
  }

  document.querySelectorAll(".page").forEach(el => {
    el.classList.remove("active");
    el.style.display = "none";
  });

  target.classList.add("active");
  target.style.display = "block";

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  document.querySelectorAll(".ch-mobile-item[data-mobile-page]").forEach(el => {
    const isActive = el.dataset.mobilePage === page;
    el.classList.toggle("active", isActive);
    if (isActive) {
      el.setAttribute("aria-current", "page");
    } else {
      el.removeAttribute("aria-current");
    }
  });

  if (addHistory && location.hash !== "#" + page) {
    history.pushState({ page }, "", "#" + page);
  }

  if (page === "jedagjedug") {
    window.dispatchEvent(new Event("resize"));
  }

  // Setiap halaman dimulai dari bagian atas, tanpa mengunci scroll dokumen.
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

window.addEventListener("popstate", (event) => {
  const page = event.state && event.state.page ? event.state.page : "home";
  go(page, false);
});

history.replaceState({ page: "home" }, "", "#home");

function setMode(mode) {
  const promptInput = document.getElementById("prompt");
  const oldMode = state.mode || "image";
  if (promptInput) {
    if (oldMode === "video") {
      state.videoPrompt = promptInput.value;
    } else {
      state.imagePrompt = promptInput.value;
    }
  }
  state.mode = mode;
  if (promptInput) {
    promptInput.value = mode === "video" ? (state.videoPrompt || "") : (state.imagePrompt || "");
  }
  const results = document.getElementById("results");
  if (results) results.innerHTML = "<p>Hasil generate akan muncul di sini.</p>";
  if (mode !== "video" && typeof clearRef === "function") clearRef();
  save();

  document.querySelectorAll("[data-mode]").forEach(el => {
    el.classList.toggle("active", el.dataset.mode === mode);
  });

  const modelOption = document.getElementById("modelOption");
  const resolutionOption = document.getElementById("resolutionOption");
  const countOption = document.getElementById("countOption");
  const durationOption = document.getElementById("durationOption");
  const fpsOption = document.getElementById("fpsOption");
  const videoReferenceOption = document.getElementById("videoReferenceOption");
  const generateBtn = document.getElementById("generateBtn");
  const cost = document.getElementById("cost");

  if (mode === "video") {
    if (modelOption) modelOption.style.display = "none";
    if (resolutionOption) resolutionOption.style.display = "none";
    if (countOption) countOption.style.display = "none";
    if (durationOption) durationOption.style.display = "block";
    if (fpsOption) fpsOption.style.display = "block";
    if (videoReferenceOption) videoReferenceOption.style.display = "block";

    if (generateBtn) generateBtn.textContent = "✦ Generate Video";
    if (promptInput) promptInput.placeholder = "Ayo bikin ide kamu dalam gambar menjadi video se-kreatif mungkin, sesuai keinginan kamu.";
    if (cost) cost.textContent = "10";
  } else {
    if (modelOption) modelOption.style.display = "block";
    if (resolutionOption) resolutionOption.style.display = "block";
    if (countOption) countOption.style.display = "block";
    if (durationOption) durationOption.style.display = "none";
    if (fpsOption) fpsOption.style.display = "none";
    if (videoReferenceOption) videoReferenceOption.style.display = "none";

    if (generateBtn) generateBtn.textContent = "✦ Generate Image";
    if (cost) cost.textContent = "1";
  }
}

function previewRef(event) {
  const input = event.target;
  const preview = document.getElementById("refPreview");
  const img = document.getElementById("refImg");

  if (!input || !preview || !img) return;

  const file = input.files && input.files[0];

  if (!file) {
    clearRef();
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    img.src = reader.result;
    preview.classList.remove("hidden");
  };

  reader.readAsDataURL(file);
}

function clearRef() {
  const input = document.getElementById("refFile");
  const preview = document.getElementById("refPreview");
  const img = document.getElementById("refImg");

  if (input) input.value = "";
  if (img) img.src = "";
  if (preview) preview.classList.add("hidden");
}

function useTemplate(template) {
  const input = document.getElementById("prompt");

  if (!input) return;

  input.value = template;

  go("generate");

  input.focus();
}

async function buyCredits(packageId) {
  try {
    if (!window.Clerk?.user) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    const token = await Clerk.session?.getToken();

    if (!token) {
      alert("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const response = await fetch("/api/midtrans/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ packageId })
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.qrUrl || !data.orderId) {
      console.error("Midtrans Create Order:", data);
      alert(data?.error || "Gagal membuat pembayaran QRIS.");
      return;
    }

    const amount = Number(data.amount).toLocaleString("id-ID");
    const credits = Number(data.credits);

    const paymentWindow = window.open("", "_blank");

    if (!paymentWindow) {
      window.location.href = data.qrUrl;
      return;
    }

    paymentWindow.document.title = "Pembayaran QRIS - CH AI Studio";
    paymentWindow.document.body.style.cssText =
      "font-family:Arial,sans-serif;text-align:center;padding:24px;color:#222;background:#f7f7fb";

    const title = paymentWindow.document.createElement("h2");
    title.textContent = "Pembayaran QRIS";

    const info = paymentWindow.document.createElement("p");
    info.textContent =
      "Pesanan " + data.orderId + " · Rp" + amount + " · " + credits + " kredit";

    const image = paymentWindow.document.createElement("img");
    image.src = data.qrUrl;
    image.alt = "QRIS Midtrans";
    image.style.cssText = "display:block;max-width:320px;width:100%;margin:20px auto";

    const note = paymentWindow.document.createElement("p");
    note.textContent =
      "Pindai QRIS dengan aplikasi pembayaran Anda. Halaman ini akan memeriksa status pembayaran secara berkala.";

    const status = paymentWindow.document.createElement("p");
    status.textContent = "Status: menunggu pembayaran";

    const checkButton = paymentWindow.document.createElement("button");
    checkButton.textContent = "Periksa pembayaran";
    checkButton.style.cssText = "padding:12px 20px;border:0;border-radius:10px;cursor:pointer";

    paymentWindow.document.body.append(title, info, image, note, status, checkButton);

    let checking = false;

    const checkPayment = async () => {
      if (checking || paymentWindow.closed) return;
      checking = true;
      checkButton.disabled = true;

      try {
        const statusResponse = await fetch(
          "/api/midtrans/status/" + encodeURIComponent(data.orderId),
          { headers: { Authorization: "Bearer " + token } }
        );

        const payment = await statusResponse.json();

        if (!statusResponse.ok) {
          status.textContent = payment?.error || "Belum dapat memeriksa pembayaran.";
        } else if (payment.status === "SUCCESS") {
          status.textContent = "Pembayaran berhasil! Kredit sudah ditambahkan.";
          note.textContent = "Silakan kembali ke CH AI Studio untuk menggunakan kredit.";
          clearInterval(timer);
          checkButton.textContent = "Pembayaran berhasil";
          checkButton.disabled = true;
          return;
        } else if (["FAILED", "EXPIRE", "CANCEL", "DENY"].includes(payment.status)) {
          status.textContent = "Pembayaran berstatus: " + payment.status;
          clearInterval(timer);
          return;
        } else {
          status.textContent = "Status: menunggu pembayaran";
        }
      } catch (error) {
        status.textContent = "Koneksi bermasalah. Coba periksa kembali.";
      } finally {
        checking = false;
        if (!paymentWindow.closed && !checkButton.disabled) {
          checkButton.disabled = false;
        }
      }
    };

    checkButton.addEventListener("click", checkPayment);
    const timer = setInterval(checkPayment, 5000);
    paymentWindow.addEventListener("beforeunload", () => clearInterval(timer));
    checkPayment();
  } catch (error) {
    console.error("Pembayaran Midtrans:", error);
    alert("Terjadi kesalahan saat membuat pembayaran QRIS.");
  }
}

function useVideoTemplate(name, prompt) {
  go("generate");
  setMode("video");

  const promptInput = document.getElementById("prompt");

  if (promptInput) {
    promptInput.value = prompt;
    promptInput.focus();
  }

  showToast(`${name} siap digunakan`);
}

/* ===== CH AI STUDIO CUSTOM AUTH ===== */
let authMode = "signin";

function openAuth(mode = "signin") {
  authMode = mode;

  const overlay = document.getElementById("authOverlay");
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const submit = document.getElementById("authSubmit");
  const sw = document.getElementById("authSwitch");
  const error = document.getElementById("authError");

  if (!overlay) return;

  error.classList.remove("show");
  error.textContent = "";

  if (authMode === "signup") {
    title.textContent = "Buat Akun CH AI Studio";
    subtitle.textContent = "Daftar untuk mulai membuat karya.";
    submit.textContent = "Daftar";
    sw.innerHTML = 'Sudah punya akun? <button onclick="switchAuth()">Masuk</button>';
  } else {
    title.textContent = "Masuk ke CH AI Studio";
    subtitle.textContent = "Gunakan akun kamu untuk melanjutkan.";
    submit.textContent = "Masuk";
    sw.innerHTML = 'Belum punya akun? <button onclick="switchAuth()">Daftar</button>';
  }

  overlay.classList.add("show");
  setTimeout(() => document.getElementById("authEmail")?.focus(), 100);
}

function closeAuth() {
  document.getElementById("authOverlay")?.classList.remove("show");
}

function switchAuth() {
  openAuth(authMode === "signin" ? "signup" : "signin");
}

async function submitAuth() {
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value;
  const button = document.getElementById("authSubmit");
  const error = document.getElementById("authError");

  error.classList.remove("show");
  error.textContent = "";

  if (!email || !password) {
    error.textContent = "Email dan password wajib diisi.";
    error.classList.add("show");
    return;
  }

  button.disabled = true;
  button.textContent = authMode === "signup" ? "Mendaftarkan..." : "Memproses...";

  try {
    if (authMode === "signin") {
      const result = await Clerk.client.signIn.create({
        identifier: email,
        password
      });

      if (result.status === "complete") {
        await Clerk.setActive({
          session: result.createdSessionId
        });
        closeAuth();
        showToast("Berhasil masuk");
        location.reload();
        return;
      }

      throw new Error("Login membutuhkan langkah verifikasi tambahan.");
    }

    const result = await Clerk.client.signUp.create({
      emailAddress: email,
      password
    });

    if (result.status === "complete") {
      await Clerk.setActive({
        session: result.createdSessionId
      });
      closeAuth();
      showToast("Akun berhasil dibuat");
      location.reload();
      return;
    }

    if (result.status === "missing_requirements") {
      if (result.unverifiedFields?.includes("email_address")) {
        error.textContent = "Email perlu diverifikasi. Kita tambahkan layar kode verifikasi setelah ini.";
      } else {
        error.textContent = "Pendaftaran membutuhkan verifikasi tambahan.";
      }
      error.classList.add("show");
      return;
    }

    throw new Error("Pendaftaran belum selesai.");

  } catch (err) {
    console.error("CH Auth:", err);
    error.textContent = err?.errors?.[0]?.longMessage || err?.message || "Terjadi kesalahan.";
    error.classList.add("show");
  } finally {
    button.disabled = false;
    button.textContent = authMode === "signup" ? "Daftar" : "Masuk";
  }
}


async function socialAuth(strategy) {
  try {
    await Clerk.client.signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: window.location.origin,
      redirectUrlComplete: window.location.origin
    });
  } catch (err) {
    console.error("CH Social Auth:", err);
    const error = document.getElementById("authError");
    if (error) {
      error.textContent = err?.errors?.[0]?.longMessage || err?.message || "Login sosial gagal.";
      error.classList.add("show");
    }
  }
}

function toggleAccountMenu() {
  document.getElementById("chAccountMenu")?.classList.toggle("show");
}

async function logoutCH() {
  try {
    await Clerk.signOut();
    location.reload();
  } catch (err) {
    console.error("CH Logout:", err);
    showToast("Gagal keluar");
  }
}
/* CH CHAT AI */
let chChatMessages = [];
let chChatSending = false;

function newChat() {
  if (chChatSending) return;
  chChatMessages = [];
  renderChatMessages();
}

function escapeChatHtml(t) {
  return String(t || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyChatReply(idx, btnEl) {
  const item = chChatMessages[idx];
  if (!item || !item.content) return;
  const raw = String(item.content);
  const done = () => {
    if (!btnEl) return;
    const prev = btnEl.textContent;
    btnEl.textContent = "Tersalin ✓";
    btnEl.classList.add("is-copied");
    setTimeout(() => {
      btnEl.textContent = prev || "Salin";
      btnEl.classList.remove("is-copied");
    }, 1800);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(raw).then(done).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      done();
    });
  } else {
    const ta = document.createElement("textarea");
    ta.value = raw;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    done();
  }
}

function renderChatMessages() {
  const b = document.getElementById("chatMessages");
  if (!b) return;
  if (!chChatMessages.length) {
    b.innerHTML = `<div class="chat-empty"><div class="chat-logo">CH</div><h3>Halo, gue CH Chat AI 👋</h3><p>Tanya apa aja. Mau serius, santai, cari ide, atau sekadar ngobrol.</p></div>`;
    return;
  }
  b.innerHTML = chChatMessages
    .map((m, idx) => {
      const isUser = m.role === "user";
      if (m.loading) {
        return `<div class="chat-bubble ai is-loading"><div class="chat-name">CH Chat AI</div><div class="chat-text chat-typing"><span></span><span></span><span></span> <em>Sedang berpikir...</em></div></div>`;
      }
      const errClass = m.isError ? " is-error" : "";
      const copyBtnHtml = !isUser && !m.isError
        ? `<div class="chat-bubble-actions"><button type="button" class="chat-copy-btn" onclick="copyChatReply(${idx}, this)">Salin</button></div>`
        : "";
      return `<div class="chat-bubble ${isUser ? "user" : "ai"}${errClass}"><div class="chat-name">${isUser ? "Kamu" : "CH Chat AI"}</div><div class="chat-text">${escapeChatHtml(m.content).replace(/\n/g, "<br>")}</div>${copyBtnHtml}</div>`;
    })
    .join("");
  b.scrollTop = b.scrollHeight;
}

async function sendChatMessage() {
  if (chChatSending) return;
  const input = document.getElementById("chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  chChatSending = true;
  input.value = "";
  input.style.height = "";

  // Simpan pesan user ke riwayat percakapan (tanpa potongan kredit)
  chChatMessages.push({ role: "user", content: text });
  const contextPayload = chChatMessages
    .filter(m => !m.isError && !m.loading && (m.role === "user" || m.role === "assistant"))
    .map(m => ({ role: m.role, content: m.content }));

  chChatMessages.push({ role: "assistant", content: "", loading: true });
  renderChatMessages();

  const btn = document.getElementById("chatSend");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: contextPayload })
    });
    const data = await res.json().catch(() => ({}));
    chChatMessages.pop();
    if (!res.ok || !data.reply) {
      throw new Error(data.error || "Gagal menghubungi CH Chat AI (" + res.status + ")");
    }
    chChatMessages.push({ role: "assistant", content: data.reply });
  } catch (err) {
    if (chChatMessages.length && chChatMessages[chChatMessages.length - 1].loading) {
      chChatMessages.pop();
    }
    const errMsg = err?.message || "Maaf, CH Chat AI sedang mengalami kendala. Coba lagi ya.";
    chChatMessages.push({ role: "assistant", content: "⚠️ " + errMsg, isError: true });
    console.error("CH CHAT ERROR:", err);
  } finally {
    chChatSending = false;
    if (btn) btn.disabled = false;
    renderChatMessages();
    input.focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  if (form && !form.dataset.chatBound) {
    form.dataset.chatBound = "1";
    form.addEventListener("submit", e => {
      e.preventDefault();
      sendChatMessage();
    });
  }
  if (input && !input.dataset.chatBound) {
    input.dataset.chatBound = "1";
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
  renderChatMessages();
});

// ===== CH JEDAG JEDUG AI: MEDIA PICKER =====
(() => {
  const mediaInput = document.getElementById("jj-media-input");
  if (!mediaInput || mediaInput.dataset.jjReady === "1") return;
  mediaInput.dataset.jjReady = "1";

  const list = document.getElementById("jj-media-list");
  const status = document.getElementById("jj-media-status");
  const preview = document.getElementById("jj-preview");
  let items = [];

  function releaseItems() {
    items.forEach(item => URL.revokeObjectURL(item.url));
    items = [];
  }

  function render() {
    list.innerHTML = "";
    items.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "jj-media-card";

      const visual = item.file.type.startsWith("video/")
        ? document.createElement("video")
        : document.createElement("img");

      visual.src = item.url;
      visual.className = "jj-media-thumb";
      visual.controls = item.file.type.startsWith("video/");
      visual.muted = true;
      visual.playsInline = true;

      const name = document.createElement("div");
      name.className = "jj-media-name";
      name.textContent = `${index + 1}. ${item.file.name}`;

      const controls = document.createElement("div");
      controls.className = "jj-media-controls";

      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.disabled = index === 0;
      up.setAttribute("aria-label", "Naikkan urutan media");
      up.addEventListener("click", () => move(index, -1));

      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.disabled = index === items.length - 1;
      down.setAttribute("aria-label", "Turunkan urutan media");
      down.addEventListener("click", () => move(index, 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Hapus";
      remove.addEventListener("click", () => removeItem(index));

      controls.append(up, down, remove);
      card.append(visual, name, controls);
      list.append(card);
    });

    status.textContent = `Media dipilih: ${items.length}/5`;
    preview.textContent = items.length
      ? `${items.length} media siap dipratinjau. Urutkan dengan tombol ↑ dan ↓.`
      : "Pilih 5 media untuk menyiapkan video.";
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    render();
  }

  function removeItem(index) {
    URL.revokeObjectURL(items[index].url);
    items.splice(index, 1);
    render();
  }

  mediaInput.addEventListener("change", () => {
    const chosen = Array.from(mediaInput.files || []);
    const valid = chosen.filter(file =>
      file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (valid.length !== chosen.length) {
      status.textContent = "Sebagian file bukan foto/video dan dilewati.";
    }

    if (items.length + valid.length > 5) {
      status.textContent = `Maksimal 5 media. Sekarang ada ${items.length}; kamu bisa menambahkan ${5 - items.length} lagi.`;
      mediaInput.value = "";
      return;
    }

    items.push(...valid.map(file => ({
      file,
      url: URL.createObjectURL(file)
    })));

    mediaInput.value = "";
    render();
  });

  window.chJedagJedugMedia = {
    getItems: () => items.map(item => item.file),
    getCount: () => items.length
  };

  render();
})();

// ===== CH JEDAG JEDUG AI: MUSIC PICKER =====
(() => {
  const input = document.getElementById("jj-audio-input");
  if (!input || input.dataset.jjReady === "1") return;
  input.dataset.jjReady = "1";

  const audio = document.getElementById("jj-audio-preview");
  const info = document.getElementById("jj-audio-info");
  const startInput = document.getElementById("jj-music-start");
  const endInput = document.getElementById("jj-music-end");

  const track = document.getElementById("jj-timeline-track");
  const waveform = document.getElementById("jj-waveform");
  const selection = document.getElementById("jj-selection-window");
  const startHandle = document.getElementById("jj-trim-start");
  const endHandle = document.getElementById("jj-trim-end");
  const playhead = document.getElementById("jj-timeline-playhead");
  const durationBadge = document.getElementById("jj-selection-duration");
  const timeLabel = document.getElementById("jj-timeline-time");
  const scaleStart = document.getElementById("jj-scale-start");
  const scaleMiddle = document.getElementById("jj-scale-middle");
  const scaleEnd = document.getElementById("jj-scale-end");
  const previewButton = document.getElementById("jj-preview-selection");

  let musicFile = null;
  let musicUrl = null;
  let musicDuration = 0;
  let trimStart = 0;
  let trimEnd = 0;
  let drag = null;

  const MIN_CLIP = 30;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return String(minutes).padStart(2, "0") + ":" +
      String(remaining).padStart(2, "0");
  }

  function makeWaveform() {
    if (!waveform) return;

    waveform.replaceChildren();
    let seed = 271828;

    for (let i = 0; i < 100; i++) {
      seed = (seed * 16807) % 2147483647;
      const value = seed / 2147483647;
      const bar = document.createElement("span");
      bar.style.setProperty("--wave-height", (14 + value * 78) + "%");
      waveform.appendChild(bar);
    }
  }

  function updateTimeline() {
    if (!track || !selection || !musicDuration) return;

    trimStart = clamp(trimStart, 0, Math.max(0, musicDuration - MIN_CLIP));
    trimEnd = clamp(trimEnd, trimStart + MIN_CLIP, musicDuration);

    const left = trimStart / musicDuration * 100;
    const width = (trimEnd - trimStart) / musicDuration * 100;

    selection.style.left = left + "%";
    selection.style.width = width + "%";

    startInput.value = trimStart.toFixed(1);
    endInput.value = trimEnd.toFixed(1);
    startInput.max = String(Math.max(0, musicDuration - MIN_CLIP));
    endInput.max = String(musicDuration);

    if (durationBadge) {
      durationBadge.textContent = (trimEnd - trimStart).toFixed(1) + " dtk";
    }

    if (scaleStart) scaleStart.textContent = formatTime(trimStart);
    if (scaleMiddle) scaleMiddle.textContent = formatTime((trimStart + trimEnd) / 2);
    if (scaleEnd) scaleEnd.textContent = formatTime(trimEnd);

    updatePlayhead();
  }

  function updatePlayhead() {
    if (!musicDuration || !playhead) return;

    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    playhead.style.left = clamp(current / musicDuration * 100, 0, 100) + "%";

    if (timeLabel) {
      timeLabel.textContent = formatTime(current) + " / " + formatTime(musicDuration);
    }
  }

  function timeAtPointer(event) {
    const rect = track.getBoundingClientRect();
    if (!rect.width) return 0;

    return clamp((event.clientX - rect.left) / rect.width, 0, 1) * musicDuration;
  }

  function pausePreview() {
    audio.pause();
    if (previewButton) previewButton.textContent = "▶ Preview potongan";
  }

  function beginDrag(event, mode) {
    if (!musicFile || !musicDuration || musicDuration < MIN_CLIP) return;

    event.preventDefault();
    event.stopPropagation();

    drag = {
      mode,
      pointerId: event.pointerId,
      x: event.clientX,
      start: trimStart,
      end: trimEnd
    };

    if (mode === "start") startHandle.setPointerCapture?.(event.pointerId);
    else if (mode === "end") endHandle.setPointerCapture?.(event.pointerId);
    else selection.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const delta = (event.clientX - drag.x) /
      track.getBoundingClientRect().width * musicDuration;

    if (drag.mode === "start") {
      trimStart = clamp(drag.start + delta, 0, drag.end - MIN_CLIP);
      trimEnd = drag.end;
    } else if (drag.mode === "end") {
      trimStart = drag.start;
      trimEnd = clamp(drag.end + delta, drag.start + MIN_CLIP, musicDuration);
    } else if (drag.mode === "move") {
      const length = drag.end - drag.start;
      trimStart = clamp(drag.start + delta, 0, musicDuration - length);
      trimEnd = trimStart + length;
    }

    updateTimeline();
  }

  function endDrag(event) {
    if (drag && event.pointerId === drag.pointerId) drag = null;
  }

  if (track && selection && startHandle && endHandle) {
    makeWaveform();

    startHandle.addEventListener("pointerdown", event => beginDrag(event, "start"));
    endHandle.addEventListener("pointerdown", event => beginDrag(event, "end"));

    selection.addEventListener("pointerdown", event => {
      if (event.target === startHandle || event.target === endHandle ||
          event.target.closest?.(".jj-trim-handle")) return;
      beginDrag(event, "move");
    });

    for (const element of [track, selection, startHandle, endHandle]) {
      element.addEventListener("pointermove", moveDrag);
      element.addEventListener("pointerup", endDrag);
      element.addEventListener("pointercancel", endDrag);
      element.addEventListener("lostpointercapture", endDrag);
    }

    track.addEventListener("click", event => {
      if (!musicFile || !musicDuration || drag) return;
      if (event.target.closest?.(".jj-trim-handle")) return;

      const time = timeAtPointer(event);
      audio.currentTime = time;
      updatePlayhead();
    });
  }

  startInput.addEventListener("change", () => {
    if (!musicDuration) return;

    const value = Number(startInput.value);
    if (!Number.isFinite(value)) return;

    trimStart = clamp(value, 0, trimEnd - MIN_CLIP);
    updateTimeline();
  });

  endInput.addEventListener("change", () => {
    if (!musicDuration) return;

    const value = Number(endInput.value);
    if (!Number.isFinite(value)) return;

    trimEnd = clamp(value, trimStart + MIN_CLIP, musicDuration);
    updateTimeline();
  });

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      info.textContent = "File harus berupa audio.";
      input.value = "";
      return;
    }

    pausePreview();

    if (musicUrl) URL.revokeObjectURL(musicUrl);

    musicFile = file;
    musicUrl = URL.createObjectURL(file);
    musicDuration = 0;
    trimStart = 0;
    trimEnd = 0;

    audio.src = musicUrl;
    audio.style.display = "block";
    info.textContent = "Musik dipilih: " + file.name + ". Membaca durasi...";

    audio.onloadedmetadata = () => {
      musicDuration = audio.duration;

      if (!Number.isFinite(musicDuration) || musicDuration <= 0) {
        info.textContent = "Durasi musik tidak bisa dibaca oleh browser.";
        return;
      }

      trimStart = 0;
      trimEnd = musicDuration;

      updateTimeline();

      if (musicDuration < MIN_CLIP) {
        info.textContent = "Musik berdurasi " + musicDuration.toFixed(1) +
          " detik. Minimal 30 detik untuk render video.";
        if (previewButton) previewButton.disabled = true;
      } else {
        info.textContent = "Musik siap: " + file.name + " • " +
          musicDuration.toFixed(1) + " detik.";
        if (previewButton) previewButton.disabled = false;
      }

      audio.currentTime = 0;
      updatePlayhead();
    };

    audio.onerror = () => {
      info.textContent = "Browser tidak dapat membaca file musik ini.";
    };

    input.value = "";
  });

  if (previewButton) {
    previewButton.addEventListener("click", async () => {
      if (!musicFile || musicDuration < MIN_CLIP) {
        info.textContent = "Pilih musik dengan durasi minimal 30 detik.";
        return;
      }

      try {
        if (!audio.paused && audio.currentTime >= trimStart &&
            audio.currentTime < trimEnd) {
          pausePreview();
          return;
        }

        audio.currentTime = trimStart;
        await audio.play();
        previewButton.textContent = "⏸ Hentikan preview";
      } catch {
        info.textContent = "Preview tidak bisa diputar. Tekan tombol play pada pemutar musik.";
      }
    });
  }

  audio.addEventListener("timeupdate", () => {
    updatePlayhead();

    if (!audio.paused && audio.currentTime >= trimEnd) {
      pausePreview();
      audio.currentTime = trimStart;
      updatePlayhead();
    }
  });

  audio.addEventListener("ended", () => {
    if (previewButton) previewButton.textContent = "▶ Preview potongan";
  });

  function getSelection() {
    const start = Number(startInput.value);
    const end = Number(endInput.value);

    if (!musicFile) throw new Error("Pilih file musik terlebih dahulu.");
    if (!Number.isFinite(musicDuration) || musicDuration < MIN_CLIP) {
      throw new Error("Musik harus berdurasi minimal 30 detik.");
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end > musicDuration || end - start < MIN_CLIP) {
      throw new Error("Potongan musik harus berdurasi minimal 30 detik dan berada dalam durasi file.");
    }

    return { file: musicFile, start, end, duration: end - start };
  }

  window.chJedagJedugMusic = { getSelection };
})();

// ===== CH JEDAG JEDUG AI: RENDER ENGINE =====
(() => {
  const button = document.getElementById("jj-render-btn");
  if (!button || button.dataset.renderReady === "1") return;
  button.dataset.renderReady = "1";

  const status = document.getElementById("jj-render-status");
  const output = document.getElementById("jj-output-video");
  const download = document.getElementById("jj-download");
  const preview = document.getElementById("jj-preview");

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => resolve({
        element: img,
        cleanup: () => URL.revokeObjectURL(url)
      });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Foto tidak bisa dibaca: " + file.name));
      };
      img.src = url;
    });
  }

  function loadVideo(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.loop = true;

      const cleanup = () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
      };

      video.onloadedmetadata = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) {
          cleanup();
          reject(new Error("Durasi video tidak valid: " + file.name));
          return;
        }
        resolve({ element: video, cleanup, isVideo: true });
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("Video tidak bisa dibaca: " + file.name));
      };

      video.src = url;
      video.load();
    });
  }

  async function analyseBeats(file) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("Browser tidak mendukung analisis audio.");

    const context = new AC();
    try {
      const buffer = await file.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(buffer);
      const data = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSize = 2048;
      const hop = 1024;
      const energies = [];

      for (let start = 0; start + windowSize < data.length; start += hop) {
        let sum = 0;
        for (let j = 0; j < windowSize; j += 4) {
          const value = data[start + j];
          sum += value * value;
        }
        energies.push({
          time: start / sampleRate,
          energy: Math.sqrt(sum / (windowSize / 4))
        });
      }

      const beats = [];
      const history = [];
      const refractory = 0.24;
      let lastBeat = -refractory;

      for (let i = 2; i < energies.length - 2; i++) {
        const current = energies[i];
        history.push(current.energy);
        if (history.length > 45) history.shift();

        const mean = history.reduce((a, b) => a + b, 0) /
          Math.max(1, history.length);

        if (
          current.energy > mean * 1.24 &&
          current.energy >= energies[i - 1].energy &&
          current.energy >= energies[i + 1].energy &&
          current.time - lastBeat >= refractory
        ) {
          beats.push(current.time);
          lastBeat = current.time;
        }
      }

      let bpm = 0;
      if (beats.length >= 4) {
        const gaps = [];
        for (let i = 1; i < beats.length; i++) {
          const gap = beats[i] - beats[i - 1];
          if (gap >= 0.25 && gap <= 1.5) gaps.push(gap);
        }
        if (gaps.length) {
          gaps.sort((a, b) => a - b);
          const median = gaps[Math.floor(gaps.length / 2)];
          bpm = Math.round(60 / median);
          if (bpm < 60) bpm *= 2;
          if (bpm > 180) bpm = Math.round(bpm / 2);
        }
      }

      return { beats, bpm };
    } finally {
      await context.close().catch(() => {});
    }
  }

  function drawCover(ctx, media, w, h, time, style, intensity, beatPulse) {
    const el = media.element;
    const sw = el.videoWidth || el.naturalWidth || w;
    const sh = el.videoHeight || el.naturalHeight || h;

    const scale = Math.max(w / sw, h / sh);
    const zoomBase = style === "cinematic" ? 1.025 : 1;
    const zoom = zoomBase + beatPulse * (intensity === "high" ? 0.12 : intensity === "low" ? 0.035 : 0.075);
    const shakeAmount = style === "flash" ? 4 : intensity === "high" ? 7 : intensity === "low" ? 1 : 3;
    const shake = style === "cinematic" ? 0 : Math.sin(time * 73) * shakeAmount * beatPulse;
    const dw = sw * scale * zoom;
    const dh = sh * scale * zoom;

    ctx.save();
    ctx.translate((w - dw) / 2 + shake, (h - dh) / 2);
    ctx.drawImage(el, 0, 0, dw, dh);
    ctx.restore();
  }

  function drawEffects(ctx, w, h, t, effects, intensity, pulse) {
    const amount = intensity === "high" ? 1 : intensity === "low" ? 0.45 : 0.7;
    const rand = (n, seed) => {
      const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    if (effects.has("stars")) {
      for (let i = 0; i < 42; i++) {
        const x = rand(i, 2) * w;
        const y = (rand(i, 3) * h + t * (12 + i % 12)) % h;
        const alpha = (0.25 + rand(i, 4) * 0.7) * amount;
        const size = 1 + rand(i, 5) * (2 + pulse * 3);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (effects.has("butterflies")) {
      for (let i = 0; i < 5; i++) {
        const x = (rand(i, 10) * w + Math.sin(t * 1.3 + i) * 50 + w) % w;
        const y = (rand(i, 11) * h - t * 30 + h * 2) % h;
        const flap = Math.sin(t * 12 + i) * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(t + i) * 0.25);
        ctx.fillStyle = ["#ff71c8", "#b69cff", "#ffe17d", "#8be8ff"][i % 4];
        ctx.beginPath();
        ctx.ellipse(-5, 0, 5, 8 * (1 + flap), -0.5, 0, Math.PI * 2);
        ctx.ellipse(5, 0, 5, 8 * (1 + flap), 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (effects.has("birds")) {
      for (let i = 0; i < 4; i++) {
        const x = ((t * (55 + i * 8) + i * w / 3) % (w + 100)) - 50;
        const y = h * (0.18 + i * 0.075) + Math.sin(t * 2 + i) * 14;
        const wing = Math.sin(t * 9 + i) * 5;
        ctx.strokeStyle = "rgba(20,20,30,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 9, y + wing);
        ctx.quadraticCurveTo(x - 4, y - 7, x, y);
        ctx.quadraticCurveTo(x + 4, y - 7, x + 9, y + wing);
        ctx.stroke();
      }
    }

    if (effects.has("fire")) {
      for (let i = 0; i < 24; i++) {
        const x = rand(i, 20) * w;
        const rise = (t * (40 + rand(i, 21) * 65) + i * 43) % (h * 0.35);
        const y = h - rise;
        const radius = (3 + rand(i, 22) * 8) * amount;
        ctx.fillStyle = `rgba(255,${90 + Math.floor(rand(i, 23) * 130)},20,${Math.max(0, 0.7 - rise / (h * 0.5))})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (effects.has("water")) {
      ctx.save();
      ctx.strokeStyle = `rgba(90,210,255,${0.15 * amount + pulse * 0.2})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const y = h * 0.55 + i * 22 + Math.sin(t * 2 + i) * 5;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const yy = y + Math.sin(x * 0.018 + t * 3 + i) * 5;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    if (pulse > 0.72) {
      ctx.fillStyle = `rgba(255,255,255,${(pulse - 0.72) * (styleFlashIntensity(intensity))})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function styleFlashIntensity(intensity) {
    return intensity === "high" ? 0.7 : intensity === "low" ? 0.2 : 0.4;
  }


  function drawJJTransition(ctx, previous, current, w, h, time,
    style, intensity, pulse, type, progress) {
    const p = Math.max(0, Math.min(1, progress));

    ctx.save();
    ctx.fillStyle = "#080812";
    ctx.fillRect(0, 0, w, h);

    const drawItem = (item, alpha = 1, transform = null) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (transform) transform();
      drawCover(ctx, item, w, h, time, style, intensity, pulse);
      ctx.restore();
    };

    switch (type) {
      case "whip":
        drawItem(previous, 1, () => ctx.translate(-p * w, 0));
        drawItem(current, 1, () => ctx.translate((1 - p) * w, 0));
        break;

      case "rotate3d":
        drawItem(previous, 1, () => {
          ctx.translate(w / 2, h / 2);
          ctx.scale(Math.max(0.04, Math.cos(p * Math.PI / 2)), 1);
          ctx.translate(-w / 2, -h / 2);
        });
        drawItem(current, 1, () => {
          ctx.translate(w / 2, h / 2);
          ctx.scale(Math.max(0.04, Math.sin(p * Math.PI / 2)), 1);
          ctx.translate(-w / 2, -h / 2);
        });
        break;

      case "neon":
        drawItem(previous);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w * p, h);
        ctx.clip();
        drawCover(ctx, current, w, h, time, style, intensity, pulse);
        ctx.restore();

        if (p < 1) {
          ctx.save();
          ctx.fillStyle = "rgba(232,121,249,0.95)";
          ctx.shadowColor = "#d946ef";
          ctx.shadowBlur = 24;
          ctx.fillRect(w * p - 3, 0, 6, h);
          ctx.restore();
        }
        break;

      case "glitch":
        drawItem(previous, 1 - p);
        drawItem(current, p);

        if (p > 0.12 && p < 0.9) {
          for (let i = 0; i < 7; i++) {
            const y = (i * 137 + Math.floor(time * 160)) % h;
            const height = 4 + (i % 3) * 4;
            ctx.fillStyle = i % 2
              ? "rgba(255,40,170,0.4)"
              : "rgba(40,220,255,0.4)";
            ctx.fillRect((i % 2 ? -1 : 1) * p * 18, y, w, height);
          }
        }
        break;

      case "blur":
        drawItem(previous, 1 - p);
        ctx.save();
        ctx.globalAlpha = p;
        if ("filter" in ctx) {
          ctx.filter = `blur(${Math.sin(p * Math.PI) * 9}px)`;
        }
        drawCover(ctx, current, w, h, time, style, intensity, pulse);
        ctx.restore();
        break;

      case "flash": {
        drawItem(previous, 1 - p);
        drawItem(current, p);
        const flash = Math.max(0, 1 - Math.abs(p - 0.5) * 2);
        const strength = intensity === "high" ? 0.8
          : intensity === "low" ? 0.3 : 0.55;
        ctx.fillStyle = `rgba(255,255,255,${flash * strength})`;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case "fade":
        drawItem(previous, 1 - p);
        drawItem(current, p);
        break;

      case "velocity":
      default:
        drawItem(previous, 1 - p);
        ctx.save();
        ctx.globalAlpha = p;
        ctx.translate(w / 2, h / 2);
        const zoom = 1.25 - 0.25 * p;
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);
        drawCover(ctx, current, w, h, time, style, intensity, pulse);
        ctx.restore();

        if (p > 0.7) {
          ctx.fillStyle = `rgba(145,80,255,${(p - 0.7) * 0.45})`;
          ctx.fillRect(0, 0, w, h);
        }
    }

    ctx.restore();
  }

  const jjTransitionDurationInput =
    document.getElementById("jj-transition-duration");
  const jjTransitionDurationValue =
    document.getElementById("jj-transition-duration-value");

  if (jjTransitionDurationInput && jjTransitionDurationValue &&
      !jjTransitionDurationInput.dataset.ready) {
    jjTransitionDurationInput.dataset.ready = "1";

    const updateJJTransitionDuration = () => {
      const value = Number(jjTransitionDurationInput.value) || 0.5;
      jjTransitionDurationValue.textContent =
        value.toLocaleString("id-ID", { maximumFractionDigits: 1 }) +
        " detik";
    };

    jjTransitionDurationInput.addEventListener(
      "input", updateJJTransitionDuration
    );
    updateJJTransitionDuration();
  }

  button.addEventListener("click", async () => {
    let loaded = [];
    let audioUrl = null;
    let recorder = null;
    let audioContext = null;
    let musicElement = null;
    let raf = 0;
    let stopped = false;
    let stream = null;
    let audioObjectUrl = null;

    button.disabled = true;
    output.style.display = "none";
    download.style.display = "none";
    status.textContent = "Menyiapkan render...";

    try {
      const files = window.chJedagJedugMedia?.getItems?.() || [];
      if (files.length !== 5) {
        throw new Error("Pilih tepat 5 foto/video terlebih dahulu.");
      }

      const music = window.chJedagJedugMusic?.getSelection?.();
      if (!music) throw new Error("Pilih musik terlebih dahulu.");

      const style = document.getElementById("jj-style").value;
      const intensity = document.getElementById("jj-intensity").value;
      const transition =
        document.querySelector('input[name="jj-transition"]:checked')?.value
        || "velocity";
      const transitionSlider =
        document.getElementById("jj-transition-duration");
      const requestedTransitionDuration = Math.max(
        0.2,
        Math.min(0.9, Number(transitionSlider?.value) || 0.5)
      );
      const effects = new Set(
        Array.from(document.querySelectorAll(".jj-effect:checked")).map(x => x.value)
      );

      const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      const w = 540;
      const h = 960;
      const fps = 30;

      status.textContent = "Membaca 5 media...";
      for (const file of files) {
        loaded.push(
          file.type.startsWith("video/")
            ? await loadVideo(file)
            : await loadImage(file)
        );
      }

      status.textContent = "Menganalisis irama musik...";
      const analysis = await analyseBeats(music.file);
      const beatTimes = analysis.beats.filter(t => t >= music.start && t < music.end)
        .map(t => t - music.start);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas tidak tersedia.");

      const AC = window.AudioContext || window.webkitAudioContext;
      audioContext = new AC();
      await audioContext.resume();

      musicElement = document.createElement("audio");
      audioUrl = URL.createObjectURL(music.file);
      musicElement.src = audioUrl;
      musicElement.preload = "auto";
      await new Promise((resolve, reject) => {
        musicElement.oncanplay = resolve;
        musicElement.onerror = () => reject(new Error("Musik gagal dimuat untuk render."));
        musicElement.load();
      });

      await new Promise((resolve, reject) => {
        if (Math.abs(musicElement.currentTime - music.start) < 0.15) {
          resolve();
          return;
        }

        musicElement.onseeked = resolve;
        musicElement.onerror = () => reject(new Error("Gagal memotong musik pada waktu yang dipilih."));
        musicElement.currentTime = music.start;
      });

      const source = audioContext.createMediaElementSource(musicElement);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const destination = audioContext.createMediaStreamDestination();
      source.connect(analyser);
      analyser.connect(destination);

      const canvasStream = canvas.captureStream(fps);
      stream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      const candidates = [
        "video/mp4;codecs=avc1.42E01E",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ];
      const supportedTypes = candidates.filter(type =>
        window.MediaRecorder && MediaRecorder.isTypeSupported(type)
      );

      if (!supportedTypes.length) {
        throw new Error("Browser ini tidak mendukung perekaman video.");
      }

      const chunks = [];
      let mimeType = "";
      let lastRecorderError = null;

      for (const type of supportedTypes) {
        try {
          recorder = new MediaRecorder(stream, { mimeType: type });
          mimeType = recorder.mimeType || type;
          break;
        } catch (error) {
          lastRecorderError = error;
          recorder = null;
        }
      }

      if (!recorder) {
        throw new Error(
          "Format video tidak bisa digunakan: " +
          (lastRecorderError?.message || "coba browser lain.")
        );
      }

      recorder.ondataavailable = event => {
        if (event.data && event.data.size) chunks.push(event.data);
      };

      const duration = Math.floor(music.end - music.start);
      const segmentDuration = duration / 5;
      const transitionDuration = Math.min(
        requestedTransitionDuration, segmentDuration * 0.42
      );
      let startTime = 0;
      let lastBeat = -1;
      const frequency = new Uint8Array(analyser.frequencyBinCount);
      const actualBeats = beatTimes.length ? beatTimes : [];
      let fallbackBeat = 0.5;

      recorder.start(1000);
      await musicElement.play();

      for (const item of loaded) {
        if (item.isVideo) {
          await item.element.play().catch(() => {});
        }
      }

      status.textContent = `Merekam video ${duration} detik • ${analysis.bpm || "BPM tidak terdeteksi"} BPM perkiraan`;

      const renderStart = performance.now();
      await new Promise((resolve, reject) => {
        let previousTime = 0;

        const draw = now => {
          if (stopped) return;
          const elapsed = (now - renderStart) / 1000;
          if (elapsed >= duration) {
            resolve();
            return;
          }

          try {
            analyser.getByteFrequencyData(frequency);
            const energy = frequency.reduce((sum, value) => sum + value, 0) /
              (frequency.length * 255);
            let pulse = 0;

            if (actualBeats.length) {
              for (let i = Math.max(0, lastBeat); i < actualBeats.length; i++) {
                if (actualBeats[i] <= elapsed) lastBeat = i;
                else break;
              }
              if (lastBeat >= 0) {
                const delta = elapsed - actualBeats[lastBeat];
                pulse = Math.max(0, 1 - delta / 0.22);
              }
            } else {
              pulse = Math.max(0, Math.sin(elapsed * Math.PI * 2 / fallbackBeat)) *
                Math.min(1, energy * 2);
            }

            const segment = Math.min(4, Math.floor(elapsed / segmentDuration));
            const media = loaded[segment];
            const segmentStart = segment * segmentDuration;
            const transitionProgress =
              segment > 0 && elapsed < segmentStart + transitionDuration
                ? (elapsed - segmentStart) / transitionDuration
                : 1;

            ctx.fillStyle = "#080812";
            ctx.fillRect(0, 0, w, h);

            if (segment > 0 && transitionProgress < 1) {
              drawJJTransition(
                ctx,
                loaded[segment - 1],
                media,
                w, h, elapsed,
                style, intensity, pulse,
                transition,
                transitionProgress
              );
            } else {
              drawCover(ctx, media, w, h, elapsed, style, intensity, pulse);
            }

            if (style === "flash" && pulse > 0.68) {
              ctx.fillStyle = `rgba(255,255,255,${(pulse - 0.68) * 1.8})`;
              ctx.fillRect(0, 0, w, h);
            }

            if (style === "velocity" && pulse > 0.78) {
              ctx.fillStyle = `rgba(120,50,255,${(pulse - 0.78) * 0.7})`;
              ctx.fillRect(0, 0, w, h);
            }

            if (style === "cinematic") {
              ctx.fillStyle = "rgba(0,0,0,0.12)";
              ctx.fillRect(0, 0, w, h * 0.08);
              ctx.fillRect(0, h * 0.92, w, h * 0.08);
            }

            drawEffects(ctx, w, h, elapsed, effects, intensity, pulse);

            if (elapsed - previousTime >= 1) {
              previousTime = elapsed;
              status.textContent =
                `Render ${Math.min(100, Math.floor(elapsed / duration * 100))}% • ` +
                `${Math.floor(elapsed)}/${duration} detik • ${analysis.bpm || "BPM?"}`;
            }

            raf = requestAnimationFrame(draw);
          } catch (error) {
            reject(error);
          }
        };

        raf = requestAnimationFrame(draw);
      });

      stopped = true;
      cancelAnimationFrame(raf);
      musicElement.pause();
      for (const item of loaded) {
        if (item.isVideo) item.element.pause();
      }

      const recorderFinished = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error("Gagal merekam video."));
      });
      recorder.stop();
      await recorderFinished;

      if (!chunks.length) {
        throw new Error("Hasil render kosong. Coba browser lain.");
      }

      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) throw new Error("File video kosong.");

      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      const finalUrl = URL.createObjectURL(blob);

      output.src = finalUrl;
      output.style.display = "block";
      download.href = finalUrl;
      download.download = `CH-Jedag-Jedug.${extension}`;
      download.textContent = `⬇️ Download Video (${extension.toUpperCase()})`;
      download.style.display = "block";

      status.textContent =
        `Selesai! ${duration} detik • ${analysis.bpm || "BPM tidak terdeteksi"} BPM perkiraan • ` +
        `${(blob.size / 1024 / 1024).toFixed(1)} MB.`;

      preview.innerHTML = "<span>Render selesai. Putar video di bawah dan unduh hasilnya.</span>";
    } catch (error) {
      stopped = true;
      cancelAnimationFrame(raf);
      status.textContent = "Render gagal: " + (error?.message || "Kesalahan tidak diketahui.");
    } finally {
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch {}
      }
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (musicElement) {
        musicElement.pause();
        musicElement.removeAttribute("src");
        musicElement.load();
      }
      if (audioContext) await audioContext.close().catch(() => {});
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      for (const item of loaded) {
        try { item.cleanup(); } catch {}
      }
      button.disabled = false;
    }
  });
})();

/* CH JJ MOBILE EDITOR STEPS */
(function () {
  function initJJMobileSteps() {
    const page = document.querySelector("#page-jedagjedug");
    if (!page || page.dataset.jjMobileStepsReady === "1") return;

    const panels = Array.from(page.querySelectorAll(".jj-panel"));
    if (panels.length < 2) {
      console.warn("CH JJ: panel editor tidak ditemukan lengkap.");
      return;
    }

    const labels = ["Media", "Musik", "Gaya", "Transisi", "Efek", "Render"];
    const icons = [
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h12l-3-3M20 17H8l3 3"/><path d="m16 4 3 3-3 3M8 14l-3 3 3 3"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/></svg>',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/><path d="M4 4v16"/></svg>'
    ];

    const nav = document.createElement("nav");
    nav.className = "jj-mobile-step-nav";
    nav.setAttribute("aria-label", "Navigasi editor Jedag Jedug");

    panels.forEach((panel, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "jj-step-tab";
      button.setAttribute("aria-controls", panel.id || "jj-editor-panel-" + (index + 1));
      if (!panel.id) panel.id = "jj-editor-panel-" + (index + 1);
      button.innerHTML =
        '<span class="jj-step-icon">' + (icons[index] || icons[0]) +
        '</span><span>' + (labels[index] || ("Langkah " + (index + 1))) +
        "</span>";

      button.addEventListener("click", function () {
        activate(index);
        button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      });

      nav.appendChild(button);
    });

    function activate(index) {
      panels.forEach(function (panel, i) {
        panel.classList.toggle("jj-step-active", i === index);
      });

      Array.from(nav.children).forEach(function (button, i) {
        button.classList.toggle("active", i === index);
        button.setAttribute("aria-current", i === index ? "step" : "false");
      });
    }

    const firstPanel = panels[0];
    firstPanel.parentNode.insertBefore(nav, firstPanel);

    page.classList.add("jj-mobile-steps");
    page.dataset.jjMobileStepsReady = "1";
    activate(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initJJMobileSteps);
  } else {
    initJJMobileSteps();
  }
})();

/* CH AI STUDIO - ACCESSIBLE PROFILE DRAWER CONTROLLER */
(function () {
  let lastFocusedElement = null;

  function getProfileOverlay() {
    return document.getElementById("ch-profile-overlay");
  }

  function getFocusableElements(overlay) {
    return Array.from(overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getClientRects().length > 0);
  }

  window.openCHProfile = function () {
    const overlay = getProfileOverlay();
    if (!overlay) {
      console.error("Panel Profil tidak ditemukan.");
      return;
    }

    if (!overlay.classList.contains("ch-profile-open")) {
      lastFocusedElement = document.activeElement;
    }

    overlay.classList.add("ch-profile-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("ch-profile-visible");

    document.querySelectorAll("[data-mobile-profile]").forEach((button) => {
      button.setAttribute("aria-expanded", "true");
    });

    const closeButton = overlay.querySelector(".ch-profile-close");
    if (closeButton) {
      window.setTimeout(() => closeButton.focus(), 100);
    }
  };

  window.closeCHProfile = function () {
    const overlay = getProfileOverlay();
    if (!overlay) return;

    overlay.classList.remove("ch-profile-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ch-profile-visible");

    document.querySelectorAll("[data-mobile-profile]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });

    const focusTarget = lastFocusedElement && document.contains(lastFocusedElement)
      ? lastFocusedElement
      : document.querySelector("[data-mobile-profile]");
    if (focusTarget && typeof focusTarget.focus === "function") {
      window.setTimeout(() => focusTarget.focus(), 0);
    }
    lastFocusedElement = null;
  };

  document.addEventListener("keydown", function (event) {
    const overlay = getProfileOverlay();
    if (!overlay || !overlay.classList.contains("ch-profile-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      window.closeCHProfile();
      return;
    }

    if (event.key === "Tab") {
      const focusable = getFocusableElements(overlay);
      if (!focusable.length) {
        event.preventDefault();
        overlay.querySelector(".ch-profile-drawer")?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();

// ===== CH AI STUDIO: PROFILE ACCOUNT INTEGRATION =====
(() => {
  function getClerkUser() {
    return window.Clerk?.user || null;
  }

  function profileMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
    }
  }

  function escapeProfileText(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  window.refreshCHProfile = async function () {
    const account = document.getElementById("ch-profile-account");
    const creditsEl = document.getElementById("ch-profile-credits");
    const auth = document.getElementById("ch-profile-auth");
    const user = getClerkUser();

    if (!account) return;

    if (!user) {
      account.innerHTML = `
        <div class="ch-profile-avatar">CH</div>
        <div class="ch-profile-identity">
          <strong>Belum masuk</strong>
          <span>Masuk untuk melihat profil dan kredit</span>
        </div>`;
      if (creditsEl) creditsEl.textContent = "0";
      if (auth) {
        auth.innerHTML = `
          <button type="button" class="ch-profile-login"
            onclick="closeCHProfile();openAuth('signin')">
            Masuk / Daftar
          </button>`;
      }
      return;
    }

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean).join(" ").trim();
    const email = user.primaryEmailAddress?.emailAddress || "";
    const displayName = fullName || email.split("@")[0] || "Pengguna";
    const avatar = user.imageUrl;

    account.innerHTML = `
      ${avatar
        ? `<img class="ch-profile-avatar ch-profile-avatar-image"
             src="${escapeProfileText(avatar)}" alt="Foto profil">`
        : `<div class="ch-profile-avatar">${escapeProfileText(
             displayName.slice(0, 2).toUpperCase()
           )}</div>`}
      <div class="ch-profile-identity">
        <strong>${escapeProfileText(displayName)}</strong>
        <span>${escapeProfileText(email)}</span>
        <small class="ch-profile-online">● Akun terhubung</small>
      </div>`;

    if (auth) {
      auth.innerHTML = `
        <button type="button" class="ch-profile-action"
          onclick="logoutCH()">
          <span class="ch-profile-action-icon">
            <svg viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"
              aria-hidden="true">
              <path d="M10 17l5-5-5-5"/>
              <path d="M15 12H3"/>
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>
            </svg>
          </span>
          <span><strong>Keluar akun</strong>
            <small>Keluar dari CH AI Studio</small></span>
          <svg class="ch-profile-chevron" viewBox="0 0 24 24"
            aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>`;
    }

    // Ambil saldo melalui fungsi sinkronisasi yang sudah ada.
    if (typeof window.syncCredits === "function") {
      await window.syncCredits();
    } else {
      try {
        const token = await window.Clerk.session?.getToken();
        if (token) {
          const response = await fetch("/api/credits", {
            headers: { Authorization: "Bearer " + token }
          });
          if (response.ok) {
            const data = await response.json();
            if (creditsEl) {
              creditsEl.textContent = String(Number(data.credits || 0));
            }
          }
        }
      } catch (error) {
        console.error("CH Profile credits:", error);
      }
    }

    // Sinkronkan angka pada panel profil setelah syncCredits selesai.
    try {
      const token = await window.Clerk.session?.getToken();
      if (token) {
        const response = await fetch("/api/credits", {
          headers: { Authorization: "Bearer " + token }
        });
        if (response.ok) {
          const data = await response.json();
          if (creditsEl) {
            creditsEl.textContent = String(Number(data.credits || 0));
          }
        }
      }
    } catch (error) {
      console.error("CH Profile credit display:", error);
    }
  };

  window.editCHProfileName = async function () {
    const user = getClerkUser();

    if (!user) {
      profileMessage("Silakan masuk terlebih dahulu.");
      return;
    }

    const currentName = [user.firstName, user.lastName]
      .filter(Boolean).join(" ").trim();

    const input = prompt("Masukkan nama tampilan baru:", currentName);
    if (input === null) return;

    const name = input.trim();
    if (name.length < 2) {
      profileMessage("Nama minimal 2 karakter.");
      return;
    }

    if (name.length > 60) {
      profileMessage("Nama maksimal 60 karakter.");
      return;
    }

    const parts = name.split(/\s+/);
    const firstName = parts.shift();
    const lastName = parts.join(" ");

    try {
      await user.update({ firstName, lastName });
      await window.refreshCHProfile();
      profileMessage("Nama profil berhasil diperbarui.");
    } catch (error) {
      console.error("CH Edit profile:", error);
      profileMessage(
        error?.errors?.[0]?.longMessage ||
        "Nama belum berhasil diubah. Coba lagi."
      );
    }
  };

  window.showCHCreditHistory = async function () {
    const user = getClerkUser();

    if (!user) {
      profileMessage("Masuk terlebih dahulu untuk melihat akun.");
      return;
    }

    // Belum mengklaim riwayat transaksi yang belum disediakan API.
    profileMessage(
      "Saldo kamu ditampilkan di panel profil. " +
      "Riwayat transaksi perlu dihubungkan ke data pembayaran."
    );
  };

  window.openCHSettings = function () {
    if (!getClerkUser()) {
      profileMessage("Masuk terlebih dahulu untuk mengatur akun.");
      return;
    }

    const choice = confirm(
      "PENGATURAN CH AI STUDIO\n\n" +
      "OK: Muat ulang aplikasi\n" +
      "Batal: Kembali ke profil"
    );

    if (choice) location.reload();
  };

  window.openCHHelp = function () {
    alert(
      "PUSAT BANTUAN — CH AI STUDIO\n\n" +
      "• Profil dan email: gunakan akun Clerk yang sedang login.\n" +
      "• Kredit: periksa saldo pada kartu profil.\n" +
      "• Beli kredit: tekan tombol Beli kredit.\n\n" +
      "Jika ada masalah, catat pesan error yang muncul."
    );
  };

  // Tambahkan kelas gambar profil tanpa mengubah gaya ikon SVG.
  if (!document.getElementById("ch-profile-account-extra-style")) {
    const style = document.createElement("style");
    style.id = "ch-profile-account-extra-style";
    style.textContent = `
      #ch-profile-account .ch-profile-avatar-image {
        display: block;
        width: 48px;
        height: 48px;
        min-width: 48px;
        border-radius: 15px;
        object-fit: cover;
      }
      #ch-profile-account .ch-profile-online {
        display: block;
        margin-top: 4px;
        color: #80e6bd;
        font-size: 11px;
      }
    `;
    document.head.appendChild(style);
  }

  // Bungkus fungsi pembuka yang sudah ada agar desain drawer tetap dipakai.
  const originalOpen = window.openCHProfile;
  window.openCHProfile = function () {
    if (typeof originalOpen === "function") originalOpen();
    window.refreshCHProfile();
  };

  // Isi profil saat Clerk selesai memuat dan ketika status login berubah.
  window.addEventListener("load", () => {
    window.refreshCHProfile();
    if (window.Clerk?.addListener) {
      window.Clerk.addListener(() => window.refreshCHProfile());
    }
  });
})();
