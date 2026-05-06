# Sử dụng image Node.js phiên bản gọn nhẹ (alpine)
FROM node:20-alpine

# Tạo và thiết lập thư mục làm việc bên trong container
WORKDIR /usr/src/app

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở port 3333 (port mà server.js đang lắng nghe)
EXPOSE 3000

# Lệnh để khởi chạy ứng dụng
CMD ["node", "server.js"]
