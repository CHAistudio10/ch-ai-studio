
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
        ratio: "9:16",
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

    showGeneratedImage(data.image);

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

function showGeneratedImage(image) {
  state.lastGeneratedImage = image;
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
      <img
        src="${image}"
        alt="Generated AI Image"
        style="max-width:100%;border-radius:16px;"
      >
      <br><br>
      <a href="${image}" download="ch-ai-studio.jpg">
        Download Gambar
      </a>
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
    let referenceImage = null;

    if (refFile && refFile.files && refFile.files[0]) {
      referenceImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(refFile.files[0]);
      });
    }

    if (!referenceImage && state.lastGeneratedImage) {
      referenceImage = state.lastGeneratedImage;
    }

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
        ratio: "9:16",
        fps: 24,
        duration: 6,
        image_b64: referenceImage
      })
    });

    const data = await response.json();

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
    document.getElementById("result") ||
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
    "Model pria memakai kaos C.H di jalan Tokyo malam hari, cinematic fashion photography.",
    "Video pendek transformasi desain kaos C.H dari sketsa menjadi produk nyata.",
    "Model streetwear memakai kaos C.H di tengah suasana kota Jakarta saat malam.",
    "Foto editorial kaos C.H dengan nuansa vintage retro dan lighting dramatis.",
    "Konten POV ojol menemukan brand kaos lokal C.H dengan konsep street fashion."
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

function go(page) {
  const sidebar = document.querySelector(".sidebar"); if (sidebar) { sidebar.classList.remove("open"); document.body.classList.remove("menu-open"); }
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
}

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
  const generateBtn = document.getElementById("generateBtn");
  const cost = document.getElementById("cost");

  if (mode === "video") {
    if (modelOption) modelOption.style.display = "none";
    if (resolutionOption) resolutionOption.style.display = "none";
    if (countOption) countOption.style.display = "none";
    if (durationOption) durationOption.style.display = "block";
    if (fpsOption) fpsOption.style.display = "block";

    if (generateBtn) generateBtn.textContent = "✦ Generate Video";
    if (cost) cost.textContent = "2";
  } else {
    if (modelOption) modelOption.style.display = "block";
    if (resolutionOption) resolutionOption.style.display = "block";
    if (countOption) countOption.style.display = "block";
    if (durationOption) durationOption.style.display = "none";
    if (fpsOption) fpsOption.style.display = "none";

    if (generateBtn) generateBtn.textContent = "✦ Generate Image";
    if (cost) cost.textContent = "2";
  }
}

function clearRef() {
  const input = document.getElementById("reference");

  if (input) {
    input.value = "";
  }
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

