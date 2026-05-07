#!/usr/bin/env python3
"""
=============================================================
  Script nén ảnh cho Wedding Website
  Tác giả: Antigravity
  Mô tả: Tự động tìm và nén tất cả ảnh JPG/PNG trong thư mục
         images/, lưu bản gốc vào images/_backup/
=============================================================

Cách dùng:
  1. Cài Pillow: pip install Pillow
  2. Chạy:       python compress_images.py

Tùy chỉnh:
  - JPEG_QUALITY  : Chất lượng ảnh JPG (1-95). Mặc định 75 (đẹp + nhẹ).
  - MAX_WIDTH     : Chiều rộng tối đa (px). Ảnh lớn hơn sẽ bị thu nhỏ.
  - MAX_HEIGHT    : Chiều cao tối đa (px).
  - BACKUP        : True = giữ bản gốc trong images/_backup/
=============================================================
"""

import os
import shutil
from pathlib import Path
from PIL import Image

# ─────────────────────────────────────────────
#  CẤU HÌNH – Chỉnh tại đây nếu cần
# ─────────────────────────────────────────────
IMAGES_DIR   = Path(__file__).parent / "images"   # Thư mục ảnh
JPEG_QUALITY = 75        # Chất lượng JPG (1-95). 75 = cân bằng đẹp & nhẹ
PNG_OPTIMIZE = True      # True = tối ưu PNG (không mất chất lượng)
MAX_WIDTH    = 1920      # Chiều rộng tối đa (px)
MAX_HEIGHT   = 1920      # Chiều cao tối đa (px)
BACKUP       = True      # True = lưu bản gốc vào _backup/
SKIP_DIRS    = {"_backup"}  # Bỏ qua các thư mục này
# ─────────────────────────────────────────────

SUPPORTED = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}


def format_size(size_bytes: int) -> str:
    """Định dạng dung lượng file cho dễ đọc."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / 1024 ** 2:.2f} MB"


def backup_file(src: Path, backup_root: Path) -> None:
    """Sao lưu file gốc vào thư mục _backup giữ nguyên cấu trúc."""
    rel = src.relative_to(IMAGES_DIR)
    dest = backup_root / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copy2(src, dest)


def compress_image(path: Path, backup_root: Path) -> tuple[int, int]:
    """
    Nén một file ảnh. Trả về (size_before, size_after).
    """
    size_before = path.stat().st_size

    if BACKUP:
        backup_file(path, backup_root)

    try:
        with Image.open(path) as img:
            # Chuyển RGBA/P → RGB cho JPG
            ext = path.suffix.lower()
            if ext in {".jpg", ".jpeg"} and img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            # Thu nhỏ nếu quá lớn (giữ tỉ lệ)
            w, h = img.size
            if w > MAX_WIDTH or h > MAX_HEIGHT:
                img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)

            # Lưu với nén
            if ext in {".jpg", ".jpeg"}:
                img.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)
            elif ext == ".png":
                img.save(path, "PNG", optimize=PNG_OPTIMIZE)

    except Exception as e:
        print(f"  ⚠️  Lỗi khi xử lý {path.name}: {e}")
        return size_before, size_before  # Không thay đổi

    size_after = path.stat().st_size
    return size_before, size_after


def find_images(root: Path) -> list[Path]:
    """Tìm tất cả ảnh được hỗ trợ, bỏ qua SKIP_DIRS."""
    result = []
    for item in root.rglob("*"):
        if item.is_file() and item.suffix in SUPPORTED:
            # Bỏ qua nếu nằm trong thư mục cần skip
            if any(skip in item.parts for skip in SKIP_DIRS):
                continue
            result.append(item)
    return sorted(result)


def main():
    print("=" * 60)
    print("  🖼️   SCRIPT NÉN ẢNH – WEDDING WEBSITE")
    print("=" * 60)

    if not IMAGES_DIR.exists():
        print(f"❌ Không tìm thấy thư mục: {IMAGES_DIR}")
        return

    backup_root = IMAGES_DIR / "_backup"
    images = find_images(IMAGES_DIR)

    if not images:
        print("⚠️  Không tìm thấy ảnh nào.")
        return

    print(f"\n📁 Thư mục ảnh : {IMAGES_DIR}")
    print(f"🔢 Tổng số ảnh  : {len(images)} file")
    print(f"🎯 Chất lượng  : JPG={JPEG_QUALITY}%, Max={MAX_WIDTH}x{MAX_HEIGHT}px")
    if BACKUP:
        print(f"💾 Backup       : {backup_root}")
    print()
    print("-" * 60)

    total_before = 0
    total_after  = 0

    for i, img_path in enumerate(images, 1):
        rel = img_path.relative_to(IMAGES_DIR)
        b, a = compress_image(img_path, backup_root)

        saved = b - a
        pct   = (saved / b * 100) if b > 0 else 0
        arrow = "✅" if saved > 0 else "➡️ "

        print(f"  {arrow} [{i:02d}/{len(images)}] {rel}")
        print(f"        {format_size(b):>10}  →  {format_size(a):<10}  "
              f"(tiết kiệm {format_size(saved)}, -{pct:.0f}%)")

        total_before += b
        total_after  += a

    total_saved = total_before - total_after
    pct_total   = (total_saved / total_before * 100) if total_before > 0 else 0

    print()
    print("=" * 60)
    print("  📊  KẾT QUẢ TỔNG HỢP")
    print("=" * 60)
    print(f"  Dung lượng trước : {format_size(total_before)}")
    print(f"  Dung lượng sau   : {format_size(total_after)}")
    print(f"  Đã tiết kiệm     : {format_size(total_saved)}  (-{pct_total:.1f}%)")
    if BACKUP:
        print(f"\n  💾 Bản gốc được lưu tại: {backup_root}")
    print("\n  ✅ Hoàn thành!")
    print("=" * 60)


if __name__ == "__main__":
    main()
