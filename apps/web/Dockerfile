FROM node:22-alpine

WORKDIR /workspace

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "-w", "web", "--", "--host", "0.0.0.0"]
