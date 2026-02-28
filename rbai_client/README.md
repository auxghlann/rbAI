# rbAI Frontend

React + TypeScript + Vite frontend for the rbAI pedagogical AI assistant platform.

## Features

- **Modern Stack**: React 18, TypeScript, Vite
- **Code Editor**: Monaco Editor integration for code exercises
- **Real-time Chat**: AI-assisted learning with pedagogical constraints
- **Analytics Dashboard**: Student engagement and behavioral metrics
- **Theme Support**: Light/dark mode with custom themes

## Development

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see `../rbai_server/README.md`)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Environment Variables

Create a `.env` file for local development:

```env
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
│   ├── dashboard/  # Dashboard sub-pages
│   └── ...
├── contexts/       # React contexts (theme, etc.)
├── utils/          # Utilities (logger, etc.)
├── assets/         # Static assets
├── config.ts       # Centralized API configuration
└── App.tsx         # Main app component
```

## Build

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### Heroku with NGINX

The frontend is deployed to Heroku using the NGINX buildpack.

**Configuration**: `config/nginx.conf.erb`

The NGINX configuration provides:
- SPA routing (all routes serve `index.html`)
- Long-term caching for assets (1 year, immutable)
- No caching for HTML files
- Clean URLs (no `.html` extension)
- Gzip compression

**Buildpacks**:
1. `heroku/nodejs` - Builds the Vite app
2. `heroku-community/nginx` - Serves the built files

See [../docs/deployment/README.deploy_heroku.md](../docs/deployment/README.deploy_heroku.md) for detailed deployment instructions.

## Code Standards

See [../.github/copilot-instructions.md](../.github/copilot-instructions.md) for:
- TypeScript conventions
- Component patterns
- Security requirements
- Error handling
- Logging standards

## Linting and Type Checking

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technology Details

## Technology Details

### Vite + React

This project uses [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) with Babel for Fast Refresh.

### Monaco Editor

Code editor integration for coding exercises with syntax highlighting, IntelliSense, and multi-language support.

### Security

- **No console.log in production**: Uses secure logger utility
- **Sanitized errors**: Never exposes sensitive data
- **CORS**: Properly configured for API communication
- **Environment variables**: Sensitive config via environment

## Contributing

Follow the code conventions in [../.github/copilot-instructions.md](../.github/copilot-instructions.md):
- Use camelCase for functions, PascalCase for components
- Type all props and state
- Handle errors gracefully
- Use the logger utility (never console.log)
- Document complex logic with comments

---

**Need Help?** See the main project README at [../README.md](../README.md)

