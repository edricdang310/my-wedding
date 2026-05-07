/**
 * =============================================================
 *   Script nén ảnh cho Wedding Website
 *   Dùng: Node.js + sharp
 *   Cài : npm install sharp
 *   Chạy: node compress_images.js
 * =============================================================
 *
 *  CẤU HÌNH – chỉnh tại đây nếu cần:
 *  - JPEG_QUALITY : Chất lượng JPG (1-100). Mặc định 75.
 *  - PNG_QUALITY  : Chất lượng PNG (1-100). Mặc định 80.
 *  - MAX_SIZE     : Chiều rộng/cao tối đa (px). Ảnh lớn hơn sẽ thu nhỏ.
 *  - BACKUP       : true = lưu bản gốc vào images/_backup/
 * =============================================================
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────
//  CẤU HÌNH
// ─────────────────────────────────────────────
const IMAGES_DIR   = path.join(__dirname, "images");
const JPEG_QUALITY = 75;     // 1-100
const PNG_QUALITY  = 80;     // 1-100
const MAX_SIZE     = 1920;   // px (cạnh dài nhất)
const BACKUP       = true;   // Lưu bản gốc vào _backup/?
const SKIP_DIRS    = ["_backup"];
// ─────────────────────────────────────────────

const SUPPORTED = [".jpg", ".jpeg", ".png"];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function findImages(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      results = results.concat(findImages(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED.includes(ext)) results.push(fullPath);
    }
  }
  return results;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function backupFile(filePath) {
  const rel = path.relative(IMAGES_DIR, filePath);
  const dest = path.join(IMAGES_DIR, "_backup", rel);
  ensureDir(path.dirname(dest));
  if (!fs.existsSync(dest)) fs.copyFileSync(filePath, dest);
}

async function compressImage(filePath) {
  const sizeBefore = fs.statSync(filePath).size;
  const ext = path.extname(filePath).toLowerCase();

  if (BACKUP) backupFile(filePath);

  // Ghi ra file tạm rồi replace
  const tmpPath = filePath + ".tmp";

  try {
    let pipeline = sharp(filePath).rotate(); // rotate() giữ EXIF orientation

    // Thu nhỏ nếu quá lớn
    pipeline = pipeline.resize(MAX_SIZE, MAX_SIZE, {
      fit: "inside",
      withoutEnlargement: true,
    });

    if (ext === ".png") {
      pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9, effort: 10 });
    } else {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    }

    await pipeline.toFile(tmpPath);

    const sizeAfter = fs.statSync(tmpPath).size;

    // Chỉ giữ file nén nếu nhỏ hơn bản gốc
    if (sizeAfter < sizeBefore) {
      fs.renameSync(tmpPath, filePath);
      return { sizeBefore, sizeAfter };
    } else {
      fs.unlinkSync(tmpPath);
      return { sizeBefore, sizeAfter: sizeBefore }; // không đổi
    }
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw err;
  }
}

async function main() {
  const LINE = "=".repeat(62);
  const DASH = "-".repeat(62);

  console.log(LINE);
  console.log("  🖼️   SCRIPT NÉN ẢNH – WEDDING WEBSITE");
  console.log(LINE);

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Không tìm thấy thư mục: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const images = findImages(IMAGES_DIR);
  if (images.length === 0) {
    console.log("⚠️  Không tìm thấy ảnh nào.");
    return;
  }

  const backupRoot = path.join(IMAGES_DIR, "_backup");
  console.log(`\n📁 Thư mục ảnh  : ${IMAGES_DIR}`);
  console.log(`🔢 Tổng số ảnh  : ${images.length} file`);
  console.log(`🎯 Chất lượng   : JPG=${JPEG_QUALITY}%, PNG=${PNG_QUALITY}%, Max=${MAX_SIZE}px`);
  if (BACKUP) console.log(`💾 Backup tại   : ${backupRoot}`);
  console.log(`\n${DASH}`);

  let totalBefore = 0;
  let totalAfter  = 0;

  for (let i = 0; i < images.length; i++) {
    const filePath = images[i];
    const rel = path.relative(IMAGES_DIR, filePath);
    const num = `[${String(i + 1).padStart(2, "0")}/${images.length}]`;

    try {
      const { sizeBefore, sizeAfter } = await compressImage(filePath);
      const saved = sizeBefore - sizeAfter;
      const pct   = sizeBefore > 0 ? ((saved / sizeBefore) * 100).toFixed(0) : 0;
      const icon  = saved > 0 ? "✅" : "➡️ ";

      console.log(`  ${icon} ${num} ${rel}`);
      console.log(
        `        ${formatSize(sizeBefore).padStart(10)}  →  ${formatSize(sizeAfter).padEnd(10)}` +
        `  (tiết kiệm ${formatSize(saved)}, -${pct}%)`
      );

      totalBefore += sizeBefore;
      totalAfter  += sizeAfter;
    } catch (err) {
      console.log(`  ⚠️  ${num} ${rel} — Lỗi: ${err.message}`);
      const s = fs.statSync(filePath).size;
      totalBefore += s;
      totalAfter  += s;
    }
  }

  const totalSaved = totalBefore - totalAfter;
  const pctTotal   = totalBefore > 0 ? ((totalSaved / totalBefore) * 100).toFixed(1) : 0;

  console.log(`\n${LINE}`);
  console.log("  📊  KẾT QUẢ TỔNG HỢP");
  console.log(LINE);
  console.log(`  Dung lượng trước : ${formatSize(totalBefore)}`);
  console.log(`  Dung lượng sau   : ${formatSize(totalAfter)}`);
  console.log(`  Đã tiết kiệm     : ${formatSize(totalSaved)}  (-${pctTotal}%)`);
  if (BACKUP) console.log(`\n  💾 Bản gốc được lưu tại: ${backupRoot}`);
  console.log("\n  ✅ Hoàn thành!");
  console.log(LINE);
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng:", err);
  process.exit(1);
});
