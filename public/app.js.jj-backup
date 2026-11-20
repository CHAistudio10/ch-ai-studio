
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
  const a = document.getElementById("topCredits");
  const b = document.getElementById("sideCredits");

  if (a) a.textContent = state.credits;
  if (b) b.textContent = state.credits;
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
    state.assets = Array.isArray(saved?.assets) ? saved.assets : [];
    state.projects = Array.isArray(saved?.projects) ? saved.projects : [];
    state.mode = saved?.mode || "image";
    renderRecent();
    renderAssets();
    renderProjects();
  }

  try {
    const token = await Clerk.session?.getToken();
    if (!token) return;

    const response = await fetch("/api/credits", {
      headers: { Authorization: "Bearer " + token }
    });

    if (!response.ok) return;

    const data = await response.json();
    state.credits = Number(data.credits || 0);
    localStorage.setItem(KEY, JSON.stringify(state));
    renderCredits();
  } catch (error) {
    console.error("Sync credits:", error);
  }
}

async function useCredit(cost) {
  if (!window.Clerk?.user) return false;

  const token = await Clerk.session?.getToken();
  if (!token) return false;

  const response = await fetch("/api/use-credit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ cost })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    state.credits = Number(data.credits || 0);
    renderCredits();
    return false;
  }

  state.credits = Number(data.credits);
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
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.remove("open");
    document.body.classList.remove("menu-open");
  }

  document.querySelectorAll(".page").forEach(el => {
    el.style.display = "none";
  });

  const target = document.getElementById("page-" + page);

  if (target) {
    target.style.display = "block";
  }

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.remove("active");
  });

  const nav = document.querySelector(`[data-page="${page}"]`);

  if (nav) {
    nav.classList.add("active");
  }

  if (addHistory) {
    history.pushState({ page }, "", "#" + page);
  }
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
let chChatMessages=[];
function newChat(){chChatMessages=[];renderChatMessages();}
function escapeChatHtml(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function renderChatMessages(){const b=document.getElementById("chatMessages");if(!b)return;if(!chChatMessages.length){b.innerHTML=`<div class="chat-empty"><div class="chat-logo">CH</div><h3>Halo, gue CH Chat AI 👋</h3><p>Tanya apa aja. Mau serius, santai, cari ide, atau sekadar ngobrol.</p></div>`;return;}b.innerHTML=chChatMessages.map(m=>`<div class="chat-bubble ${m.role==="user"?"user":"ai"}"><div class="chat-name">${m.role==="user"?"Kamu":"CH Chat AI"}</div><div class="chat-text">${escapeChatHtml(m.content).replace(/\n/g,"<br>")}</div></div>`).join("");b.scrollTop=b.scrollHeight;}
async function sendChatMessage(){const input=document.getElementById("chatInput");if(!input)return;const text=input.value.trim();if(!text)return;input.value="";chChatMessages.push({role:"user",content:text});renderChatMessages();const btn=document.getElementById("chatSend");if(btn)btn.disabled=true;chChatMessages.push({role:"assistant",content:"Sedang mikir..."});renderChatMessages();try{const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chChatMessages.slice(0,-1)})});const data=await res.json();chChatMessages.pop();if(!res.ok)throw new Error(data.error||"Gagal menghubungi CH Chat AI");chChatMessages.push({role:"assistant",content:data.reply||"Maaf, belum ada jawaban."});}catch(err){chChatMessages.pop();chChatMessages.push({role:"assistant",content:"Maaf, CH Chat AI sedang mengalami kendala. Coba lagi ya."});console.error("CH CHAT ERROR:",err);}finally{if(btn)btn.disabled=false;renderChatMessages();}}
document.addEventListener("DOMContentLoaded",()=>{const form=document.getElementById("chatForm");const input=document.getElementById("chatInput");if(form)form.addEventListener("submit",e=>{e.preventDefault();sendChatMessage();});if(input)input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChatMessage();}});renderChatMessages();});

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

  let musicFile = null;
  let musicUrl = null;
  let musicDuration = 0;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      info.textContent = "File harus berupa audio.";
      input.value = "";
      return;
    }

    if (musicUrl) URL.revokeObjectURL(musicUrl);

    musicFile = file;
    musicUrl = URL.createObjectURL(file);
    musicDuration = 0;

    audio.src = musicUrl;
    audio.style.display = "block";
    info.textContent = `Musik dipilih: ${file.name}. Membaca durasi...`;

    audio.onloadedmetadata = () => {
      musicDuration = audio.duration;

      if (!Number.isFinite(musicDuration) || musicDuration <= 0) {
        info.textContent = "Durasi musik tidak bisa dibaca oleh browser.";
        return;
      }

      startInput.max = String(Math.max(0, musicDuration - 30));
      startInput.value = "0";
      endInput.max = String(musicDuration);
      endInput.value = String(Math.floor(musicDuration));

      if (musicDuration < 30) {
        info.textContent = `Durasi musik ${musicDuration.toFixed(1)} detik. Musik harus berdurasi minimal 30 detik.`;
      } else {
        info.textContent = `Musik siap: ${file.name} • ${musicDuration.toFixed(1)} detik.`;
      }
    };

    audio.onerror = () => {
      info.textContent = "Browser tidak dapat membaca file musik ini.";
    };

    input.value = "";
  });

  function getSelection() {
    const start = Number(startInput.value);
    const end = Number(endInput.value);

    if (!musicFile) throw new Error("Pilih file musik terlebih dahulu.");
    if (!Number.isFinite(musicDuration) || musicDuration < 30) {
      throw new Error("Musik harus berdurasi minimal 30 detik.");
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end > musicDuration || end - start < 30) {
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

            ctx.fillStyle = "#080812";
            ctx.fillRect(0, 0, w, h);

            drawCover(ctx, media, w, h, elapsed, style, intensity, pulse);

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
