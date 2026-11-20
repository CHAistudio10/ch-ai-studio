const scenes = [
  {name:"Opening scene",prompt:"",duration:6,image:null},
  {name:"Introduction",prompt:"",duration:6,image:null},
  {name:"Story development",prompt:"",duration:6,image:null},
  {name:"Climax scene",prompt:"",duration:6,image:null},
  {name:"Final scene",prompt:"",duration:6,image:null}
];

let current = 0;
let generating = false;
const $ = id => document.getElementById(id);
const tiles = [...document.querySelectorAll(".scene-tile")];

function totalDuration(){
  return scenes.reduce((sum,s)=>sum+s.duration,0);
}

function timeText(seconds){
  return `00:${String(seconds).padStart(2,"0")}`;
}

function sceneStart(index){
  return scenes.slice(0,index).reduce((sum,s)=>sum+s.duration,0);
}

function saveCurrent(){
  scenes[current].name = $("sceneTitle").value.trim() || `Scene 0${current+1}`;
  scenes[current].prompt = $("motionPrompt").value;
  scenes[current].duration = Number(
    document.querySelector(".duration.active")?.dataset.duration || scenes[current].duration
  );
}

function updateScene(){
  const s = scenes[current];
  const start = sceneStart(current);
  const end = start + s.duration;
  const total = totalDuration();

  $("sceneTitle").value = s.name;
  $("motionPrompt").value = s.prompt;
  $("charCount").textContent = `${s.prompt.length} / 1500`;
  $("sceneTime").textContent = `${timeText(start)} — ${timeText(end)}`;
  $("frameNumber").textContent = `SCENE 0${current+1}`;
  $("sideNumber").textContent = `0${current+1}`;
  $("sideDuration").textContent = `${String(s.duration).padStart(2,"0")}s`;
  $("directionHeading").textContent = s.name;

  $("previewImage").style.display = s.image ? "block" : "none";
  $("previewPlaceholder").style.display = s.image ? "none" : "flex";
  $("previewImage").src = s.image || "";

  tiles.forEach((tile,i)=>{
    tile.classList.toggle("active",i===current);
    const beginning = sceneStart(i);
    const ending = beginning + scenes[i].duration;
    tile.querySelector("b").textContent = scenes[i].name.slice(0,13).toUpperCase();
    tile.querySelector("small").textContent =
      `${String(beginning).padStart(2,"0")}–${String(ending).padStart(2,"0")}s`;
  });

  document.querySelectorAll(".duration").forEach(button=>{
    button.classList.toggle("active",Number(button.dataset.duration)===s.duration);
  });

  $("timelineProgress").style.width = `${total ? (end/total)*100 : 0}%`;
  const totalLabel = document.querySelector(".total-time");
  if(totalLabel) totalLabel.innerHTML = `${total}<span>s</span>`;

  $("previousScene").disabled = current===0;
  $("previousScene").style.opacity = current===0 ? ".4" : "1";
  $("nextScene").textContent = current===4 ? "LAST SCENE ✓" : "NEXT SCENE ↗";
}

function selectScene(index){
  saveCurrent();
  current = Math.max(0,Math.min(4,index));
  updateScene();
}

tiles.forEach((tile,i)=>{
  tile.addEventListener("click",()=>selectScene(i));
});

$("sceneTitle").addEventListener("input",e=>{
  scenes[current].name=e.target.value;
  $("directionHeading").textContent=e.target.value || `Scene 0${current+1}`;
  tiles[current].querySelector("b").textContent =
    (e.target.value || `SCENE 0${current+1}`).slice(0,13).toUpperCase();
});

$("motionPrompt").addEventListener("input",e=>{
  scenes[current].prompt=e.target.value;
  $("charCount").textContent=`${e.target.value.length} / 1500`;
});

document.querySelectorAll(".duration").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll(".duration").forEach(b=>b.classList.remove("active"));
    button.classList.add("active");
    scenes[current].duration=Number(button.dataset.duration);
    updateScene();
  });
});

$("uploadButton").addEventListener("click",()=>$("imageInput").click());

$("imageInput").addEventListener("change",e=>{
  const file=e.target.files?.[0];
  if(!file)return;

  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
    alert("Gunakan gambar JPG, PNG atau WEBP.");
    e.target.value="";
    return;
  }

  if(file.size>10*1024*1024){
    alert("Ukuran gambar maksimal 10 MB.");
    e.target.value="";
    return;
  }

  if(scenes[current].image) URL.revokeObjectURL(scenes[current].image);
  scenes[current].imageFile=file;
  scenes[current].image=URL.createObjectURL(file);
  updateScene();
  e.target.value="";
});

$("clearImage").addEventListener("click",()=>{
  if(scenes[current].image) URL.revokeObjectURL(scenes[current].image);
  scenes[current].image=null;
  updateScene();
});

$("previousScene").addEventListener("click",()=>selectScene(current-1));
$("nextScene").addEventListener("click",()=>selectScene(current+1));

function saveProject(){
  saveCurrent();

  const data={
    title:$("projectTitle").value.trim() || "Untitled Storyboard",
    format:"9:16",
    scenes:scenes.map(s=>({
      name:s.name,
      prompt:s.prompt,
      duration:s.duration
    })),
    updatedAt:new Date().toISOString()
  };

  try{
    localStorage.setItem("ch_storyboard_x_draft",JSON.stringify(data));
    $("saveMessage").textContent="✓ Draft storyboard berhasil disimpan di perangkat.";
  }catch(error){
    $("saveMessage").textContent="Gagal menyimpan draft. Periksa ruang penyimpanan browser.";
  }
}

$("saveProject").addEventListener("click",saveProject);
$("saveTop").addEventListener("click",saveProject);

try{
  const saved=JSON.parse(localStorage.getItem("ch_storyboard_x_draft")||"null");

  if(saved){
    $("projectTitle").value=saved.title || $("projectTitle").value;

    (saved.scenes||[]).forEach((scene,i)=>{
      if(!scenes[i])return;
      scenes[i].name=scene.name || scenes[i].name;
      scenes[i].prompt=scene.prompt || "";
      scenes[i].duration=[6,8,10].includes(Number(scene.duration))
        ? Number(scene.duration) : 6;
    });
  }
}catch(error){
  console.warn("Draft sebelumnya tidak dapat dibaca.");
}

updateScene();





// ===== CH STORYBOARD X : AUTO FIVE SCENE TO ONE MP4 =====

let batchRunning = false;
let batchVideoUrls = [];

const batchButton = $("generateAllScenes");
const batchStatus = $("batchStatus");
const batchResults = $("batchResults");

const waitBatch = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readSceneImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca gambar."));
    reader.readAsDataURL(file);
  });
}

async function generateOneScene(scene, index) {
  batchStatus.textContent = `Mengirim adegan ${index + 1}/5 ke DeAPI...`;

  const image = await readSceneImage(scene.imageFile);

  const response = await fetch("/api/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: scene.prompt,
      image_b64: image,
      seed: 42 + index
    })
  });

  const created = await response.json();

  if (!response.ok || !created.requestId) {
    throw new Error(created.error || `Gagal mengirim adegan ${index + 1}.`);
  }

  for (let attempt = 0; attempt < 90; attempt++) {
    await waitBatch(5000);

    batchStatus.textContent =
      `DeAPI sedang membuat adegan ${index + 1}/5...`;

    const check = await fetch("/api/video-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: created.requestId })
    });

    const result = await check.json();

    if (!check.ok) {
      throw new Error(result.error || `Gagal memeriksa adegan ${index + 1}.`);
    }

    const status = String(result.status || "").toUpperCase();

    if (status === "FAILED") {
      throw new Error(result.error || `Adegan ${index + 1} gagal dibuat.`);
    }

    if (status === "COMPLETED") {
      const url = result.output?.media_url;

      if (!url) {
        throw new Error(`URL video adegan ${index + 1} tidak ditemukan.`);
      }

      return url;
    }
  }

  throw new Error(`Waktu tunggu adegan ${index + 1} habis.`);
}

async function mergeFiveScenes(urls) {
  const area = document.getElementById("mergeArea");
  const status = document.getElementById("mergeStatus");

  try {
    status.textContent = "Memuat mesin penggabung video...";

    const { FFmpeg } = await import(
      "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
    );

    const { toBlobURL } = await import(
      "https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js"
    );

    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      if (message) status.textContent = message.slice(-160);
    });

    const base =
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    await ffmpeg.load({
      coreURL: await toBlobURL(
        base + "/ffmpeg-core.js",
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        base + "/ffmpeg-core.wasm",
        "application/wasm"
      )
    });

    for (let i = 0; i < urls.length; i++) {
      status.textContent = `Mengunduh video ${i + 1}/5...`;

      const response = await fetch(urls[i]);

      if (!response.ok) {
        throw new Error(
          `Tidak bisa mengambil video adegan ${i + 1}.`
        );
      }

      const data = new Uint8Array(
        await response.arrayBuffer()
      );

      await ffmpeg.writeFile(`scene${i + 1}.mp4`, data);
    }

    status.textContent = "Menggabungkan lima adegan...";

    const filters = scenes.map((scene, i) => {
      const duration = Number(scene.duration);

      return (
        `[${i}:v]` +
        `trim=duration=${duration},` +
        "setpts=PTS-STARTPTS," +
        "fps=24," +
        "scale=512:512:force_original_aspect_ratio=decrease," +
        "pad=512:512:(ow-iw)/2:(oh-ih)/2," +
        "setsar=1,format=yuv420p" +
        `[v${i}]`
      );
    });

    const concat =
      scenes.map((scene, i) => `[v${i}]`).join("") +
      "concat=n=5:v=1:a=0[outv]";

    const total = scenes.reduce(
      (sum, scene) => sum + Number(scene.duration),
      0
    );

    await ffmpeg.exec([
      "-i", "scene1.mp4",
      "-i", "scene2.mp4",
      "-i", "scene3.mp4",
      "-i", "scene4.mp4",
      "-i", "scene5.mp4",
      "-filter_complex", filters.join(";") + ";" + concat,
      "-map", "[outv]",
      "-t", String(total),
      "-an",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "27",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "CH-STORYBOARD-FINAL.mp4"
    ]);

    status.textContent = "Menyiapkan MP4 final...";

    const output = await ffmpeg.readFile(
      "CH-STORYBOARD-FINAL.mp4"
    );

    const blob = new Blob([output], {
      type: "video/mp4"
    });

    const finalUrl = URL.createObjectURL(blob);

    const player = document.createElement("video");
    player.src = finalUrl;
    player.controls = true;
    player.playsInline = true;
    player.style.cssText =
      "width:100%;border-radius:14px;margin-top:14px;background:#000";

    const download = document.createElement("a");
    download.href = finalUrl;
    download.download = "CH-STORYBOARD-FINAL.mp4";
    download.textContent = "DOWNLOAD FINAL MP4 ↓";
    download.style.cssText =
      "display:block;padding:15px;margin-top:14px;text-align:center;background:#8155ed;color:white;border-radius:12px;font-weight:bold;text-decoration:none";

    area.append(player, download);

    status.textContent =
      `✓ BERHASIL! 5 ADEGAN DIGABUNG MENJADI MP4 — ${total} DETIK`;

    batchButton.textContent = "✓ SELESAI";

  } catch (error) {
    console.error("CH STORYBOARD MERGE:", error);

    status.textContent =
      "Gagal menggabungkan video: " + error.message;

    throw error;
  }
}

function showMergeArea() {
  const area = document.createElement("section");
  area.id = "mergeArea";
  area.style.cssText =
    "margin:20px 0;padding:16px;border:1px solid #7654bd;border-radius:16px";

  const heading = document.createElement("h3");
  heading.textContent = "CH STORYBOARD X — FINAL VIDEO";

  const status = document.createElement("p");
  status.id = "mergeStatus";
  status.textContent = "Lima video selesai. Menyiapkan penggabungan...";

  area.append(heading, status);
  batchResults.appendChild(area);

  return area;
}

async function generateAllScenes() {
  if (batchRunning) return;

  saveCurrent();

  const missing = scenes
    .map((scene, index) => ({ scene, index }))
    .filter(item =>
      !item.scene.imageFile || !item.scene.prompt.trim()
    );

  if (missing.length) {
    batchStatus.textContent =
      "Lengkapi gambar dan prompt adegan: " +
      missing.map(item => item.index + 1).join(", ");

    return;
  }

  const total = scenes.reduce(
    (sum, scene) => sum + Number(scene.duration),
    0
  );

  if (!confirm(
    `Generate 5 video secara berurutan? Total durasi target ${total} detik. Proses menggunakan layanan DeAPI.`
  )) return;

  batchRunning = true;
  batchButton.disabled = true;
  batchButton.textContent = "SEDANG MEMPROSES...";
  batchResults.replaceChildren();
  batchVideoUrls = [];

  let success = 0;

  try {
    for (let i = 0; i < scenes.length; i++) {
      batchStatus.textContent =
        `Memulai adegan ${i + 1}/5...`;

      const url = await generateOneScene(scenes[i], i);

      batchVideoUrls.push(url);
      success++;

      batchStatus.textContent =
        `✓ Adegan ${success}/5 selesai.`;
    }

    batchStatus.textContent =
      "✓ Semua adegan selesai. Mulai menggabungkan MP4...";

    showMergeArea();

    await mergeFiveScenes(batchVideoUrls);

  } catch (error) {
    console.error("CH STORYBOARD:", error);

    batchStatus.textContent =
      `${success}/5 adegan selesai. PROSES BERHENTI: ${error.message}`;

  } finally {
    batchRunning = false;
    batchButton.disabled = false;

    if (success !== 5) {
      batchButton.textContent = "COBA GENERATE LAGI";
    }
  }
}

batchButton?.addEventListener("click", generateAllScenes);
