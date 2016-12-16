FROM node:slim

MAINTAINER Greg Nitsenko <grigory.nitsenko@dell.com>

ENV CERTIFICATES_HOME /usr/local/share/ca-certificates

COPY emc_ca.crt $CERTIFICATES_HOME
COPY emc_ssl.crt $CERTIFICATES_HOME

RUN update-ca-certificates

COPY . /app

RUN cd /app \
  && npm install --production

WORKDIR /app

RUN node slack_bot.js 
