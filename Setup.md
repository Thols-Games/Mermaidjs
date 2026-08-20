# Project Setup Guide

This guide covers everything required to install dependencies, run the development server, vendor client modules, and execute the automated test suite.

---

## 1. Prerequisites

Make sure you have the following installed on your system:

- **[Node.js](https://nodejs.org/)** (v18.x or v20.x+ recommended)
- **npm** (comes bundled with Node.js)
- **Git**

Verify your installation:
```bash
node -v
npm -v
```

---

## 2. Installation & Node Modules

### Step 1: Clone the Repository
Clone the repository to your local machine (if not already done):
```bash
git clone <repository-url>
cd Thols-Games
```

---

### Step 2: Install Node Modules

#### Option A: Quick Install (Recommended)
If you already have `package.json` in your workspace, install all dependencies with:

```bash
npm install
```

*(or for a clean, reproducible CI install)*
```bash
npm ci
```

---

#### Option B: Explicit / Manual Module Installation
If you are initializing the project from scratch or installing the modules manually:

#### 1. Core Runtime & Vendoring Dependencies:
```bash
npm install @codemirror/autocomplete @codemirror/commands @codemirror/language @codemirror/lint @codemirror/search @codemirror/state @codemirror/view @lezer/highlight @codemirror/lang-javascript @codemirror/lang-html @codemirror/lang-css @codemirror/lang-json @codemirror/lang-markdown @codemirror/lang-python @codemirror/lang-xml acorn magic-string puppeteer
```

#### 2. Development & Testing Dependencies:
```bash
npm install --save-dev @playwright/test @types/node
```

#### 3. Install Playwright Browsers:
```bash
npx playwright install --with-deps chromium
```

---

### Required Packages Overview

| Package Category | Modules | Purpose |
| :--- | :--- | :--- |
| **CodeMirror 6 Core** | `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/search` | Core editor engine, keybindings, syntax state, and search/replace. |
| **Editor Extensions** | `@codemirror/autocomplete`, `@codemirror/lint`, `@lezer/highlight` | Autocompletion popups, error squiggles/diagnostics, syntax highlighting. |
| **Language Packs** | `@codemirror/lang-javascript`, `@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-json`, `@codemirror/lang-markdown`, `@codemirror/lang-python`, `@codemirror/lang-xml` | Syntax support for embedded scripts, styles, and data blocks. |
| **Utilities & Bundling** | `acorn`, `magic-string`, `puppeteer` | JS AST parsing, string manipulation, and headless browser tooling. |
| **Testing Suite** | `@playwright/test`, `@types/node` | Automated end-to-end browser testing and TypeScript types. |

---

## 3. Running the Local Development Server

Start the built-in local static server:

```bash
npm start
```

- Opens the application server at: **[http://localhost:5505](http://localhost:5505)**
- Press `Ctrl + C` in your terminal to stop the server.

> **Tip:** To run on a different port:
> ```bash
> node serve.mjs 8080
> ```

---

## 4. Module Vendoring (CodeMirror & Lezer)

The application uses native ES modules vendored under the `vendor/` directory. If you install or update CodeMirror packages in `package.json`, re-generate the client bundle with:

```bash
npm run vendor
```

---

## 5. Testing & Validation

### Syntax & Module Check
Validate that all JavaScript source files are free of syntax errors:
```bash
npm run check
```

### Automated End-to-End Tests
Run the Playwright test suite (automatically starts the local server on port `5505`):
```bash
npm test
```

### Interactive Test Tools
- **UI Mode (Interactive debugger & visual runner):**
  ```bash
  npx playwright test --ui
  ```
- **Headed Mode (Watch tests run in browser):**
  ```bash
  npx playwright test --headed
  ```
- **Run Specific Test Suites:**
  ```bash
  npm run test:cm        # CodeMirror editor tests
  npm run test:autofix   # Auto-fix tests
  npm run test:sync      # Selection synchronization tests
  ```
- **View HTML Test Report:**
  ```bash
  npx playwright show-report
  ```

---

## 6. Project Structure Overview

```
├── css/                  # Application styles & themes
├── js/                   # Core application scripts & validators
│   ├── app.js            # Main application bootstrap
│   ├── cm-editor.js      # CodeMirror editor integration
│   ├── renderer.js       # Mermaid rendering engine
│   └── validators/       # Syntax & linting rules
├── vendor/               # Bundled third-party libraries (CodeMirror, etc.)
├── mermaid-11.16.0/      # Vendored Mermaid.js runtime
├── tests/                # Playwright test specs
├── scripts/              # Build and vendoring scripts
├── serve.mjs             # Zero-dependency local dev server
├── index.html            # Main entry point
└── playwright.config.js  # Test suite configuration
```
