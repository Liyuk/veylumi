FROM node:22-alpine
WORKDIR /app
COPY packages/recommendation-contract ./packages/recommendation-contract
COPY services/recommendation ./services/recommendation
ENV NODE_ENV=production
ENV VEYLUMI_RECOMMENDATION_PORT=8790
EXPOSE 8790
CMD ["node", "services/recommendation/server/recommendation-server.mjs"]
