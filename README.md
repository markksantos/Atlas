<div align="center">

# 🧠 Atlas

**A multi-model AI orchestrator with chat, code generation, and model comparison**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Anthropic](https://img.shields.io/badge/Anthropic-Claude-D4A574?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![Google](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

[Features](#-features) · [Getting Started](#-getting-started) · [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

- **Multi-Model Chat** — Send prompts to multiple AI models simultaneously and compare responses
- **Model Support** — OpenAI (GPT-5, GPT-4.1, o1, o3, o4-mini), Anthropic (Claude), Google (Gemini), and more
- **Multi-Round Orchestration** — Generate, debate, critique, and revise across configurable rounds
- **Code Generation** — Describe a project spec and generate complete file structures as downloadable ZIP
- **Run History** — SQLite-backed history of all chat runs with search
- **Configurable Parameters** — Temperature, max tokens, timeout, cost caps, and model selection
- **Dark Mode** — Full theme support with system preference detection
- **API Key Management** — Securely store and manage keys for multiple providers

## 🖼️ Screenshots

> _Screenshots coming soon_

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- API keys for at least one provider (OpenAI, Anthropic, or Google)

### Installation
```bash
git clone https://github.com/markksantos/Atlas.git
cd Atlas
npm install
```

### Configuration
Create a `.env` file or use the in-app key management:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

### Run
```bash
npm run dev
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19, TypeScript, Lucide Icons |
| Styling | Tailwind CSS 4 |
| Backend | Express 5, Node.js |
| Database | Better-SQLite3 |
| AI | OpenAI SDK, Anthropic SDK, Google Generative AI |
| Validation | Zod |
| Build | Vite 7, Concurrently |

## 📁 Project Structure
```
Atlas/
├── client/
│   └── src/
│       ├── App.tsx              # Main UI
│       └── atlas-single-file.tsx # Full app interface
├── server/
│   ├── index.ts         # Express server
│   ├── routes.ts        # API routes (runs, codegen)
│   └── lib/
│       ├── orchestrator.ts  # Multi-model chat orchestration
│       ├── providers.ts     # AI provider integrations
│       ├── codegen.ts       # Project code generation
│       ├── db.ts            # SQLite database
│       ├── keys.ts          # API key management
│       └── attachments.ts   # ZIP file handling
└── package.json
```

## 📄 License

MIT License © 2025 Mark Santos
