# CipherLab Security Notes

## Threat model

CipherLab is a static client-side utility. It has no application server, user accounts, database, API, or third-party runtime dependencies.

### Controls

- Avoids `eval()` and `new Function()`.
- Avoids rendering untrusted input through `innerHTML` for tool results.
- Uses text/value DOM properties for user-controlled content.
- Uses browser Web Crypto for digest/randomness operations.
- Does not store user input automatically.
- Does not make fetch/XHR requests.
- Uses a strict, dependency-free asset tree.
- Uses accessible focus states and labels to reduce accidental misuse.
- Keeps JWT claims explicitly untrusted.

### OWASP Top 10:2025 relevance

OWASP's 2025 categories are A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging and Alerting Failures, and A10 Mishandling of Exceptional Conditions.

CipherLab's static architecture removes entire classes of server-side risk, but does not magically make a static website immune to all web threats. GitHub Pages, the browser, DNS, TLS, and the user's device remain part of the real deployment environment.

For this project:
- A01/A07: no application accounts or authorization system.
- A02: minimize third-party resources and keep the asset tree simple.
- A03: no runtime packages/CDNs; review changes before deployment.
- A04: use Web Crypto; do not represent encoding as encryption.
- A05: avoid dangerous DOM sinks; treat user data as data.
- A06: explicit local-first privacy boundary and safe failure states.
- A08: keep source controlled and deploy reviewed commits.
- A09: no application telemetry; do not claim that absence of logs is universal.
- A10: catch parser/decoder failures and display bounded errors.
