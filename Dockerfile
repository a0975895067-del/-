FROM node:22-alpine
WORKDIR /app
COPY secure-backend ./secure-backend
COPY outputs ./outputs
RUN mkdir -p /data && chown -R node:node /app /data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATABASE_PATH=/data/math-mission.sqlite
EXPOSE 8787
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node","secure-backend/server.mjs"]
