import crypto from "crypto";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null;

async function getClerkUserId(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.sub || null;
  } catch (error) {
    console.error("Clerk token verify error:", error?.name, error?.message);
    return null;
  }
}
async function getUserCredits(clerkUserId) {
  const { data, error } = await supabase.rpc("get_or_create_user_credits", {
    p_clerk_user_id: clerkUserId
  });
  if (error) throw error;
  return Number(data || 0);
}


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "15mb", verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); } }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.get("/api/credits", async (req, res) => {
  try {
    const clerkUserId = await getClerkUserId(req);
    if (!clerkUserId) return res.status(401).json({ error: "Login diperlukan." });
    const credits = await getUserCredits(clerkUserId);
    res.json({ credits });
  } catch (error) {
    console.error("Credits error:", error);
    res.status(500).json({ error: "Gagal mengambil credit." });
  }
});

app.post("/api/use-credit", async (req, res) => {
  try {
    const { cost } = req.body || {};
    const clerkUserId = await getClerkUserId(req);
    if (!clerkUserId) return res.status(401).json({ error: "Login diperlukan." });

    const { data, error } = await supabase.rpc("use_user_credit", {
      p_clerk_user_id: clerkUserId,
      p_cost: Number(cost)
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    res.json({
      success: Boolean(result?.success),
      credits: Number(result?.credits || 0)
    });
  } catch (error) {
    console.error("Use credit error:", error);
    res.status(500).json({ error: "Gagal menggunakan credit." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: true,
    provider: "Pollinations"
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, ratio = "9:16", model = "CH Image Demo", resolution = "1K", count = 1 } = req.body || {};

    const sizeMap = {
      "1K": { short: 640, long: 1024 },
      "2K": { short: 1024, long: 1536 }
    };

    const size = sizeMap[resolution] || sizeMap["1K"];
    let width, height;

    if (ratio === "1:1") {
      width = size.short;
      height = size.short;
    } else if (ratio === "16:9") {
      width = size.long;
      height = Math.round(size.long * 9 / 16);
    } else {
      width = Math.round(size.long * 9 / 16);
      height = size.long;
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt wajib diisi."
      });
    }

    const finalPrompt =
      `USER REQUEST: ${prompt.trim()}. Follow the user request exactly. Preserve the main subject, clothing, pose, location, objects, colors, text, and composition requested by the user. Do not add unrelated subjects or objects. Generate only what is requested. Style/model: ${model}. Aspect ratio: ${ratio}. Resolution target: ${resolution}. High detail, accurate composition, professional lighting, clean image.`;

    const results = [];
    const total = Math.min(Math.max(Number(count) || 1, 1), 2);

    for (let i = 0; i < total; i++) {
      const response = await fetch("https://gateway.pixazo.ai/flux-1-schnell/v1/getData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": process.env.PIXAZO_API_KEY
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          num_steps: 8,
          num_frames: 240,
          frame_rate: 24,
          width,
          height
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pixazo gagal (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const imageUrl = data?.output || data?.image_url || data?.url || data?.output?.media_url?.[0];

      if (!imageUrl) {
        throw new Error("Pixazo tidak mengembalikan URL gambar.");
      }

      results.push(imageUrl);
    }

    res.json({
      ok: true,
      image: results[0],
      images: results,
      count: results.length,
      model: "Pixazo Flux Schnell",
      ratio,
      resolution
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err?.message || "AI gagal membuat gambar."
    });
  }
});


// Global error handler. Vercel's native Express runtime turns the app into a single
// Function; an unhandled error can leave that Function in an undefined state, so we
// always convert errors into a clean JSON response instead of letting Express swallow them.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || "Terjadi kesalahan pada server." });
});

// Only bind a port when running locally. On Vercel the default export is used directly.


const DEAPI_API = "https://api.deapi.ai";

app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, image_b64 = "", seed = 42 } = req.body || {};

    if (!prompt?.trim())
      return res.status(400).json({ error: "Prompt video wajib diisi." });

    if (!image_b64)
      return res.status(400).json({ error: "Gambar wajib diisi untuk video I2V." });

    if (!process.env.DEAPI_API_KEY)
      return res.status(500).json({ error: "DEAPI_API_KEY belum dikonfigurasi." });

    const base64 = image_b64.replace(/^data:image\/[^;]+;base64,/, "");
    const imageBuffer = Buffer.from(base64, "base64");

    if (!imageBuffer.length)
      return res.status(400).json({ error: "Data gambar tidak valid." });

    const form = new FormData();

    form.append(
      "first_frame_image",
      new Blob([imageBuffer], { type: "image/jpeg" }),
      "input.jpg"
    );

    form.append("model", "Ltx2_3_22B_Dist_INT8");
    form.append("prompt", prompt.trim());
    form.append("width", "512");
    form.append("height", "512");
    form.append("frames", "241");
    form.append("fps", "24");
    form.append("seed", String(Number(seed) || 42));

    const response = await fetch(
      DEAPI_API + "/api/v2/videos/animations",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.DEAPI_API_KEY,
          Accept: "application/json"
        },
        body: form
      }
    );

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("DEAPI VIDEO RAW RESPONSE:", responseText);
      throw new Error(
        "deAPI mengembalikan respons bukan JSON: " +
        responseText.slice(0, 500)
      );
    }

    console.log("DEAPI VIDEO CREATE:", data);

    if (!response.ok || !data?.data?.request_id) {
      throw new Error(
        data?.message ||
        data?.error ||
        data?.detail ||
        "deAPI gagal membuat video."
      );
    }

    const requestId = data.data.request_id;

    res.status(202).json({
      ok: true,
      requestId,
      status: "PROCESSING",
      pollingUrl: "/api/video-status?requestId=" +
        encodeURIComponent(requestId),
      model: "Ltx2_3_22B_Dist_INT8"
    });

  } catch (err) {
    console.error("DEAPI VIDEO ERROR:", err);
    res.status(500).json({
      error: err?.message || "Gagal membuat video."
    });
  }
});

app.post("/api/video-status", async (req, res) => {
  try {
    let requestId = req.body?.requestId || req.body?.eventId;

    if (!requestId && req.body?.pollingUrl) {
      const url = new URL(req.body.pollingUrl, "http://localhost");
      requestId = url.searchParams.get("requestId");
    }

    if (!requestId)
      return res.status(400).json({ error: "Request ID tidak ditemukan." });

    const response = await fetch(
      DEAPI_API + "/api/v2/jobs/" + encodeURIComponent(requestId),
      {
        headers: {
          Authorization: "Bearer " + process.env.DEAPI_API_KEY,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    console.log("DEAPI VIDEO STATUS:", data);

    if (!response.ok)
      throw new Error(data?.message || "Gagal mengambil status video deAPI.");

    const job = data?.data;

    if (job?.status === "done") {
      return res.json({
        status: "COMPLETED",
        output: { media_url: job.result_url }
      });
    }

    if (job?.status === "failed" || job?.error_code || job?.error_reason) {
      return res.json({
        status: "FAILED",
        error: job.error_reason || "Video gagal dibuat."
      });
    }

    res.json({
      status: "PROCESSING",
      progress: job?.progress ?? 0
    });

  } catch (err) {
    console.error("DEAPI VIDEO STATUS ERROR:", err);
    res.status(500).json({
      error: err?.message || "Gagal mengecek status video."
    });
  }
});



// ===== MIDTRANS QRIS =====
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const MIDTRANS_IS_PRODUCTION =
  String(process.env.MIDTRANS_IS_PRODUCTION || "false").toLowerCase() === "true";

const MIDTRANS_API_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

const CREDIT_PACKAGES = {
  starter: { amount: 10000, credits: 20, title: "CH AI Studio Starter" },
  creator: { amount: 20000, credits: 50, title: "CH AI Studio Creator" },
  pro: { amount: 50000, credits: 150, title: "CH AI Studio Pro" },
  ultra: { amount: 100000, credits: 350, title: "CH AI Studio Ultra" }
};

app.post("/api/midtrans/create-order", async (req, res) => {
  let orderId = "";

  try {
    const clerkUserId = await getClerkUserId(req);

    if (!clerkUserId) {
      return res.status(401).json({ error: "Silakan login terlebih dahulu." });
    }

    if (!supabase) {
      return res.status(500).json({ error: "Supabase belum dikonfigurasi." });
    }

    if (!MIDTRANS_SERVER_KEY) {
      return res.status(500).json({
        error: "MIDTRANS_SERVER_KEY belum dikonfigurasi di Environment Variables."
      });
    }

    const packageId = String(req.body?.packageId || "").toLowerCase();
    const selected = CREDIT_PACKAGES[packageId];

    if (!selected) {
      return res.status(400).json({ error: "Paket kredit tidak valid." });
    }

    orderId = "CH-" + Date.now() + "-" +
      crypto.randomBytes(4).toString("hex").toUpperCase();

    const { error: insertError } = await supabase
      .from("midtrans_payments")
      .insert({
        clerk_user_id: clerkUserId,
        order_id: orderId,
        amount: selected.amount,
        credits: selected.credits,
        status: "PENDING"
      });

    if (insertError) {
      console.error("Midtrans order insert error:", insertError);
      return res.status(500).json({ error: "Gagal menyimpan pesanan pembayaran." });
    }

    const payload = {
      payment_type: "qris",
      transaction_details: {
        order_id: orderId,
        gross_amount: selected.amount
      },
      item_details: [{
        id: packageId,
        price: selected.amount,
        quantity: 1,
        name: selected.title
      }],
      custom_field1: clerkUserId
    };

    const midtransResponse = await fetch(
      MIDTRANS_API_URL + "/v2/charge",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": "Basic " +
            Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await midtransResponse.json().catch(() => ({}));

    if (!midtransResponse.ok) {
      console.error("Midtrans create order failed:", midtransResponse.status, result);

      await supabase
        .from("midtrans_payments")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString()
        })
        .eq("order_id", orderId);

      return res.status(502).json({
        error: result.status_message || "Midtrans gagal membuat QRIS. Periksa konfigurasi akun dan Server Key."
      });
    }

    const actions = Array.isArray(result.actions) ? result.actions : [];
    const qrAction = actions.find(action =>
      ["generate-qr-code-v2", "generate-qr-code"].includes(action.name)
    );

    if (!qrAction?.url) {
      console.error("Midtrans response tidak memiliki URL QR:", result);

      await supabase
        .from("midtrans_payments")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString()
        })
        .eq("order_id", orderId);

      return res.status(502).json({
        error: "Midtrans tidak mengembalikan QRIS. Cek konfigurasi QRIS pada akun Midtrans."
      });
    }

    await supabase
      .from("midtrans_payments")
      .update({
        transaction_id: result.transaction_id || null,
        transaction_status: result.transaction_status || "pending",
        updated_at: new Date().toISOString()
      })
      .eq("order_id", orderId);

    return res.json({
      success: true,
      orderId,
      amount: selected.amount,
      credits: selected.credits,
      qrUrl: qrAction.url,
      expiresAt: result.expiry_time || null
    });
  } catch (error) {
    console.error("Midtrans create order error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan saat membuat pesanan Midtrans." });
  }
});

app.post("/api/midtrans/notification", async (req, res) => {
  try {
    if (!supabase || !MIDTRANS_SERVER_KEY) {
      return res.status(500).json({ error: "Konfigurasi pembayaran belum lengkap." });
    }

    const body = req.body || {};
    const orderId = String(body.order_id || "");
    const transactionId = String(body.transaction_id || "");
    const statusCode = String(body.status_code || "");
    const grossAmount = String(body.gross_amount || "");
    const signature = String(body.signature_key || "");

    if (!orderId || !transactionId || !statusCode || !grossAmount || !signature) {
      return res.status(400).json({ error: "Data notifikasi tidak lengkap." });
    }

    const expectedSignature = crypto
      .createHash("sha512")
      .update(orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature.toLowerCase(), "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.error("Midtrans notification: signature tidak valid.");
      return res.status(401).json({ error: "Signature tidak valid." });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("midtrans_payments")
      .select("order_id, amount, credits, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (paymentError) throw paymentError;

    if (!payment) {
      return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    }

    if (Number(grossAmount).toFixed(2) !== Number(payment.amount).toFixed(2)) {
      console.error("Midtrans notification: nominal tidak cocok.", orderId);
      return res.status(400).json({ error: "Nominal pembayaran tidak cocok." });
    }

    const transactionStatus = String(body.transaction_status || "").toLowerCase();
    const fraudStatus = String(body.fraud_status || "").toLowerCase();

    if (transactionStatus === "settlement" && statusCode === "200") {
      if (fraudStatus && fraudStatus !== "accept") {
        return res.status(200).json({ received: true });
      }

      const { data: completed, error: completeError } = await supabase.rpc(
        "complete_midtrans_payment",
        {
          p_order_id: orderId,
          p_transaction_id: transactionId
        }
      );

      if (completeError) throw completeError;

      const result = Array.isArray(completed) ? completed[0] : completed;

      if (!result?.success) {
        return res.status(500).json({ error: "Gagal menyelesaikan pembayaran." });
      }

      console.log("Midtrans payment completed:", orderId);
    } else if (["expire", "cancel", "deny", "failure"].includes(transactionStatus)) {
      if (payment.status !== "SUCCESS") {
        await supabase
          .from("midtrans_payments")
          .update({
            status: transactionStatus.toUpperCase(),
            transaction_id: transactionId,
            transaction_status: transactionStatus,
            updated_at: new Date().toISOString()
          })
          .eq("order_id", orderId)
          .neq("status", "SUCCESS");
      }
    } else {
      await supabase
        .from("midtrans_payments")
        .update({
          transaction_id: transactionId,
          transaction_status: transactionStatus,
          updated_at: new Date().toISOString()
        })
        .eq("order_id", orderId)
        .neq("status", "SUCCESS");
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return res.status(500).json({ error: "Gagal memproses notifikasi Midtrans." });
  }
});

// Status pembayaran untuk akun yang sedang login.
app.get("/api/midtrans/status/:orderId", async (req, res) => {
  try {
    const clerkUserId = await getClerkUserId(req);

    if (!clerkUserId) {
      return res.status(401).json({ error: "Login diperlukan." });
    }

    if (!supabase) {
      return res.status(500).json({ error: "Supabase belum dikonfigurasi." });
    }

    const { data, error } = await supabase
      .from("midtrans_payments")
      .select("order_id, amount, credits, status, transaction_status")
      .eq("order_id", String(req.params.orderId || ""))
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Pesanan tidak ditemukan." });

    return res.json({
      orderId: data.order_id,
      amount: data.amount,
      credits: data.credits,
      status: data.status,
      transactionStatus: data.transaction_status
    });
  } catch (error) {
    console.error("Midtrans status error:", error);
    return res.status(500).json({ error: "Gagal memeriksa status pembayaran." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Pesan chat tidak boleh kosong." });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY belum dikonfigurasi." });
    }

    const safeMessages = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant"))
      .slice(-30);

    const contents = safeMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 12000) }]
    }));

    const models = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite"
    ];

    const systemText = "Kamu adalah CH Chat AI, asisten AI di dalam CH AI Studio yang dikembangkan oleh Cahya Handika. Gaya utama: teman ngobrol yang pintar, bukan robot yang sok pintar. Gunakan Bahasa Indonesia natural dan terasa Gen Z. Boleh memakai gue, lo, cuy, bro, wkwk, ngakak, lah, buset, atau slang lain jika cocok dengan konteks, tetapi jangan dipaksakan. Sesuaikan gaya dengan pengguna: santai untuk obrolan santai, serius dan fokus untuk masalah serius, teknis dan jelas untuk coding, bisnis, atau pertanyaan profesional. Pahami typo, bahasa gaul, singkatan, dan campuran Indonesia-Inggris. CH AI Studio adalah platform AI kreatif yang sudah memiliki fitur Generate Gambar, Generate Video, CH Chat AI, Instant untuk ide gerakan video, Template, Asset, dan Project Saya. Jangan mengatakan bahwa CH AI Studio hanya berfokus pada teks atau bahwa Generate Gambar dan Generate Video belum tersedia. Jika ditanya tentang fitur tertentu yang belum diketahui tersedia, jangan mengarang; jelaskan dengan jujur bahwa fitur tersebut belum tersedia atau belum dapat dipastikan. Jika pengguna bertanya apakah video bisa langsung otomatis di-upload ke TikTok dari CH AI Studio, jelaskan bahwa Generate Video sudah tersedia, tetapi otomatisasi upload TikTok belum tersedia jika memang belum ada. Jangan mengarang fakta, pengalaman, identitas, roadmap, atau keberadaan tim yang tidak diketahui. Jika ditanya siapa yang membuatmu, jelaskan bahwa kamu dikembangkan oleh Cahya Handika melalui CH AI Studio. Jangan menyebut dirimu ChatGPT dan jangan mengaku sebagai produk OpenAI. Jawab natural, responsif, akurat, jujur, membantu, aman, dan tidak terlalu bertele-tele kecuali pengguna meminta penjelasan detail.";

    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemText }] },
              contents,
              generationConfig: { maxOutputTokens: 2048 }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError = data?.error?.message || ("Model " + model + " gagal.");
          console.error("GEMINI CHAT MODEL ERROR:", model, data);

          const msg = String(lastError).toLowerCase();
          const retryable =
            response.status === 429 ||
            response.status === 503 ||
            msg.includes("high demand") ||
            msg.includes("overloaded") ||
            msg.includes("temporarily") ||
            msg.includes("unavailable");

          if (retryable) continue;

          return res.status(response.status).json({ error: lastError });
        }

        const reply = data?.candidates?.[0]?.content?.parts
          ?.map(p => p.text || "")
          .join("")
          .trim();

        if (!reply) {
          lastError = "AI tidak mengembalikan jawaban.";
          continue;
        }

        return res.json({ reply });
      } catch (err) {
        lastError = err?.message || "Network error";
        console.error("GEMINI CHAT FETCH ERROR:", model, err);
      }
    }

    return res.status(503).json({
      error: lastError || "Semua model CH Chat AI sedang sibuk. Coba lagi beberapa saat."
    });
  } catch (err) {
    console.error("CH CHAT ERROR:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada CH Chat AI." });
  }
});

// 404 for unmatched API routes (static assets are served by Vercel's CDN from public/**)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});



if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`CH AI Studio berjalan di http://localhost:${PORT}`);
  });
}

export default app;
