FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs gemini.mjs engine.mjs index.html app.mjs style.css ./
ENV HOST=0.0.0.0
ENV PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
