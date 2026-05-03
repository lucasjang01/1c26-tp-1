FROM node:22
RUN mkdir /opt/app
WORKDIR /opt/app
COPY . .
RUN npm install
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT [ "node", "app.js" ]