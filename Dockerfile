# 开发阶段镜像：运行 Vite dev server（HMR 热更新），固定 8000 端口
FROM node:20-alpine

WORKDIR /app

# 先复制依赖清单，充分利用缓存
COPY package.json package-lock.json ./
RUN npm install

# 复制其余源码
COPY . .

EXPOSE 8000

# 直接启动 vite，避免 npm script 中的 lsof（Alpine 无该命令），strictPort 固定端口
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "8000", "--strictPort"]
