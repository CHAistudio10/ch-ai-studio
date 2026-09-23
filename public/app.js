
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

const KEY = "ch_ai_studio_state";

let state;

try {
  state = JSON.parse(localStorage.getItem(KEY)) || {
    credits: 100,
    assets: [],
    projects: [],
    mode: "image"
  };
} catch {
  state = {
    credits: 100,
    assets: [],
    projects: [],
    mode: "image"
  };
}

if (state.credits <= 0) {
  state.credits = 20;
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

function renderRecent() {
  const el = document.getElementById("recent");
  if (!el) return;

  if (!state.assets.length) {
    el.innerHTML = "<p>Belum ada hasil AI.</p>";
    return;
  }

  el.innerHTML = state.assets
    .slice(0, 6)
    .map(
      item => `
        <div class="asset-card">
          <img src="${item.image}" alt="AI Image">
          <div>
            <small>${item.prompt}</small>
          </div>
        </div>
      `
    )
    .join("");
}

function renderAssets() {
  const el = document.getElementById("assets");
  if (!el) return;

  if (!state.assets.length) {
    el.innerHTML = "<p>Belum ada asset.</p>";
    return;
  }

  el.innerHTML = state.assets
    .map(
      item => `
        <div class="asset-card">
          <img src="${item.image}" alt="AI Image">
          <p>${item.prompt}</p>
          <a href="${item.image}" download="ch-ai-studio.jpg">
            Download
          </a>
        </div>
      `
    )
    .join("");
}

function renderProjects() {
  const el = document.getElementById("projects");
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

  if (state.credits <= 0) {
    alert("Credit kamu sudah habis.");
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

    state.credits--;

    state.assets.unshift({
      image: data.image,
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

  if (!validImages.length) {
    return;
  }

  state.lastGeneratedImage = validImages[0];

  let result = document.getElementById("generatedResult");

  if (!result) {
    result = document.createElement("div");
    result.id = "generatedResult";

    const main =
      document.querySelector("main") ||
      document.body;

    main.appendChild(result);
  }

  result.innerHTML = `
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
}
function setupGenerateButton() {
  const button =
    document.getElementById("generateBtn") ||
    document.querySelector("[data-generate]");

  if (button) {
    button.addEventListener("click", generate);
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
});


async function generateVideo() {
  const input = document.getElementById("prompt");
  const button = document.getElementById("generateBtn");
  const container = document.getElementById("results");

  if (!input || !input.value.trim()) {
    alert("Tulis prompt video terlebih dahulu.");
    return;
  }

  if (state.credits <= 0) {
    alert("Credit kamu sudah habis.");
    return;
  }

  const prompt = input.value.trim();

    const refFile = document.getElementById("refFile");
    let referenceImages = [];

    if (refFile && refFile.files && refFile.files.length) {
      const files = Array.from(refFile.files).slice(0, 5);

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

    state.credits--;

    state.assets.unshift({
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
  state.mode = mode;
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
    const promptInput = document.getElementById("prompt"); if (promptInput) promptInput.placeholder = "Ayo bikin ide kamu dalam gambar menjadi video se-kreatif mungkin, sesuai keinginan kamu."; 
    if (cost) cost.textContent = "2";
  } else {
    if (modelOption) modelOption.style.display = "block";
    if (resolutionOption) resolutionOption.style.display = "block";
    if (countOption) countOption.style.display = "block";
    if (durationOption) durationOption.style.display = "none";
    if (fpsOption) fpsOption.style.display = "none";
    if (videoReferenceOption) videoReferenceOption.style.display = "none";

    if (generateBtn) generateBtn.textContent = "✦ Generate Image";
    if (cost) cost.textContent = "2";
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

function buyCredits(amount) {
  alert(
    `Pembelian ${amount} credit masih dalam tahap pengembangan.`
  );
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
