# CipherLab

**Local-first web security utility workbench** for authorized security testing, bug-bounty research, labs, and development.

## v2 design

CipherLab intentionally avoids the usual "neon hacker dashboard" aesthetic. The interface is restrained, keyboard-friendly, dense enough to sit beside Burp, and built from plain HTML/CSS/JavaScript.

### Included

- Transform Lab: Base64, URL, HTML, Hex, Binary, ROT13, Unicode
- Auto-detection for common representations
- Hash Lab (SHA-1/256/384/512) via Web Crypto
- JWT Inspector with claim checks
- URL Inspector
- JSON formatter/minifier/validator
- HTTP response header checklist
- Secure random password/token/UUID helpers
- Unix timestamp helper
- Responsive layout
- Command palette (`Ctrl/Cmd + K`)
- Accessibility basics: skip link, labels, focus states, live toast status
- SEO metadata + WebApplication structured data
- No framework, CDN, npm package, analytics, API or backend

## Security model

The application is designed to minimize attack surface:

- No `eval`, `new Function`, dynamic script loading, or third-party JavaScript.
- No remote JavaScript/CSS/fonts.
- Core output rendering uses DOM APIs rather than inserting user-controlled HTML.
- User input is not persisted by default.
- Generated secrets use `crypto.getRandomValues()`.
- Hashing uses the browser Web Crypto API.
- JWT decoding never treats claims as trusted and explicitly does not verify signatures.
- No network requests are made by the application.
- A static site cannot honestly be "secure against every OWASP Top 10 risk"; server-side categories such as authentication, access control, database injection, supply-chain processing, and server logging do not exist in this architecture. The relevant browser-side attack surface is minimized instead.

## Production deployment

GitHub Pages can publish static HTML/CSS/JavaScript directly from a repository.

1. Create a GitHub repository, e.g. `cipherlab`.
2. Upload the entire directory structure:
   - `index.html`
   - `css/style.css`
   - `js/app.js`
3. Repository → **Settings** → **Pages**.
4. Source: **Deploy from a branch**.
5. Branch: `main`; folder: `/ (root)`.
6. Save and wait for the Pages deployment.

Expected project URL:

`https://YOUR-USERNAME.github.io/cipherlab/`

## Local testing

No server is required for the static UI. Open `index.html` directly in a current Chromium/Firefox browser.

For a local HTTP server, if Python is already installed:

`python -m http.server 8000`

then open `http://localhost:8000`.

## Important

Use CipherLab only against systems and data you are authorized to test.

Do not paste production credentials, private keys, active session tokens, or other sensitive secrets into a public website. Even though CipherLab's application code does not transmit inputs, a public hosting platform has its own visitor/logging infrastructure.

## Future AI mode

AI should be added as an explicitly separate feature. Local-only mode should remain available. Any AI provider integration would send the selected user content to that provider and therefore changes the privacy model.
