# AGENTS.md - AI Agent Guide for ODM-CMMS

> This file is intended for AI coding agents working on the ODM-CMMS project.
> Last updated: 2026-03-16

---

## Project Overview

**ODM-CMMS** (Operator-Driven Maintenance Computerized Maintenance Management System) is a Node.js-based HTTP API server designed for managing maintenance operations and data.

The project uses Node.js built-in modules exclusively (no external dependencies currently) and targets Node.js version 18.0.0 or higher to leverage modern features like the built-in test runner and watch mode.

### Key Characteristics

- **Language**: JavaScript (Node.js)
- **Runtime**: Node.js >= 18.0.0
- **Architecture**: HTTP server using Node.js `http` module
- **Testing**: Node.js built-in test runner (`node:test`)
- **Dependencies**: Currently none (pure Node.js)

---

## Project Structure

```
ODM-CMMS/
├── config/             # Configuration files (empty, for future use)
├── docs/               # Documentation (empty, for future use)
├── src/                # Source code
│   ├── app.js          # HTTP server setup and request handling
│   └── index.js        # Application entry point
├── tests/              # Test files
│   └── app.test.js     # Application test suite
├── .gitignore          # Git ignore patterns
├── AGENTS.md           # This file
├── package.json        # Project configuration and scripts
└── README.md           # Human-readable project documentation
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Entry point. Creates server, handles startup/shutdown signals |
| `src/app.js` | Core application logic. Contains `createServer()` and request handlers |
| `tests/app.test.js` | Test suite using Node.js built-in test runner |
| `package.json` | Project metadata, scripts, and configuration |

---

## Build and Run Commands

### Prerequisites

- Node.js >= 18.0.0 must be installed
- npm is optional (no external dependencies currently)

### Available Scripts

All scripts are defined in `package.json` and can be run via `npm run <script>` or directly with node:

```bash
# Start the server (production)
npm start
# Equivalent to: node src/index.js

# Development mode with auto-reload (Node.js >= 18.11.0)
npm run dev
# Equivalent to: node --watch src/index.js

# Run tests
npm test
# Equivalent to: node --test

# Run tests in watch mode
npm run test:watch
# Equivalent to: node --test --watch
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `localhost` | HTTP server host interface |
| `NODE_ENV` | `development` | Environment mode (development/production) |

Example:
```bash
PORT=8080 HOST=0.0.0.0 node src/index.js
```

---

## API Endpoints

Current implemented endpoints:

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/` | `src/app.js` | Returns API metadata (name, version) |
| GET | `/health` | `src/app.js` | Health check endpoint for monitoring |
| * | `/*` | `src/app.js` | 404 handler for unknown routes |

### Response Format

All responses are JSON with `Content-Type: application/json`.

---

## Code Style Guidelines

### General Style

- Use **single quotes** for strings
- Use **2 spaces** for indentation
- Use **semicolons** at end of statements
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes (when added)
- Use **UPPER_SNAKE_CASE** for constants

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `createServer`, `requestHandler` |
| Constants | UPPER_SNAKE_CASE | `PORT`, `DEFAULT_TIMEOUT` |
| Files | kebab-case | `app.test.js`, `user-service.js` |

### Documentation Style

- Use JSDoc comments for functions
- Include `@param` and `@returns` tags
- Add a brief description at the top of each file

Example:
```javascript
/**
 * Creates and returns an HTTP server instance
 * @param {number} port - Port number to listen on
 * @returns {http.Server}
 */
function createServer(port) {
  // implementation
}
```

### Error Handling

- Use try-catch for async operations
- Return proper HTTP status codes
- Include descriptive error messages in JSON responses

---

## Testing Instructions

### Test Framework

Uses Node.js built-in test runner (`node:test`) and assertion library (`node:assert`). No external testing dependencies.

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run specific test file
node --test tests/app.test.js
```

### Writing Tests

Test files should:
- Be placed in the `tests/` directory
- Follow the naming pattern `*.test.js`
- Use `describe` for grouping and `it` for test cases
- Use the `before` hook for setup (e.g., starting test server)

Example test structure:
```javascript
const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('Feature Name', () => {
  before(async () => {
    // Setup code
  });

  it('should do something', async () => {
    // Test code
    assert.strictEqual(actual, expected);
  });
});
```

### Current Test Coverage

- `GET /` - Returns API information
- `GET /health` - Returns health status
- `GET /unknown-route` - Returns 404 for unknown routes

---

## Adding Dependencies

Currently the project has no external dependencies. To add one:

1. Edit `package.json` and add to `dependencies` or `devDependencies`
2. If npm is available, run `npm install`
3. If npm is not available, you may need to manually download and place packages in `node_modules/`

Common dependencies that might be added:
- `express` - Web framework (would simplify routing)
- `dotenv` - Environment variable loading
- `eslint` - Code linting
- `prettier` - Code formatting

---

## Security Considerations

### Current Security Measures

- Uses Node.js built-in `http` module (minimal attack surface)
- No external dependencies (no supply chain risks from dependencies)
- Graceful shutdown handling for SIGTERM/SIGINT signals

### Security Best Practices to Follow

1. **Input Validation**: Always validate and sanitize user inputs
2. **Error Messages**: Don't expose internal error details to clients
3. **Environment Variables**: Never commit `.env` files or secrets
4. **Dependencies**: If adding dependencies, check for known vulnerabilities
5. **CORS**: Configure CORS properly if this API is consumed by browsers
6. **Rate Limiting**: Implement rate limiting for public endpoints

---

## Development Workflow

1. Make changes to source files in `src/`
2. Add or update tests in `tests/`
3. Run tests with `npm test` to verify
4. Test manually with `npm run dev` if needed
5. Update this AGENTS.md if architectural changes are made

---

## Known Limitations

- Currently only supports basic HTTP (no HTTPS)
- No database integration yet
- No authentication/authorization
- No request logging
- No request body parsing (only handles GET requests currently)

---

## Notes for AI Agents

- The project intentionally uses only Node.js built-in modules to minimize dependencies
- When adding features, prefer built-in modules over external packages when practical
- The server uses the native `http` module, not Express or similar frameworks
- Tests use the native `node:test` module, not Jest or Mocha
- Keep the codebase simple and dependency-free unless there's a compelling reason
