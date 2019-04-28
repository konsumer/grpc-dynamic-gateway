FROM node:boron

WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm install
RUN git clone https://github.com/googleapis/googleapis.git /tmp/proto && mv /tmp/proto/google /

EXPOSE 8080
VOLUME /api.proto

ENTRYPOINT ["node", "/usr/src/app/cli.js"]
CMD ["/api.proto"]
