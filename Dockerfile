FROM node:18.16.0-alpine

WORKDIR /app
COPY . /app

RUN apk add --no-cache curl && \
    mkdir cache && \
    chown -R node:node static cache && \
    npm install --production && \
    rm -rf /tmp/* /root/.npm

EXPOSE 5005

USER node

HEALTHCHECK --interval=1m --timeout=2s \
    CMD curl -LSfs http://localhost:5005/zones || exit 1

CMD npm start