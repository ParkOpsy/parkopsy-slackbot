FROM node:slim

MAINTAINER Greg Nitsenko <grigory.nitsenko@dell.com>

COPY . /app

RUN cd /app \
  && npm install --production

WORKDIR /app

ENTRYPOINT ["node", "slack_bot.js"]
