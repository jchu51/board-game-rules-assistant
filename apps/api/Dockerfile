FROM node:22-alpine

WORKDIR /workspace

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "run", "dev", "-w", "api"]
