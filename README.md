# ICDesign Lab Fullstack Starter

## Folder structure

```text
icdesign-lab/
|-- client/
|   |-- src/
|   |   |-- lib/
|   |   |   `-- api.js
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   `-- index.css
|   |-- tailwind.config.js
|   |-- postcss.config.js
|   `-- package.json
|-- server/
|   |-- config/
|   |   `-- db.js
|   |-- index.js
|   |-- .env.example
|   `-- package.json
|-- package.json
`-- README.md
```

## Installation

1. Install dependencies in root, client, and server:

   ```bash
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Setup environment variables for backend:

   - Copy `server/.env.example` to `server/.env`
   - Update `MONGO_URI` if needed

## Run scripts

- Run both frontend and backend:

  ```bash
  npm run dev
  ```

- Run frontend only:

  ```bash
  npm run client
  ```

- Run backend only:

  ```bash
  npm run server
  ```

## Routes configured in frontend

- `/`
- `/members`
- `/research`
- `/documents`
- `/recruitment`
- `/login`
- `/admin/dashboard`

## Deployment guide (step-by-step)

### 1) Prepare MongoDB (Atlas)

1. Create a MongoDB Atlas cluster.
2. Create a database user with username/password.
3. In Network Access, allow your backend host IP (or `0.0.0.0/0` for quick setup).
4. Copy connection string and set:

   - `MONGO_URI=mongodb+srv://...`

### 2) Deploy backend (Render/Railway/Fly.io)

1. Create a new Web Service from `server` folder.
2. Build command:

   ```bash
   npm install
   ```

3. Start command:

   ```bash
   npm start
   ```

4. Set environment variables:

   - `PORT=5000` (or platform default)
   - `MONGO_URI=<your atlas uri>`
   - `JWT_SECRET=<strong random secret>`
   - `CORS_ORIGINS=<your frontend domain>`
   - `GROQ_API_KEY=<your groq api key>`

5. After deploy, test:

   - `GET https://<your-backend-domain>/api/health`

### 3) Deploy frontend (Vercel/Netlify)

1. Import project and use `client` as root directory.
2. Build command:

   ```bash
   npm run build
   ```

3. Output directory:

   ```bash
   dist
   ```

4. Set frontend environment variable:

   - `VITE_API_URL=https://<your-backend-domain>/api`

5. Deploy and open app URL.

### 4) Connect frontend <-> backend

1. Copy frontend production URL.
2. Add it to backend CORS:

   - `CORS_ORIGINS=https://<your-frontend-domain>`

   If using multiple domains:

   - `CORS_ORIGINS=https://<frontend1>,https://<frontend2>`

3. Redeploy backend.
4. Verify login and CRUD work in browser.

### 5) Local .env templates

- `server/.env.example` already includes:
  - `PORT`
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CORS_ORIGINS`
  - `GROQ_API_KEY`
- `client/.env.example` includes:
  - `VITE_API_URL`
