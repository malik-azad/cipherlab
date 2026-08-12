(() => {
"use strict";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const enc = new TextEncoder();
const dec = new TextDecoder();

const state = { route: "home", inspect: "jwt", commandIndex: 0 };

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 1700);
}

async function copyText(value) {
  if (!value) return toast("Nothing to copy");
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const t = document.createElement("textarea");
    t.value = value;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  toast("Copied");
}

function utf8ToBase64(value) {
  let binary = "";
  for (const b of enc.encode(value)) binary += String.fromCharCode(b);
  return btoa(binary);
}
function base64ToUtf8(value) {
  const clean = value.replace(/\s/g, "");
  const binary = atob(clean);
  return dec.decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}
function hexEncode(value) {
  return [...enc.encode(value)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function hexDecode(value) {
  const clean = value.replace(/\s+/g, "");
  if (clean.length % 2 || !/^[\da-f]+$/i.test(clean)) throw new Error("Invalid hexadecimal");
  return dec.decode(Uint8Array.from(clean.match(/../g) || [], x => parseInt(x, 16)));
}
function binaryEncode(value) {
  return [...enc.encode(value)].map(b => b.toString(2).padStart(8, "0")).join(" ");
}
function binaryDecode(value) {
  const parts = value.trim().split(/\s+/);
  if (!parts.length || parts.some(x => !/^[01]{8}$/.test(x))) throw new Error("Expected 8-bit binary groups");
  return dec.decode(Uint8Array.from(parts, x => parseInt(x, 2)));
}
function rot13(value) {
  return value.replace(/[A-Za-z]/g, c => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}
function unicodeEncode(value) {
  return [...value].map(c => `\\u{${c.codePointAt(0).toString(16)}}`).join("");
}
function unicodeDecode(value) {
  return value.replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function htmlEncode(value) {
  const el = document.createElement("textarea");
  el.textContent = value;
  return el.innerHTML;
}
function htmlDecode(value) {
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}
function transform(type, value, mode) {
  if (type === "base64") return mode === "encode" ? utf8ToBase64(value) : base64ToUtf8(value);
  if (type === "url") return mode === "encode" ? encodeURIComponent(value) : decodeURIComponent(value);
  if (type === "html") return mode === "encode" ? htmlEncode(value) : htmlDecode(value);
  if (type === "hex") return mode === "encode" ? hexEncode(value) : hexDecode(value);
  if (type === "binary") return mode === "encode" ? binaryEncode(value) : binaryDecode(value);
  if (type === "rot13") return rot13(value);
  if (type === "unicode") return mode === "encode" ? unicodeEncode(value) : unicodeDecode(value);
  throw new Error("Unknown transform");
}
function detect(value) {
  const v = value.trim(), results = [];
  if (!v) return results;
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v)) results.push(["JWT", "three-part token structure", "jwt"]);
  if (/^https?:\/\//i.test(v)) results.push(["URL", "absolute URL", "url"]);
  if (/%[0-9a-f]{2}/i.test(v)) results.push(["URL encoded", "percent-encoded bytes", "url"]);
  if (/^(?:[\da-f]{2})+$/i.test(v) && v.length >= 4) results.push(["Hex", "even-length hexadecimal", "hex"]);
  if (/^(?:[01]{8}\s*)+$/.test(v)) results.push(["Binary", "8-bit binary groups", "binary"]);
  if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v) && v.length >= 8) {
    try { base64ToUtf8(v); results.push(["Base64", "valid Base64 structure", "base64"]); } catch {}
  }
  if (/^<[^>]+>/.test(v) || /&(?:amp|lt|gt|quot|#\d+);/i.test(v)) results.push(["HTML", "markup/entity syntax", "html"]);
  return results;
}

function route(name) {
  state.route = name;
  $$(".route").forEach(el => el.classList.toggle("active", el.id === `route-${name}`));
  $$(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.route === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$("[data-route]").forEach(el => el.addEventListener("click", () => route(el.dataset.route)));
$$("[data-tool]").forEach(el => el.addEventListener("click", () => {
  const tool = el.dataset.tool;
  if (["hash","jwt","url","json","headers"].includes(tool)) { route("inspect"); selectInspect(tool); }
  else route(tool);
}));

function selectInspect(name) {
  state.inspect = name;
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.inspect === name));
  $$(".inspect-panel").forEach(p => p.classList.toggle("active", p.id === `inspect-${name}`));
}
$$(".tab").forEach(b => b.addEventListener("click", () => selectInspect(b.dataset.inspect)));

const transformInput = $("#transformInput"), transformOutput = $("#transformOutput");
transformInput.addEventListener("input", () => { $("#transformCount").textContent = `${transformInput.value.length} chars`; });
function runTransform(mode) {
  try {
    const result = transform($("#transformType").value, transformInput.value, mode);
    transformOutput.value = result;
    $("#transformStatus").textContent = "OK";
  } catch (e) {
    transformOutput.value = `Error: ${e.message}`;
    $("#transformStatus").textContent = "INPUT ERROR";
  }
}
$("#transformEncode").addEventListener("click", () => runTransform("encode"));
$("#transformDecode").addEventListener("click", () => runTransform("decode"));
$("#transformDetect").addEventListener("click", () => {
  const result = detect(transformInput.value);
  $("#transformStatus").textContent = result.length ? result.map(x => x[0]).join(" / ") : "NO MATCH";
  toast(result.length ? `Detected ${result[0][0]}` : "No common format detected");
});
$("#copyTransform").addEventListener("click", () => copyText(transformOutput.value));
$("#swapTransform").addEventListener("click", () => {
  const old = transformInput.value; transformInput.value = transformOutput.value; transformOutput.value = old;
  $("#transformCount").textContent = `${transformInput.value.length} chars`;
});
$("#clearTransform").addEventListener("click", () => { transformInput.value = ""; transformOutput.value = ""; $("#transformStatus").textContent = "Ready"; });

function decodeJwtPart(part) {
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(base64ToUtf8(padded));
}
$("#decodeJwt").addEventListener("click", () => {
  const token = $("#jwtInput").value.trim();
  if (!token) return toast("Paste a JWT");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("JWT must contain three dot-separated parts");
    const header = decodeJwtPart(parts[0]), payload = decodeJwtPart(parts[1]);
    $("#jwtHeader").textContent = JSON.stringify(header, null, 2);
    $("#jwtPayload").textContent = JSON.stringify(payload, null, 2);
    const findings = [
      ["Algorithm", header.alg ? `Present: ${header.alg}` : "Missing", header.alg ? "good" : "warn"],
      ["Expiration", payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "Missing", payload.exp ? "good" : "warn"],
      ["Issuer", payload.iss ? "Present" : "Missing", payload.iss ? "good" : "warn"],
      ["Audience", payload.aud ? "Present" : "Missing", payload.aud ? "good" : "warn"],
      ["Clock check", payload.exp ? (Date.now()/1000 < payload.exp ? "Not expired" : "Expired") : "Not checked", payload.exp ? (Date.now()/1000 < payload.exp ? "good" : "bad") : "warn"]
    ];
    renderFindings($("#jwtFindings"), findings);
    const msg = document.createElement("div"); msg.className = "message";
    msg.textContent = "Decoded locally. This parses the token only; it does not verify the signature or trust the claims.";
    $("#jwtMessage").replaceChildren(msg);
    toast("JWT decoded");
  } catch (e) {
    const msg = document.createElement("div"); msg.className = "message error"; msg.textContent = `Invalid JWT: ${e.message}`;
    $("#jwtMessage").replaceChildren(msg);
    $("#jwtHeader").textContent = "—"; $("#jwtPayload").textContent = "—"; $("#jwtFindings").replaceChildren();
  }
});
$("#clearJwt").addEventListener("click", () => { $("#jwtInput").value = ""; $("#jwtHeader").textContent = "—"; $("#jwtPayload").textContent = "—"; $("#jwtFindings").replaceChildren(); $("#jwtMessage").replaceChildren(); });

function renderFindings(target, rows) {
  target.replaceChildren(...rows.map(([title, value, cls]) => {
    const article = document.createElement("article"); article.className = "finding";
    const label = document.createElement("span"); label.textContent = title;
    const p = document.createElement("p"); p.className = cls; p.textContent = value;
    article.append(label, p); return article;
  }));
}

$("#hashInput").addEventListener("input", () => {
  $("#hashCount").textContent = `${$("#hashInput").value.length} chars`;
});
$("#generateHashes").addEventListener("click", async () => {
  const value = $("#hashInput").value;
  if (!value) return toast("Enter text");
  const rows = [];
  for (const algorithm of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
    const digestBuffer = await crypto.subtle.digest(algorithm, enc.encode(value));
    const digestHex = [...new Uint8Array(digestBuffer)].map(b => b.toString(16).padStart(2, "0")).join("");
    rows.push([algorithm, digestHex, algorithm === "SHA-1" ? "warn" : "good"]);
  }
  renderFindings($("#hashFindings"), rows);
  toast("Hashes generated");
});
$("#clearHash").addEventListener("click", () => {
  $("#hashInput").value = "";
  $("#hashCount").textContent = "0 chars";
  $("#hashFindings").replaceChildren();
});

$("#parseUrl").addEventListener("click", () => {
  const raw = $("#urlInput").value.trim(); if (!raw) return toast("Enter a URL");
  try {
    const u = new URL(raw), params = [...u.searchParams.entries()];
    renderFindings($("#urlFindings"), [
      ["Protocol", u.protocol, "good"], ["Hostname", u.hostname, "good"], ["Port", u.port || "default", "good"],
      ["Path", u.pathname || "/", "good"], ["Query", u.search || "none", "good"], ["Fragment", u.hash || "none", "good"],
      ["Parameters", params.length ? `${params.length} found` : "none", params.length ? "warn" : "good"]
    ]);
    toast("URL parsed");
  } catch { renderFindings($("#urlFindings"), [["URL", "Invalid URL syntax", "bad"]]); }
});
$("#encodeUrl").addEventListener("click", () => { try { $("#urlInput").value = encodeURI($("#urlInput").value); toast("Encoded"); } catch { toast("Could not encode"); }});
$("#decodeUrl").addEventListener("click", () => { try { $("#urlInput").value = decodeURI($("#urlInput").value); toast("Decoded"); } catch { toast("Could not decode"); }});

function jsonAction(mode) {
  try {
    const obj = JSON.parse($("#jsonInput").value);
    $("#jsonOutput").value = mode === "min" ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
    toast("Valid JSON");
  } catch (e) { $("#jsonOutput").value = `Invalid JSON\n\n${e.message}`; toast("Invalid JSON"); }
}
$("#formatJson").addEventListener("click", () => jsonAction("pretty"));
$("#minifyJson").addEventListener("click", () => jsonAction("min"));
$("#validateJson").addEventListener("click", () => { try { JSON.parse($("#jsonInput").value); $("#jsonOutput").value = "✓ Valid JSON"; toast("Valid JSON"); } catch (e) { $("#jsonOutput").value = `✕ Invalid JSON\n\n${e.message}`; toast("Invalid JSON"); }});

const headerRules = [
  ["Content-Security-Policy", "Controls browser content execution and resource loading."],
  ["Strict-Transport-Security", "Requests HTTPS persistence for supporting browsers."],
  ["X-Content-Type-Options", "Prevents MIME sniffing when set to nosniff."],
  ["Referrer-Policy", "Limits URL referrer information."],
  ["Permissions-Policy", "Restricts access to selected browser capabilities."],
  ["Cross-Origin-Opener-Policy", "Controls browsing-context isolation."]
];
$("#checkHeaders").addEventListener("click", () => {
  const raw = $("#headersInput").value.toLowerCase();
  renderFindings($("#headerFindings"), headerRules.map(([name]) => {
    const present = raw.split(/\r?\n/).some(line => line.trim().startsWith(name.toLowerCase() + ":"));
    return [name, present ? "Present — review its value manually." : "Not found — consider whether this control is appropriate.", present ? "good" : "warn"];
  }));
  toast("Checklist complete");
});
$("#clearHeaders").addEventListener("click", () => { $("#headersInput").value = ""; $("#headerFindings").replaceChildren(); });

function randomBytes(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
function hex(a) { return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); }
function b64url(a) { let s = ""; for (const b of a) s += String.fromCharCode(b); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function securePassword(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=?";
  const bytes = randomBytes(length), out = [];
  for (let i=0;i<length;i++) out.push(chars[bytes[i] % chars.length]);
  return out.join("");
}
$("#generatePassword").addEventListener("click", () => {
  const length = Math.min(128, Math.max(8, Number($("#pwLength").value) || 24));
  $("#passwordOutput").value = securePassword(length); toast("Password generated");
});
$("#generateToken").addEventListener("click", () => {
  const bytes = Math.min(128, Math.max(8, Number($("#tokenBytes").value) || 32));
  const value = randomBytes(bytes); $("#tokenOutput").value = $("#tokenFormat").value === "hex" ? hex(value) : b64url(value); toast("Token generated");
});
$("#generateUuid").addEventListener("click", () => { $("#uuidOutput").value = crypto.randomUUID(); toast("UUID generated"); });
function refreshTime() {
  const d = new Date();
  $("#timeOutput").value = `seconds  ${Math.floor(d.getTime()/1000)}\nmillis   ${d.getTime()}\nlocal    ${d.toLocaleString()}\nutc      ${d.toUTCString()}`;
}
$("#refreshTime").addEventListener("click", refreshTime);
$$("[data-copy]").forEach(button => button.addEventListener("click", () => copyText($("#" + button.dataset.copy).value)));

const commands = [
  ["Transform Lab", "transform"], ["Hash Lab", "hash"], ["JWT Inspector", "jwt"],
  ["URL Inspector", "url"], ["JSON Lab", "json"], ["Header Checklist", "headers"], ["Helpers", "helpers"]
];
function renderCommands() {
  const q = $("#commandSearch").value.toLowerCase().trim();
  const filtered = commands.filter(([name]) => name.toLowerCase().includes(q));
  state.commandIndex = Math.min(state.commandIndex, Math.max(0, filtered.length - 1));
  $("#commandList").replaceChildren(...filtered.map(([name, key], i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "command-item" + (i === state.commandIndex ? " selected" : "");
    const title = document.createElement("span"); title.textContent = name;
    const code = document.createElement("small"); code.textContent = key;
    b.append(title, code);
    b.addEventListener("click", () => {
      $("#commandModal").hidden = true;
      if (key === "hash" || ["jwt","url","json","headers"].includes(key)) { route("inspect"); selectInspect(key); }
      else route(key);
    });
    return b;
  }));
}
function openCommands() {
  $("#commandModal").hidden = false; $("#commandSearch").value = ""; state.commandIndex = 0;
  renderCommands(); setTimeout(() => $("#commandSearch").focus(), 0);
}
$("#commandButton").addEventListener("click", openCommands);
$("#closeCommand").addEventListener("click", () => $("#commandModal").hidden = true);
$("#commandModal").addEventListener("click", e => { if (e.target === $("#commandModal")) $("#commandModal").hidden = true; });
$("#commandSearch").addEventListener("input", () => { state.commandIndex = 0; renderCommands(); });
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCommands(); }
  if (e.key === "Escape") $("#commandModal").hidden = true;
  if (!$("#commandModal").hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    const count = $$(".command-item").length;
    if (!count) return;
    state.commandIndex = (state.commandIndex + (e.key === "ArrowDown" ? 1 : -1) + count) % count;
    renderCommands();
  }
  if (!$("#commandModal").hidden && e.key === "Enter") {
    const item = $(".command-item.selected"); if (item) item.click();
  }
});

refreshTime();
})();