FROM node:22
WORKDIR /opt/app
COPY . .
RUN npm install
CMD ["node", "app.js"]
ENTRYPOINT [ "node", "app.js" ]