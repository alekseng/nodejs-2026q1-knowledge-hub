# Knowledge Hub

## RAG — Retrieval-Augmented Generation

The API includes a full RAG layer (`/ai/rag/*`) that lets you index Knowledge Hub articles into a vector database and answer natural-language questions grounded in that content.

### Gemini models used

| Purpose | Model | Env variable |
|---------|-------|-------------|
| Answer generation | `gemini-2.5-flash` | `GEMINI_MODEL` |
| Text embeddings | `gemini-embedding-2` | `GEMINI_EMBEDDING_MODEL` |

### Vector database

**Qdrant** — a high-performance, open-source vector database. Runs in a dedicated Docker container alongside the app and PostgreSQL.

- HTTP API port: `6333`
- gRPC port: `6334`
- Data is persisted in the `qdrant_data` Docker volume

### How to obtain a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API key"** in the left sidebar
4. Click **"Create API key"** → select or create a Google Cloud project
5. Copy the generated key — you will paste it into `.env` as `GEMINI_API_KEY`

### Full startup flow

**1. Clone and configure environment**
```bash
git clone <repository-url>
cd nodejs-2026q1-knowledge-hub
cp .env.example .env
```

Open `.env` and set your Gemini API key:
```env
GEMINI_API_KEY=your-gemini-api-key-from-aistudio
```

All other RAG variables have sensible defaults and work out of the box:
```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
RAG_VECTOR_DB_URL=http://vectordb:6333
RAG_VECTOR_COLLECTION=knowledge_hub_articles
RAG_VECTOR_SIZE=3072
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
RAG_CONVERSATION_MAX_MESSAGES=20
```

**2. Start all services with Docker Compose**
```bash
docker-compose up --build
```

This starts three services: `db` (PostgreSQL), `vectordb` (Qdrant), and `app` (NestJS). The app waits for both databases to be healthy before starting. Migrations and seed data are applied automatically.

**3. Get a JWT token**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "editor", "password": "editor123"}'
```

Copy the `accessToken` from the response.

**4. Build the vector index**
```bash
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"onlyPublished": true}'
```

Response:
```json
{
  "indexedArticles": 5,
  "indexedChunks": 23,
  "vectorCollection": "knowledge_hub_articles"
}
```

Subsequent calls only re-embed articles whose content has changed (incremental indexing).

**5. Semantic search**
```bash
curl -X POST http://localhost:4000/ai/rag/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "how to handle authentication", "limit": 3}'
```

Optional filters: `articleStatus`, `categoryId`, `tags`.

**6. RAG chat**
```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "What does the knowledge hub say about REST API design?"}'
```

Response includes `answer`, `sources` (articles used), and a `conversationId` for follow-up questions.

**7. Follow-up question in the same conversation**
```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Can you give a concrete example?", "conversationId": "<id-from-previous-response>"}'
```

**8. Remove an article from the index**
```bash
curl -X DELETE http://localhost:4000/ai/rag/index/articles/<articleId> \
  -H "Authorization: Bearer <token>"
```

Returns `204 No Content` on success, `404` if the article or its index entries are not found.

### RAG endpoints summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/rag/index` | Build or refresh the vector index from articles |
| POST | `/ai/rag/search` | Semantic + keyword search with metadata filters |
| POST | `/ai/rag/chat` | RAG chat with answer generation and source attribution |
| DELETE | `/ai/rag/index/articles/:id` | Remove article vectors from index |
| GET | `/ai/rag/chat/:conversationId/history` | Inspect conversation history |

### Known RAG limitations

- **Free-tier embedding quota**: `gemini-embedding-2` shares the Gemini free-tier quota (~1 500 requests/day). Indexing many large articles may exhaust this; consider running the index build during off-peak hours.
- **Indexing latency**: Each article chunk requires one embedding API call. A corpus of 50 articles with average chunk count of 5 takes ~90 seconds to index on the free tier (rate limiting included).
- **Regional availability**: Google AI Studio free tier may not be available in all regions. A VPN or Google Cloud project with billing may be required in some countries.
- **In-memory conversation history**: Conversation sessions are stored in process memory and are lost on restart. Use an external store (Redis) for production deployments.
- **Qdrant persistence**: Vector data is persisted in the `qdrant_data` Docker volume. Deleting the volume clears the index and requires a full re-index.
- **Embedding model dimensions**: `gemini-embedding-2` produces 768-dimensional vectors. Changing the embedding model requires dropping and recreating the Qdrant collection.

---

## AI Integration (Google Gemini)

The API includes AI-powered endpoints for article summarization, translation, and content analysis, powered by the **Google Gemini 2.5 Flash** model.

### How to obtain a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API key"** in the left sidebar
4. Click **"Create API key"** → select or create a Google Cloud project
5. Copy the generated key — you will paste it into `.env` as `GEMINI_API_KEY`

> Free tier provides generous quotas (60 requests/minute, 1 500 requests/day as of 2026). No billing required.

### Gemini model

`gemini-2.5-flash` — fast, cost-efficient model with strong multilingual capabilities. Configurable via `GEMINI_MODEL` env variable.

### Setup after cloning

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the required variables:
   ```env
   # Paste your key from Google AI Studio
   GEMINI_API_KEY=your-gemini-api-key

   # These defaults work out of the box
   GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
   GEMINI_MODEL=gemini-2.5-flash
   AI_RATE_LIMIT_RPM=20
   AI_CACHE_TTL_SEC=300
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the database and seed it with sample data:
   ```bash
   docker-compose up -d db
   npx prisma migrate deploy
   npx prisma db seed
   ```
   This creates seed users (`admin` / `admin123`, `editor` / `editor123`) and sample articles.
5. Start the app:
   ```bash
   npm start
   ```
6. Test the AI endpoints — get a JWT token first:
   ```bash
   curl -X POST http://localhost:4000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login": "editor", "password": "editor123"}'
   ```
7. Use the token to call AI endpoints:
   ```bash
   # Summarize an article
   curl -X POST http://localhost:4000/ai/articles/<articleId>/summarize \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"maxLength": "short"}'

   # Translate an article
   curl -X POST http://localhost:4000/ai/articles/<articleId>/translate \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"targetLanguage": "Spanish"}'

   # Analyze an article
   curl -X POST http://localhost:4000/ai/articles/<articleId>/analyze \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"task": "review"}'

   # View usage statistics
   curl http://localhost:4000/ai/usage \
     -H "Authorization: Bearer <token>"
   ```

### AI endpoints summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/articles/:id/summarize` | Summarize article (`short` / `medium` / `detailed`) |
| POST | `/ai/articles/:id/translate` | Translate article to a target language |
| POST | `/ai/articles/:id/analyze` | Analyze article (`review` / `bugs` / `optimize` / `explain`) |
| POST | `/ai/generate` | Free-form generation (optional) |
| GET  | `/ai/usage` | In-memory usage statistics since startup |

### Known limitations

- **Free tier quotas**: Gemini free tier allows ~15 requests/minute and 1 500 requests/day per API key. `AI_RATE_LIMIT_RPM` (default 20) is intentionally set close to this — lower it if you hit upstream 429 errors.
- **Regional availability**: Google AI Studio free tier may not be available in all regions. A VPN or Google Cloud project with billing may be required in some countries.
- **Response latency**: Cold Gemini API calls typically take 2–8 seconds depending on content length.
- **JSON parsing**: Translate and analyze endpoints instruct the model to return JSON. Occasionally the model may deviate; the API handles this gracefully by falling back to the raw text response.
- **In-memory state**: Rate limit counters, response cache, and usage statistics are stored in process memory and reset on restart. Use an external store (Redis) for multi-instance deployments.

## Docker

### Docker Image
[Knowledge Hub API on Docker Hub](https://hub.docker.com/repository/docker/a1eks4e/nodejs-2026q1-knowledge-hub-app)

### Running with Docker Compose
1. Create a `.env` file from `.env.example`.
2. Run the application:
   ```bash
   docker-compose up --build
   ```
3. To include Adminer (database management tool) available at http://localhost:8080:
   ```bash
   docker-compose --profile debug up
   ```
The API will be available at `http://localhost:4000`.

### Security Scan Results
Scan performed using `docker scout`.
- **Critical vulnerabilities**: 0
- **High vulnerabilities**: 0
- **Status**: Clean

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

## Downloading

```
git clone {repository URL}
```

## Installing NPM modules

```
npm install
```

## Running application

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Testing

After application running open new terminal and enter:

To run all tests without authorization

```
npm run test
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

To run all test with authorization

```
npm run test:auth
```

To run only specific test suite with authorization

```
npm run test:auth -- <path to suite>
```

To run refresh token tests

```
npm run test:refresh
```

To run RBAC (role-based access control) tests

```
npm run test:rbac
```

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
