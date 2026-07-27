---
name: beera-ops
description: Use this skill when you need to build, preview, run, test, or containerize the Beera app (e.g., using npm commands or Docker).
---

# Beera Development & Operations Skill

This skill provides step-by-step instructions for running development, build, typecheck, and containerization commands for the Beera application.

## Local Development Commands

To run the application locally, you must first install the dependencies.

### Installation
```bash
npm install
```

### Run Dev Server
Runs the development server using Vite.
```bash
npm run dev
```

### Build for Production
Compiles TypeScript and bundles static assets into the `dist/` directory.
```bash
npm run build
```

### Preview Production Build
Starts a local server to preview the production-built site.
```bash
npm run preview
```

### TypeScript Validation
Run the TypeScript compiler without emitting files to verify typing correctness.
```bash
npx tsc --noEmit
```

---

## Docker Containerization

Beera can be containerized and run locally via Docker. The setup is split into a multi-stage build: building assets via Node.js, and serving them via Nginx.

### Build Docker Image
Run from the root of the project to build the Docker image named `beera`:
```bash
docker build -t beera .
```

### Run Docker Container
Run the built image in detached mode, mapping host port `8080` to Nginx port `80`:
```bash
docker run -d -p 8080:80 --name beera-app beera
```

### Monitor Container Logs
View the logs of the running container:
```bash
docker logs beera-app
```

### Stop and Clean Up Container
Stop and remove the running container to clean up resources:
```bash
docker stop beera-app
docker rm beera-app
```
