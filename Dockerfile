FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first so npm install is only re-run when they change
COPY package*.json ./
COPY prisma ./prisma

RUN npm install

# Copy the rest of the source files
COPY . .

# Generate the Prisma client for the container's target platform
RUN npx prisma generate

# Compile the Next.js production bundle into .next/
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

# Apply any pending schema migrations then start the production server
CMD sh -c "npx prisma migrate deploy && npm start"
