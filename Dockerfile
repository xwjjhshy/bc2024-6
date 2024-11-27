
FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

RUN npm install -g nodemon && npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["nodemon", "--", "node", "index.js", "-h", "0.0.0.0", "-p", "3000", "-c", "/app/cache"]
