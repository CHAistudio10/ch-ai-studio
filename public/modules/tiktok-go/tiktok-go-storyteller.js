const HOOK_TEMPLATES = [
  "Jujur, awalnya gak nyangka di {location_short} ada tempat se-menarik ini...",
  "Tolong jangan skip kalau kamu lagi cari tempat makan di {location_short}!",
  "Plot twist kuliner hari ini: nemu {name} yang lagi ada penawaran khusus.",
  "Warga {location_short}, fix kalian wajib tahu tempat satu ini sebelum makin rame!",
  "Niatnya cuma lewat, eh malah salfok sama {menuName} di {name}."
];

const CURIOSITY_TEMPLATES = [
  "Dari luar kelihatan tenang, pas masuk suasananya bikin betah banget.",
  "Banyak yang belum ngeh kalau di sini ada {menuName} dengan konsep kayak gini.",
  "Lihat tampilan menunya aja udah bikin pengen langsung mampir sekarang juga.",
  "Tempatnya cocok banget buat agenda makan bareng atau sekadar mampir santai."
];

const CTA_MAPS_OPTIONS = [
  "Mau tahu tempatnya? Klik tag lokasi di video ini.",
  "Simpan tempatnya, klik tag Maps untuk melihat lokasi restorannya.",
  "Kalau mau mampir, langsung klik lokasi yang sudah ditandai."
];

const CTA_PROMO_OPTIONS = [
  "Penasaran sama promonya? Klik tag promo TikTok di video ini.",
  "Mau pesan paketnya? Klik promo TikTok, pembelian di sini.",
  "Jangan cuma lihat makanannya, cek promonya lewat tag TikTok."
];

export class CulinaryStoryteller {
  static generateStoryboard(project) {
    const { restaurantData, photos, promptInstruction } = project;
    const totalFrames = photos.length;

    if (totalFrames < 5) {
      throw new Error('Minimal upload 5 foto restoran/makanan untuk membuat alur cerita.');
    }

    const name = restaurantData.name.trim() || 'Restoran Ini';
    const menu = restaurantData.menuName.trim() || 'Menu Spesial';
    const location = restaurantData.location.trim() || 'lokasi ini';
    const locationShort = location.split(',')[0].trim();
    const highlights = restaurantData.highlights.trim();
    const promoInfo = restaurantData.promoInfo.trim();

    let priceText = '';
    if (restaurantData.normalPrice && restaurantData.promoPrice) {
      priceText = `Dari Rp${restaurantData.normalPrice} jadi Rp${restaurantData.promoPrice}`;
    } else if (restaurantData.promoPrice) {
      priceText = `Promo mulai Rp${restaurantData.promoPrice}`;
    } else if (restaurantData.normalPrice) {
      priceText = `Harga Rp${restaurantData.normalPrice}`;
    }

    const isFunny = /lucu|absurd|komedi|receh/i.test(promptInstruction);
    const narrativeBlocks = [];

    let hook = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)]
      .replace('{location_short}', locationShort)
      .replace('{name}', name)
      .replace('{menuName}', menu);
    if (isFunny) {
      hook = `Dompet aman, perut senang? Cek dulu ${name} sebelum kalap!`;
    }
    narrativeBlocks.push({ phase: 'HOOK', text: hook });

    const curiosity = CURIOSITY_TEMPLATES[Math.floor(Math.random() * CURIOSITY_TEMPLATES.length)]
      .replace('{menuName}', menu);
    narrativeBlocks.push({ phase: 'CURIOSITY', text: curiosity });

    narrativeBlocks.push({
      phase: 'INTRO_RESTO',
      text: `Kenalin, ini ${name} yang berlokasi di ${location}.`
    });

    const detailPool = [
      `Salah satu andalannya ada ${menu}.`,
      highlights ? `Keunggulannya: ${highlights}.` : `Menu dan suasananya pas banget buat masuk wishlist kuliner kamu.`,
      promoInfo ? `Info spesial: ${promoInfo}.` : `Tersedia pilihan paket makan yang praktis buat dipesan.`,
      priceText ? `${priceText} — cek detail lengkapnya di tag promo.` : `Cek penawaran paket makannya langsung lewat tag TikTok.`,
      `Cocok buat kamu yang lagi cari referensi tempat makan di sekitar ${locationShort}.`,
      `Dari tampilan hidangan sampai sudut tempatnya siap nemenin waktu makanmu.`
    ];

    const middleSlots = Math.max(1, totalFrames - 5);
    for (let i = 0; i < middleSlots; i++) {
      const text = detailPool[i % detailPool.length];
      narrativeBlocks.push({ phase: 'SHOWCASE', text });
    }

    const ctaMaps = CTA_MAPS_OPTIONS[Math.floor(Math.random() * CTA_MAPS_OPTIONS.length)];
    narrativeBlocks.push({ phase: 'CTA_MAPS', text: ctaMaps });

    const ctaPromo = CTA_PROMO_OPTIONS[Math.floor(Math.random() * CTA_PROMO_OPTIONS.length)];
    narrativeBlocks.push({ phase: 'CTA_PROMO', text: ctaPromo });

    const mappedScenes = photos.map((photo, index) => {
      const block = narrativeBlocks[index] || {
        phase: 'EXTRA',
        text: `${name} — ${menu}. Cek lokasi & promonya sekarang!`
      };
      return {
        photoId: photo.id,
        frameIndex: index + 1,
        phase: block.phase,
        text: block.text
      };
    });

    const captionData = this.generateCaptionAndHashtags(restaurantData, ctaMaps, ctaPromo);

    return {
      scenes: mappedScenes,
      caption: captionData.caption,
      hashtags: captionData.hashtags
    };
  }

  static generateCaptionAndHashtags(data, ctaMaps, ctaPromo) {
    const name = data.name.trim() || '[Nama Restoran]';
    const menu = data.menuName.trim() || '[Nama Menu/Paket Promo]';
    const location = data.location.trim();

    let priceLine = '';
    if (data.normalPrice && data.promoPrice) {
      priceLine = `Harga normal Rp${data.normalPrice}, sekarang promo Rp${data.promoPrice}.\n`;
    } else if (data.promoPrice) {
      priceLine = `Penawaran promo mulai Rp${data.promoPrice}.\n`;
    } else if (data.normalPrice) {
      priceLine = `Harga mulai Rp${data.normalPrice}.\n`;
    }

    const promoDetailLine = data.promoInfo ? `Info promo: ${data.promoInfo}.\n` : '';
    const locationLine = location ? `Lokasi: ${location}.\n` : '';

    const caption = [
      `Lagi cari tempat makan yang menarik buat dikunjungi? Coba cek ${name}.`,
      `Ada ${menu} yang bisa kamu cek penawarannya.`,
      priceLine.trim(),
      promoDetailLine.trim(),
      locationLine.trim(),
      ``,
      `📍 ${ctaMaps}`,
      `🎟️ ${ctaPromo}`
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n');

    const cleanTag = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const tags = new Set([
      '#kuliner',
      '#rekomendasimakanan',
      '#tiktokfood',
      '#promomakanan',
      '#tempatmakan',
      name !== '[Nama Restoran]' ? `#${cleanTag(name)}` : null,
      menu !== '[Nama Menu/Paket Promo]' ? `#${cleanTag(menu)}` : null,
      location ? `#kuliner${cleanTag(location.split(',')[0])}` : null
    ]);

    return {
      caption,
      hashtags: Array.from(tags).filter(Boolean).join(' ')
    };
  }
}
