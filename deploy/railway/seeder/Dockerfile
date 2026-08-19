FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY fixtures ./fixtures
COPY lib ./lib
COPY scripts ./scripts
COPY tsconfig.json ./tsconfig.json
COPY deploy/railway/seeder/run.sh /usr/local/bin/blastpath-seed

RUN chmod 755 /usr/local/bin/blastpath-seed

CMD ["/usr/local/bin/blastpath-seed"]
