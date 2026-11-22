import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

function escapeDrawtext(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\u2019")
    .replace(/%/g, "\\%")
    .replace(/\n/g, "\\n");
}

function getZoompanFilter(animation, frames) {
  switch (animation) {
    case "zoom-in":
      return `zoompan=z='min(zoom+0.0018,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
    case "zoom-out":
      return `zoompan=z='if(lte(zoom,1.0),1.25,max(1.0,zoom-0.0018))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
    case "pan-left":
      return `zoompan=z='1.18':x='max(0,(iw-iw/zoom)*(1-on/${frames}))':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
    case "pan-right":
      return `zoompan=z='1.18':x='min(iw-iw/zoom,(iw-iw/zoom)*(on/${frames}))':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
    case "vertical-pan":
      return `zoompan=z='1.18':x='iw/2-(iw/zoom/2)':y='min(ih-ih/zoom,(ih-ih/zoom)*(on/${frames}))':d=${frames}:s=1080x1920:fps=30`;
    case "cinematic-zoom":
    default:
      return `zoompan=z='min(zoom+0.0012,1.16)':x='iw/2-(iw/zoom/2)+sin(on/20)*12':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
  }
}

function mapXfade(transition) {
  switch (transition) {
    case "flash": return "fadewhite";
    case "slide": return "slideleft";
    case "whip": return "smoothleft";
    case "blur": return "distance";
    case "beat": return "zoomin";
    case "fade":
    default: return "fade";
  }
}

function getYPos(pos) {
  if (pos === "top") return "260";
  if (pos === "bottom") return "h-520";
  return "(h-text_h)/2";
}

function resolveFontOption() {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf"),
    "/system/fonts/Roboto-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
  ];
  for (const p of candidates) {
    if (fsSync.existsSync(p)) return `fontfile='${p}':`;
  }
  return "";
}

export function registerAffiliateRenderRoute(app, { getClerkUserId }) {
  app.get("/api/affiliate-tiktok/status", async (req, res) => {
    try {
      const { stdout } = await execFileAsync("ffmpeg", ["-version"]);
      return res.json({ ffmpegAvailable: true, version: stdout.split("\n")[0] });
    } catch {
      return res.json({
        ffmpegAvailable: false,
        workerConfigured: Boolean(process.env.FFMPEG_WORKER_URL)
      });
    }
  });

  app.post("/api/affiliate-tiktok/render", async (req, res) => {
    let workDir = "";
    try {
      let clerkUserId = await getClerkUserId(req);
      if (!clerkUserId && !process.env.VERCEL) {
        clerkUserId = "local_dev_cahya";
      }
      if (!clerkUserId) {
        return res.status(401).json({ error: "Login diperlukan untuk merender video." });
      }

      const { storyboard, photosBase64, audioBase64, audioStartSec = 0 } = req.body || {};
      if (!storyboard || !Array.isArray(storyboard.scenes) || !Array.isArray(photosBase64) || photosBase64.length < 5) {
        return res.status(400).json({ error: "Data storyboard atau foto tidak lengkap." });
      }

      // Cek ketersediaan binary FFmpeg pada runtime saat ini
      let localFfmpeg = false;
      try {
        await execFileAsync("ffmpeg", ["-version"]);
        localFfmpeg = true;
      } catch {
        localFfmpeg = false;
      }

      if (!localFfmpeg) {
        if (process.env.FFMPEG_WORKER_URL) {
          const workerResp = await fetch(process.env.FFMPEG_WORKER_URL + "/render-affiliate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + (process.env.FFMPEG_WORKER_SECRET || "")
            },
            body: JSON.stringify({ storyboard, photosBase64, audioBase64, audioStartSec })
          });
          if (!workerResp.ok) throw new Error("FFmpeg Worker gagal merender video.");
          const arrBuf = await workerResp.arrayBuffer();
          res.setHeader("Content-Type", "video/mp4");
          return res.send(Buffer.from(arrBuf));
        }
        return res.status(503).json({
          error: "FFmpeg tidak tersedia di runtime serverless ini. Jalankan di Termux/VPS lokal atau hubungkan FFMPEG_WORKER_URL."
        });
      }

      workDir = await fs.mkdtemp(path.join(os.tmpdir(), "ch-tiktok-"));
      const photoPaths = [];
      for (let i = 0; i < photosBase64.length; i++) {
        const rawB64 = String(photosBase64[i].data || "").replace(/^data:image\/\w+;base64,/, "");
        const pPath = path.join(workDir, `photo_${i}.jpg`);
        await fs.writeFile(pPath, Buffer.from(rawB64, "base64"));
        photoPaths.push(pPath);
      }

      let audioPath = null;
      if (audioBase64) {
        const rawAudio = String(audioBase64).replace(/^data:audio\/[\w.-]+;base64,/, "");
        audioPath = path.join(workDir, "music.mp3");
        await fs.writeFile(audioPath, Buffer.from(rawAudio, "base64"));
      }

      const targetDuration = Number(storyboard.duration) === 30 ? 30 : 20;
      const flatClips = [];
      storyboard.scenes.forEach((scene, sIdx) => {
        const isLastScene = sIdx === storyboard.scenes.length - 1;
        const pIdxs = Array.isArray(scene.photoIndexes) && scene.photoIndexes.length ? scene.photoIndexes : [0];
        const subDur = Math.max(1.5, Number((Number(scene.duration) / pIdxs.length).toFixed(2)));
        pIdxs.forEach(pIdx => {
          flatClips.push({
            photoPath: photoPaths[pIdx] || photoPaths[0],
            duration: subDur,
            scene,
            isLastScene
          });
        });
      });

      const args = ["-y"];
      flatClips.forEach(clip => {
        args.push("-loop", "1", "-t", String(clip.duration + 0.5), "-i", clip.photoPath);
      });

      if (audioPath) {
        args.push("-ss", String(Number(audioStartSec) || 0), "-t", String(targetDuration), "-i", audioPath);
      }

      const fontOpt = resolveFontOption();
      const filterChains = [];
      const transDur = 0.4;

      flatClips.forEach((clip, idx) => {
        const frames = Math.ceil((clip.duration + 0.5) * 30);
        const zoomFilter = getZoompanFilter(clip.scene.animation, frames);
        const combinedText = clip.isLastScene && storyboard.finalCTA
          ? `${clip.scene.text}\n${storyboard.finalCTA}`
          : clip.scene.text;
        const safeText = escapeDrawtext(combinedText);
        const yPos = getYPos(clip.scene.textPosition);

        // Elemen panah visual mengarah ke area tag TikTok pojok kiri bawah tanpa menutupi area UI TikTok
        const ctaLabel = storyboard.ctaType === "location" ? "↙ CEK LOKASI DI SINI" : "↙ CEK PRODUK DI SINI";
        const ctaArrow = clip.isLastScene
          ? `,drawtext=${fontOpt}text='${escapeDrawtext(ctaLabel)}':fontcolor=#00F0FF:fontsize=42:box=1:boxcolor=black@0.68:boxborderw=14:x=65:y=h-410`
          : "";

        const trimDur = clip.duration + (idx < flatClips.length - 1 ? transDur : 0);
        filterChains.push(
          `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,${zoomFilter},` +
          `drawtext=${fontOpt}text='${safeText}':fontcolor=${clip.scene.textColor || "#FFFFFF"}:fontsize=${clip.scene.fontSize || 54}:` +
          `box=1:boxcolor=black@0.58:boxborderw=20:line_spacing=12:x=(w-text_w)/2:y=${yPos}${ctaArrow},` +
          `trim=duration=${trimDur},setpts=PTS-STARTPTS[v${idx}]`
        );
      });

      let lastStream = "[v0]";
      let offsetAcc = flatClips[0].duration;
      for (let i = 1; i < flatClips.length; i++) {
        const xfadeType = mapXfade(flatClips[i].scene.transition);
        const outLabel = i === flatClips.length - 1 ? "[vout]" : `[vx${i}]`;
        const offset = Math.max(0.1, Number((offsetAcc - transDur).toFixed(2)));
        filterChains.push(`${lastStream}[v${i}]xfade=transition=${xfadeType}:duration=${transDur}:offset=${offset}${outLabel}`);
        lastStream = outLabel;
        offsetAcc += flatClips[i].duration - transDur;
      }
      if (flatClips.length === 1) {
        filterChains.push("[v0]null[vout]");
      }

      if (audioPath) {
        const aIdx = flatClips.length;
        const vol = Math.min(1, Math.max(0.1, Number(storyboard.music?.volume ?? 0.85)));
        const fadeStart = Math.max(0, targetDuration - 1.5);
        filterChains.push(`[${aIdx}:a]volume=${vol},afade=t=out:st=${fadeStart}:d=1.5[aout]`);
      }

      const outputPath = path.join(workDir, "tiktok_go_output.mp4");
      args.push("-filter_complex", filterChains.join(";"), "-map", "[vout]");
      if (audioPath) {
        args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "192k");
      }
      args.push(
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-t", String(targetDuration),
        "-movflags", "+faststart",
        outputPath
      );

      await execFileAsync("ffmpeg", args, { timeout: 180000 });
      const mp4Buffer = await fs.readFile(outputPath);

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="CH-Affiliate-TikTok-${Date.now()}.mp4"`);
      return res.send(mp4Buffer);
    } catch (error) {
      console.error("[AffiliateTikTok Render Error]:", error);
      return res.status(500).json({ error: error?.message || "Gagal merender video FFmpeg." });
    } finally {
      if (workDir) {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  });
}
