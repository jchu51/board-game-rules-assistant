FROM node:22-alpine

RUN apk add --no-cache coreutils

WORKDIR /workspace

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
RUN npm install --ignore-scripts

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "-w", "web", "--", "--host", "0.0.0.0"]
