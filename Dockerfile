# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN test -n "$NEXT_PUBLIC_POCKETBASE_URL" || (echo "NEXT_PUBLIC_POCKETBASE_URL es obligatoria durante el build" && exit 1)
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@aws-sdk/s3-request-presigner ./node_modules/@aws-sdk/s3-request-presigner
COPY --from=builder --chown=nextjs:nodejs /app/desktop/update-integrity.mjs ./desktop/update-integrity.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/desktop_update_expired_url_verifier_core.mjs ./scripts/desktop_update_expired_url_verifier_core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify_desktop_expired_url.mjs ./scripts/verify_desktop_expired_url.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/desktop_update_tampered_manifest_verifier_core.mjs ./scripts/desktop_update_tampered_manifest_verifier_core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify_desktop_tampered_manifest.mjs ./scripts/verify_desktop_tampered_manifest.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/desktop_update_corrupt_download_verifier_core.mjs ./scripts/desktop_update_corrupt_download_verifier_core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify_desktop_corrupt_download.mjs ./scripts/verify_desktop_corrupt_download.mjs
COPY --from=builder --chown=nextjs:nodejs /app/desktop/update-client-policy.mjs ./desktop/update-client-policy.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/desktop_update_mandatory_verifier_core.mjs ./scripts/desktop_update_mandatory_verifier_core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify_desktop_mandatory_update.mjs ./scripts/verify_desktop_mandatory_update.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/desktop_update_stable_preflight_verifier_core.mjs ./scripts/desktop_update_stable_preflight_verifier_core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify_desktop_stable_preflight.mjs ./scripts/verify_desktop_stable_preflight.mjs

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
