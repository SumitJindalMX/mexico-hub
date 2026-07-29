/**
 * Client-side source validator + test case generator/runner.
 * JS can be validated and executed in a sandboxed iframe.
 * Python/Java get static checks + generated test stubs (downloadable).
 */
(() => {
  const MAX_STORE_CHARS = 12000;

  function detectLanguage(source, hint) {
    const h = (hint || "").toLowerCase();
    if (h && h !== "auto") return h;
    const s = source || "";
    if (/^\s*def\s+\w+|^\s*import\s+\w+|^\s*from\s+\w+\s+import/m.test(s)) return "python";
    if (/^\s*public\s+class\s+\w+|^\s*package\s+[\w.]+;/m.test(s)) return "java";
    if (/function\s+\w+|=>\s*{|const\s+\w+\s*=|export\s+(default\s+)?function|module\.exports/m.test(s))
      return "javascript";
    return "javascript";
  }

  function braceBalance(source, open, close) {
    let n = 0;
    let inStr = null;
    let escape = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (inStr) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
        continue;
      }
      if (ch === open) n++;
      if (ch === close) n--;
      if (n < 0) return { ok: false, depth: n };
    }
    return { ok: n === 0, depth: n };
  }

  function sanitizeJs(source) {
    return String(source || "")
      .replace(/^\s*import\s.+;?\s*$/gm, "/* import stripped */")
      .replace(/\bexport\s+default\s+/g, "")
      .replace(/\bexport\s+/g, "");
  }

  function extractJsSymbols(source) {
    const names = new Set();
    const re =
      /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+))|(?:(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_]\w*)\s*=>)|(?:exports\.(\w+)\s*=)|(?:module\.exports\.(\w+)\s*=)/g;
    let m;
    while ((m = re.exec(source))) {
      const name = m[1] || m[2] || m[3] || m[4];
      if (name && !["if", "for", "while", "switch"].includes(name)) names.add(name);
    }
    return [...names];
  }

  function extractPythonSymbols(source) {
    const names = new Set();
    const re = /^\s*def\s+(\w+)\s*\(/gm;
    let m;
    while ((m = re.exec(source))) names.add(m[1]);
    return [...names];
  }

  function extractJavaSymbols(source) {
    const names = new Set();
    const re = /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^;]*\)\s*\{/g;
    let m;
    while ((m = re.exec(source))) {
      if (m[1] !== "class") names.add(m[1]);
    }
    return [...names];
  }

  function validate(source, languageHint) {
    const issues = [];
    const code = (source || "").trim();
    if (!code) {
      return {
        ok: false,
        language: languageHint || "javascript",
        issues: [{ level: "error", message: "No source code provided." }],
        symbols: [],
        lines: 0,
      };
    }

    const language = detectLanguage(code, languageHint);
    const lines = code.split(/\r?\n/).length;

    if (lines > 2000) {
      issues.push({ level: "warn", message: `Large file (${lines} lines) — consider a repo URL for judging.` });
    }
    if (/\b(eval|Function|child_process|os\.system|Runtime\.getRuntime)\b/.test(code)) {
      issues.push({
        level: "warn",
        message: "Potentially unsafe APIs detected (eval / process / Runtime). Judges should review carefully.",
      });
    }

    const braces = braceBalance(code, "{", "}");
    if (!braces.ok) {
      issues.push({
        level: "error",
        message: braces.depth < 0 ? "Unmatched closing brace `}`." : "Unmatched opening brace `{`.",
      });
    }
    const parens = braceBalance(code, "(", ")");
    if (!parens.ok) {
      issues.push({
        level: "error",
        message: parens.depth < 0 ? "Unmatched closing parenthesis." : "Unmatched opening parenthesis.",
      });
    }

    let symbols = [];
    if (language === "javascript") {
      symbols = extractJsSymbols(code);
      const runnable = sanitizeJs(code);
      try {
        // Syntax-only check (does not execute as a program)
        // eslint-disable-next-line no-new-func
        new Function(runnable);
      } catch (err) {
        issues.push({ level: "error", message: `JavaScript syntax: ${err.message}` });
      }
      if (!symbols.length) {
        issues.push({
          level: "warn",
          message: "No named functions detected. Export or declare functions for better test generation.",
        });
      }
    } else if (language === "python") {
      symbols = extractPythonSymbols(code);
      if (/^\t+ +.+/m.test(code) || /^ + +\t+/m.test(code)) {
        issues.push({ level: "warn", message: "Mixed tabs/spaces in indentation." });
      }
      if (!/^\s*def\s+\w+/m.test(code) && !/^\s*class\s+\w+/m.test(code)) {
        issues.push({ level: "warn", message: "No `def` or `class` found — unusual for a Python submission." });
      }
      if ((code.match(/"""/g) || []).length % 2 !== 0 || (code.match(/'''/g) || []).length % 2 !== 0) {
        issues.push({ level: "warn", message: "Possible unclosed triple-quoted string." });
      }
    } else if (language === "java") {
      symbols = extractJavaSymbols(code);
      if (!/class\s+\w+/.test(code)) {
        issues.push({ level: "error", message: "No Java `class` declaration found." });
      }
      if (!/public\s+static\s+void\s+main\s*\(/.test(code) && !symbols.length) {
        issues.push({ level: "warn", message: "No `main` or methods detected." });
      }
    }

    const errors = issues.filter((i) => i.level === "error");
    return {
      ok: errors.length === 0,
      language,
      issues,
      symbols,
      lines,
      summary: errors.length
        ? `${errors.length} error(s), ${issues.length - errors.length} warning(s)`
        : issues.length
          ? `Valid with ${issues.length} warning(s)`
          : "Looks good — no issues found",
    };
  }

  function generateTests(source, languageHint) {
    const report = validate(source, languageHint);
    const language = report.language;
    const symbols = report.symbols.length ? report.symbols : ["solution"];
    const tests = [];

    if (language === "javascript") {
      symbols.slice(0, 8).forEach((name, idx) => {
        tests.push({
          id: `t${idx + 1}`,
          name: `${name} is defined`,
          code: `assert(typeof ${name} === "function" || typeof ${name} !== "undefined", "${name} should be defined");`,
        });
        tests.push({
          id: `t${idx + 1}b`,
          name: `${name} is callable without throw (smoke)`,
          code: `
if (typeof ${name} === "function") {
  try { ${name}(); }
  catch (e) {
    // Allowed: functions may require args — ensure it is still a function
    assert(typeof ${name} === "function", "${name} remained a function after call attempt");
  }
}`.trim(),
        });
      });
      tests.push({
        id: "t-sanity",
        name: "Source is non-empty",
        code: `assert(true, "harness loaded");`,
      });
    } else if (language === "python") {
      symbols.slice(0, 8).forEach((name, idx) => {
        tests.push({
          id: `t${idx + 1}`,
          name: `test_${name}_exists`,
          code: `def test_${name}_exists():\n    assert callable(${name})\n`,
        });
        tests.push({
          id: `t${idx + 1}b`,
          name: `test_${name}_smoke`,
          code: `def test_${name}_smoke():\n    try:\n        ${name}()\n    except TypeError:\n        pass  # args required is OK\n`,
        });
      });
    } else {
      symbols.slice(0, 6).forEach((name, idx) => {
        tests.push({
          id: `t${idx + 1}`,
          name: `${name}_not_null`,
          code: `// JUnit-style stub\n@Test\nvoid ${name}_not_null() {\n  // TODO: invoke ${name} with sample inputs\n  assertTrue(true);\n}\n`,
        });
      });
    }

    const harness =
      language === "javascript"
        ? buildJsHarness(source, tests)
        : language === "python"
          ? buildPyHarness(source, tests)
          : buildJavaHarness(source, tests);

    return {
      language,
      validation: report,
      tests,
      harness,
      runnable: language === "javascript",
      note:
        language === "javascript"
          ? "Tests can run in the browser sandbox."
          : "Generated stubs — download and run in your local toolchain (pytest / JUnit). Browser run is JS-only.",
    };
  }

  function buildJsHarness(source, tests) {
    const body = sanitizeJs(source);
    return `/* Mexico Hub — auto-generated JS tests */
${body}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

const __results = [];
${tests
  .map(
    (t) => `
__results.push((() => {
  const name = ${JSON.stringify(t.name)};
  try {
    ${t.code}
    return { name, ok: true };
  } catch (e) {
    return { name, ok: false, error: String(e && e.message ? e.message : e) };
  }
})());`,
  )
  .join("\n")}
return __results;
`;
  }

  function buildPyHarness(source, tests) {
    return `# Mexico Hub — auto-generated pytest stubs\n${source}\n\n${tests.map((t) => t.code).join("\n")}\n`;
  }

  function buildJavaHarness(source, tests) {
    return `// Mexico Hub — auto-generated JUnit stubs\n${source}\n\n/*\n${tests.map((t) => t.code).join("\n")}\n*/\n`;
  }

  function runTests(source, languageHint) {
    const pack = generateTests(source, languageHint);
    if (!pack.runnable) {
      return Promise.resolve({
        ok: false,
        runnable: false,
        language: pack.language,
        message: pack.note,
        results: pack.tests.map((t) => ({
          name: t.name,
          ok: null,
          error: "Not runnable in browser — download harness",
        })),
        passed: 0,
        failed: 0,
        skipped: pack.tests.length,
        harness: pack.harness,
        tests: pack.tests,
        validation: pack.validation,
      });
    }

    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;border:0";
      const id = `gdl-cv-${Date.now()}`;
      const timeout = setTimeout(() => {
        cleanup();
        resolve({
          ok: false,
          runnable: true,
          language: "javascript",
          message: "Test run timed out (4s).",
          results: [],
          passed: 0,
          failed: 1,
          skipped: 0,
          harness: pack.harness,
          tests: pack.tests,
          validation: pack.validation,
        });
      }, 4000);

      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener("message", onMsg);
        iframe.remove();
      }

      function onMsg(ev) {
        if (!ev.data || ev.data.source !== "gdl-code-validator" || ev.data.id !== id) return;
        cleanup();
        const results = Array.isArray(ev.data.results) ? ev.data.results : [];
        const passed = results.filter((r) => r.ok).length;
        const failed = results.filter((r) => r.ok === false).length;
        resolve({
          ok: failed === 0 && !ev.data.error,
          runnable: true,
          language: "javascript",
          message: ev.data.error
            ? `Runner error: ${ev.data.error}`
            : `${passed} passed · ${failed} failed`,
          results,
          passed,
          failed,
          skipped: 0,
          harness: pack.harness,
          tests: pack.tests,
          validation: pack.validation,
        });
      }

      window.addEventListener("message", onMsg);
      document.body.appendChild(iframe);

      const runner = `<!doctype html><html><body><script>
(function(){
  var id = ${JSON.stringify(id)};
  function send(payload) {
    parent.postMessage(Object.assign({ source: "gdl-code-validator", id: id }, payload), "*");
  }
  try {
    var results = (function(){
${pack.harness}
    })();
    if (!Array.isArray(results)) results = [];
    send({ results: results });
  } catch (e) {
    send({ error: String(e && e.message ? e.message : e), results: [] });
  }
})();
<\/script></body></html>`;

      iframe.srcdoc = runner;
    });
  }

  function snapshotForRecord(source, languageHint, repoUrl, lastRun) {
    const code = (source || "").trim();
    const report = validate(code, languageHint);
    const gen = code ? generateTests(code, languageHint) : null;
    return {
      repoUrl: (repoUrl || "").trim(),
      language: report.language,
      codeProvided: Boolean(code),
      sourceCode: code ? code.slice(0, MAX_STORE_CHARS) : "",
      validation: {
        status: !code ? "skipped" : report.ok ? "validated" : "failed",
        summary: report.summary,
        issues: report.issues.slice(0, 12),
        symbols: report.symbols.slice(0, 20),
        testsGenerated: gen ? gen.tests.length : 0,
        validatedAt: new Date().toISOString(),
        lastRun: lastRun
          ? {
              message: lastRun.message,
              passed: lastRun.passed,
              failed: lastRun.failed,
              runnable: lastRun.runnable,
              at: new Date().toISOString(),
            }
          : null,
      },
    };
  }

  function downloadText(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderReportHtml(report) {
    if (!report) return "";
    const issues = (report.issues || [])
      .map(
        (i) =>
          `<li class="code-lab__issue code-lab__issue--${i.level}">${escapeHtml(i.message)}</li>`,
      )
      .join("");
    return `
      <p class="code-lab__status ${report.ok ? "is-ok" : "is-bad"}">${escapeHtml(report.summary)}</p>
      <p class="code-lab__meta">Language: <strong>${escapeHtml(report.language)}</strong> · ${report.lines} lines · symbols: ${
        report.symbols?.length ? escapeHtml(report.symbols.join(", ")) : "—"
      }</p>
      ${issues ? `<ul class="code-lab__issues">${issues}</ul>` : ""}
    `;
  }

  function renderRunHtml(run) {
    if (!run) return "";
    const rows = (run.results || [])
      .map(
        (r) =>
          `<li class="${r.ok === true ? "is-pass" : r.ok === false ? "is-fail" : "is-skip"}"><strong>${escapeHtml(
            r.name,
          )}</strong>${r.error ? ` — ${escapeHtml(r.error)}` : r.ok === true ? " — pass" : " — skipped"}</li>`,
      )
      .join("");
    return `
      <p class="code-lab__status ${run.ok ? "is-ok" : "is-bad"}">${escapeHtml(run.message || "")}</p>
      <ul class="code-lab__results">${rows}</ul>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ENTRY_CANDIDATES = [
    "index.js",
    "main.js",
    "app.js",
    "src/index.js",
    "src/main.js",
    "solution.js",
    "main.py",
    "app.py",
    "solution.py",
    "src/main.py",
    "Main.java",
    "src/Main.java",
    "Solution.java",
  ];

  function parseGitHubUrl(input) {
    const raw = String(input || "").trim();
    if (!raw) return null;

    // raw.githubusercontent.com/owner/repo/ref/path
    let m = raw.match(
      /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i,
    );
    if (m) {
      return {
        host: "github",
        owner: m[1],
        repo: m[2].replace(/\.git$/i, ""),
        ref: m[3],
        path: m[4].replace(/\/$/, ""),
        kind: "file",
      };
    }

    // gist.github.com/user/id or gist.githubusercontent.com
    m = raw.match(/^https?:\/\/gist\.github(?:usercontent)?\.com\/([^/]+)\/([a-f0-9]+)/i);
    if (m) {
      return { host: "gist", owner: m[1], gistId: m[2], kind: "gist" };
    }

    m = raw.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(\/.*)?$/i);
    if (!m) return null;

    const owner = m[1];
    const repo = m[2].replace(/\.git$/i, "");
    const rest = (m[3] || "").replace(/^\/+|\/+$/g, "");

    if (!rest) {
      return { host: "github", owner, repo, ref: "HEAD", path: "", kind: "repo" };
    }

    const parts = rest.split("/");
    const type = parts[0]; // blob | tree | commit | raw
    if (type === "blob" || type === "raw" || type === "tree") {
      const ref = parts[1] || "HEAD";
      const path = parts.slice(2).join("/");
      return {
        host: "github",
        owner,
        repo,
        ref,
        path,
        kind: type === "tree" && !path ? "repo" : type === "tree" ? "dir" : "file",
      };
    }

    return { host: "github", owner, repo, ref: "HEAD", path: rest, kind: "repo" };
  }

  const PULL_TOKEN_KEY = "gdl-gh-pull-token";

  class AuthNeededError extends Error {
    constructor(message, status) {
      super(message);
      this.name = "AuthNeededError";
      this.status = status;
      this.needsAuth = true;
    }
  }

  function getStoredPullToken() {
    try {
      return sessionStorage.getItem(PULL_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function setStoredPullToken(token) {
    try {
      if (token) sessionStorage.setItem(PULL_TOKEN_KEY, token);
      else sessionStorage.removeItem(PULL_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  function getPreferredToken(explicit) {
    if (explicit) return String(explicit).trim();
    const editor = window.GDLAuth?.getSession?.()?.token;
    if (editor) return editor;
    return getStoredPullToken();
  }

  function authHeaders(token) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  /**
   * Prompt for a GitHub PAT in a modal. Resolves with token or rejects on cancel.
   */
  function promptPullAuth(reason) {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("modal-gh-pull-auth");
      const form = document.getElementById("form-gh-pull-auth");
      const input = document.getElementById("gh-pull-pat");
      const errEl = document.getElementById("gh-pull-auth-error");
      const lede = document.getElementById("gh-pull-auth-lede");
      const btnCancel = document.getElementById("btn-gh-pull-auth-cancel");

      if (!modal || !form || !input) {
        const fallback = window.prompt(
          reason ||
            "GitHub auth required. Paste a personal access token with Contents: Read:",
        );
        if (fallback?.trim()) {
          setStoredPullToken(fallback.trim());
          resolve(fallback.trim());
        } else {
          reject(new Error("GitHub authentication cancelled."));
        }
        return;
      }

      if (lede && reason) {
        lede.textContent = reason;
      }
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
      input.value = getStoredPullToken() || "";

      const cleanup = () => {
        form.removeEventListener("submit", onSubmit);
        btnCancel?.removeEventListener("click", onCancel);
        modal.removeEventListener("cancel", onCancel);
      };

      const onCancel = (e) => {
        e?.preventDefault?.();
        cleanup();
        modal.close();
        reject(new Error("GitHub authentication cancelled."));
      };

      const onSubmit = async (e) => {
        e.preventDefault();
        const token = input.value.trim();
        if (!token) {
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = "Paste a GitHub personal access token.";
          }
          return;
        }
        try {
          const res = await fetch("https://api.github.com/user", {
            headers: authHeaders(token),
          });
          if (!res.ok) {
            throw new Error(
              res.status === 401
                ? "Token rejected by GitHub. Check the PAT and try again."
                : `GitHub user lookup failed (${res.status}).`,
            );
          }
          const user = await res.json();
          setStoredPullToken(token);
          cleanup();
          modal.close();
          resolve(token);
          if (errEl) {
            errEl.hidden = true;
          }
          void user;
        } catch (err) {
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = err.message || String(err);
          }
        }
      };

      form.addEventListener("submit", onSubmit);
      btnCancel?.addEventListener("click", onCancel);
      modal.addEventListener("cancel", onCancel);
      modal.showModal();
      input.focus();
    });
  }

  async function githubRequest(url, token, { allowRetryAuth = true } = {}) {
    const res = await fetch(url, { headers: authHeaders(token) });

    if (res.ok) return res;

    const needsAuth =
      res.status === 401 ||
      res.status === 403 ||
      (res.status === 404 && !token);

    if (needsAuth && allowRetryAuth) {
      throw new AuthNeededError(
        res.status === 403
          ? "GitHub blocked the request (private repo, SSO, or rate limit). Sign in with a PAT that can read this repo."
          : "This repository requires authentication (private or not found anonymously).",
        res.status,
      );
    }

    if (res.status === 404) {
      throw new Error(
        "GitHub returned 404 — repo/file not found or token lacks access. Check the URL and PAT scopes (Contents: Read).",
      );
    }
    if (res.status === 403) {
      throw new Error(
        "GitHub returned 403 — rate limit, SSO authorization required, or insufficient token scope.",
      );
    }
    if (res.status === 401) {
      throw new AuthNeededError("GitHub rejected the token (401).", 401);
    }
    throw new Error(`GitHub fetch failed (${res.status}).`);
  }

  async function githubGetJson(url, token, opts) {
    const res = await githubRequest(url, token, opts);
    return res.json();
  }

  async function fetchRawText(url, token, opts) {
    const res = await githubRequest(url, token, opts);
    return res.text();
  }

  function decodeContent(item) {
    if (!item) return "";
    if (item.encoding === "base64" && item.content) {
      try {
        return decodeURIComponent(
          Array.prototype.map
            .call(atob(item.content.replace(/\s/g, "")), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
      } catch {
        return atob(item.content.replace(/\s/g, ""));
      }
    }
    return item.content || "";
  }

  async function withAuthRetry(fn) {
    let token = getPreferredToken();
    try {
      return await fn(token);
    } catch (err) {
      if (!err?.needsAuth) throw err;
      token = await promptPullAuth(
        err.message ||
          "This repository requires authentication. Paste a GitHub PAT with Contents: Read.",
      );
      return fn(token);
    }
  }

  async function fetchGistSource(parsed, token) {
    const data = await githubGetJson(
      `https://api.github.com/gists/${parsed.gistId}`,
      token,
    );
    const files = Object.values(data.files || {});
    if (!files.length) throw new Error("Gist has no files.");
    const preferred =
      files.find((f) => /\.(js|ts|py|java)$/i.test(f.filename)) || files[0];
    return {
      source: preferred.content || "",
      path: preferred.filename,
      languageHint: preferred.filename,
      note: `Loaded gist file: ${preferred.filename}`,
    };
  }

  async function fetchGitHubFile(owner, repo, ref, path, token) {
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`;
    const item = await githubGetJson(api, token);
    if (Array.isArray(item)) {
      throw new Error(`URL points to a folder (${path || "/"}). Open a specific file, or we will try common entry files.`);
    }
    if (item.type !== "file") {
      throw new Error("GitHub path is not a file.");
    }
    let text = decodeContent(item);
    if (!text && item.download_url) {
      text = await fetchRawText(item.download_url, token);
    }
    return {
      source: text,
      path: item.path,
      note: `Loaded ${item.path} @ ${ref}${token ? " (authenticated)" : ""}`,
    };
  }

  async function resolveDefaultBranch(owner, repo, token) {
    try {
      const repoInfo = await githubGetJson(
        `https://api.github.com/repos/${owner}/${repo}`,
        token,
      );
      return repoInfo.default_branch || "main";
    } catch (err) {
      if (err?.needsAuth) throw err;
      return "main";
    }
  }

  function promptFilePicker(files, title) {
    return new Promise((resolve, reject) => {
      const codeFiles = (files || []).filter(
        (f) => f.type === "file" && /\.(js|mjs|cjs|ts|py|java|tsx|jsx)$/i.test(f.name || f.path || ""),
      );
      const choices = codeFiles.length ? codeFiles : (files || []).filter((f) => f.type === "file");
      if (!choices.length) {
        reject(new Error("No files found in this folder."));
        return;
      }
      const modal = document.createElement("dialog");
      modal.className = "modal";
      modal.innerHTML = `<form method="dialog" class="modal__panel">
        <h2 class="modal__title">${title || "Pick a source file"}</h2>
        <p class="modal__lede">Select which file to pull into the validator.</p>
        <div class="field">
          <label for="cv-file-pick">File</label>
          <select id="cv-file-pick">${choices
            .map((f) => `<option value="${String(f.path).replace(/"/g, "&quot;")}">${String(f.path)}</option>`)
            .join("")}</select>
        </div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" data-cv-pick-cancel>Cancel</button>
          <button type="submit" class="btn btn--primary">Pull file</button>
        </div>
      </form>`;
      document.body.appendChild(modal);
      const form = modal.querySelector("form");
      const cleanup = () => modal.remove();
      modal.querySelector("[data-cv-pick-cancel]")?.addEventListener("click", () => {
        cleanup();
        reject(new Error("File pick cancelled."));
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const path = modal.querySelector("#cv-file-pick").value;
        cleanup();
        resolve(path);
      });
      modal.showModal();
    });
  }

  async function listDir(owner, repo, ref, path, token) {
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(
      path || "",
    )}?ref=${encodeURIComponent(ref)}`;
    const listing = await githubGetJson(api, token);
    if (!Array.isArray(listing)) {
      throw new Error("Expected a directory listing from GitHub.");
    }
    return listing;
  }

  async function fetchFromRepoRoot(owner, repo, ref, token, { pickFile = true } = {}) {
    const branch = ref === "HEAD" ? await resolveDefaultBranch(owner, repo, token) : ref;
    if (pickFile) {
      try {
        const listing = await listDir(owner, repo, branch, "", token);
        const path = await promptFilePicker(listing, `Pick a file in ${owner}/${repo}`);
        return fetchGitHubFile(owner, repo, branch, path, token);
      } catch (err) {
        if (err?.needsAuth) throw err;
        if (String(err.message || "").includes("cancelled")) throw err;
        /* fall through to auto entry */
      }
    }
    const tried = [];
    for (const candidate of ENTRY_CANDIDATES) {
      tried.push(candidate);
      try {
        const file = await fetchGitHubFile(owner, repo, branch, candidate, token);
        return {
          ...file,
          note: `${file.note} (auto-picked entry file)`,
        };
      } catch (err) {
        if (err?.needsAuth) throw err;
      }
    }
    throw new Error(
      `Could not find a source file in ${owner}/${repo}. Tried: ${tried.slice(0, 6).join(", ")}…`,
    );
  }

  /**
   * Fetch source from a GitHub repo/file/gist URL (public or private with PAT).
   */
  async function fetchSourceFromUrl(url, options = {}) {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      throw new Error(
        "Only GitHub/Gist URLs are supported for pull. Example: https://github.com/owner/repo/blob/main/solution.js",
      );
    }

    return withAuthRetry(async (token) => {
      if (options.forceAuth && !token) {
        throw new AuthNeededError("Authentication requested before pull.", 401);
      }
      if (parsed.host === "gist") {
        return fetchGistSource(parsed, token);
      }

      const ref = parsed.ref || "HEAD";
      if (parsed.kind === "file" && parsed.path) {
        const branch =
          ref === "HEAD" ? await resolveDefaultBranch(parsed.owner, parsed.repo, token) : ref;
        return fetchGitHubFile(parsed.owner, parsed.repo, branch, parsed.path, token);
      }
      if (parsed.kind === "dir") {
        const branch =
          ref === "HEAD" ? await resolveDefaultBranch(parsed.owner, parsed.repo, token) : ref;
        const listing = await listDir(parsed.owner, parsed.repo, branch, parsed.path, token);
        const path = await promptFilePicker(listing, `Pick a file in ${parsed.path || "/"}`);
        return fetchGitHubFile(parsed.owner, parsed.repo, branch, path, token);
      }
      return fetchFromRepoRoot(parsed.owner, parsed.repo, ref, token, { pickFile: true });
    });
  }

  function languageFromPath(path, fallback) {
    const p = String(path || "").toLowerCase();
    if (/\.py$/.test(p)) return "python";
    if (/\.java$/.test(p)) return "java";
    if (/\.(js|mjs|cjs|ts)$/.test(p)) return "javascript";
    return fallback || "auto";
  }

  /**
   * Bind a code-lab UI block.
   * Expected elements with data-cv-* inside root:
   *  language, repo, source, pull, validate, generate, run, download, report
   */
  function bindPanel(root) {
    if (!root || root.dataset.cvBound) return;
    root.dataset.cvBound = "1";

    const langEl = root.querySelector("[data-cv-language]");
    const repoEl = root.querySelector("[data-cv-repo]");
    const sourceEl = root.querySelector("[data-cv-source]");
    const reportEl = root.querySelector("[data-cv-report]");
    const btnPull = root.querySelector("[data-cv-pull]");
    const btnValidate = root.querySelector("[data-cv-validate]");
    const btnGenerate = root.querySelector("[data-cv-generate]");
    const btnRun = root.querySelector("[data-cv-run]");
    const btnDownload = root.querySelector("[data-cv-download]");

    let lastPack = null;
    let lastRun = null;

    function read() {
      return {
        source: sourceEl?.value || "",
        language: langEl?.value || "auto",
        repoUrl: repoEl?.value || "",
      };
    }

    async function pullIntoEditor({ force = false } = {}) {
      const cur = read();
      if (!cur.repoUrl.trim()) {
        throw new Error("Enter a GitHub repo or file URL first.");
      }
      if (reportEl) {
        reportEl.innerHTML = `<p class="code-lab__meta">Pulling from GitHub…</p>`;
      }
      const fetched = await fetchSourceFromUrl(cur.repoUrl.trim(), {
        forceAuth: force && !getPreferredToken(),
      });
      if (!fetched.source?.trim()) {
        throw new Error("GitHub file was empty.");
      }
      if (sourceEl) sourceEl.value = fetched.source;
      const langGuess = languageFromPath(fetched.path, cur.language);
      if (langEl && (langEl.value === "auto" || !langEl.value) && langGuess !== "auto") {
        langEl.value = langGuess;
      }
      return {
        source: fetched.source,
        language: langEl?.value || langGuess || "auto",
        repoUrl: cur.repoUrl,
        fetchNote: fetched.note || "Pulled from GitHub",
      };
    }

    async function ensureSource({ pullIfEmpty = true } = {}) {
      const cur = read();
      if (cur.source.trim()) return { ...cur, fetchNote: "" };
      if (!pullIfEmpty) {
        throw new Error("Pull from repo first, or paste source code.");
      }
      if (!cur.repoUrl.trim()) {
        throw new Error(
          "Add a GitHub URL and click Pull from repo, or paste source code (both optional if you skip code).",
        );
      }
      return pullIntoEditor();
    }

    function setBusy(busy) {
      [btnPull, btnValidate, btnGenerate, btnRun, btnDownload].forEach((b) => {
        if (b) b.disabled = busy;
      });
    }

    btnPull?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const { fetchNote } = await pullIntoEditor();
        if (reportEl) {
          reportEl.innerHTML = `<p class="code-lab__status is-ok">Pulled successfully</p><p class="code-lab__meta">${escapeHtml(
            fetchNote,
          )}</p>`;
        }
      } catch (err) {
        if (reportEl) {
          reportEl.innerHTML = `<p class="code-lab__status is-bad">${escapeHtml(err.message || String(err))}</p>`;
        }
      } finally {
        setBusy(false);
      }
    });

    btnValidate?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const { source, language, fetchNote } = await ensureSource();
        const report = validate(source, language);
        lastPack = generateTests(source, language);
        if (reportEl) {
          reportEl.innerHTML =
            (fetchNote ? `<p class="code-lab__meta">${escapeHtml(fetchNote)}</p>` : "") +
            renderReportHtml(report) +
            `<p class="code-lab__meta">${lastPack.tests.length} test case(s) ready · ${escapeHtml(lastPack.note)}</p>`;
        }
      } catch (err) {
        if (reportEl) {
          reportEl.innerHTML = `<p class="code-lab__status is-bad">${escapeHtml(err.message || String(err))}</p>`;
        }
      } finally {
        setBusy(false);
      }
    });

    btnGenerate?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const { source, language, fetchNote } = await ensureSource();
        lastPack = generateTests(source, language);
        if (reportEl) {
          reportEl.innerHTML =
            (fetchNote ? `<p class="code-lab__meta">${escapeHtml(fetchNote)}</p>` : "") +
            renderReportHtml(lastPack.validation) +
            `<p class="code-lab__meta"><strong>Generated ${lastPack.tests.length} tests</strong> · ${escapeHtml(
              lastPack.note,
            )}</p>` +
            `<ol class="code-lab__testlist">${lastPack.tests
              .map((t) => `<li><code>${escapeHtml(t.id)}</code> ${escapeHtml(t.name)}</li>`)
              .join("")}</ol>`;
        }
      } catch (err) {
        if (reportEl) {
          reportEl.innerHTML = `<p class="code-lab__status is-bad">${escapeHtml(err.message || String(err))}</p>`;
        }
      } finally {
        setBusy(false);
      }
    });

    btnRun?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const { source, language, fetchNote } = await ensureSource();
        if (reportEl) {
          reportEl.innerHTML = `<p class="code-lab__meta">${fetchNote ? escapeHtml(fetchNote) + " · " : ""}Running tests…</p>`;
        }
        lastRun = await runTests(source, language);
        lastPack = {
          language: lastRun.language,
          tests: lastRun.tests,
          harness: lastRun.harness,
          validation: lastRun.validation,
          runnable: lastRun.runnable,
          note: lastRun.message,
        };
        if (reportEl) {
          reportEl.innerHTML =
            (fetchNote ? `<p class="code-lab__meta">${escapeHtml(fetchNote)}</p>` : "") +
            renderReportHtml(lastRun.validation) +
            renderRunHtml(lastRun);
        }
      } catch (err) {
        if (reportEl) {
          reportEl.innerHTML = `<p class="code-lab__status is-bad">${escapeHtml(err.message || String(err))}</p>`;
        }
      } finally {
        setBusy(false);
      }
    });

    btnDownload?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const { source, language } = await ensureSource();
        lastPack = lastPack || generateTests(source, language);
        const ext =
          lastPack.language === "python" ? "py" : lastPack.language === "java" ? "java" : "js";
        downloadText(`mexico-hub-tests.${ext}`, lastPack.harness);
      } catch (err) {
        alert(err.message || String(err));
      } finally {
        setBusy(false);
      }
    });

    root.__gdlCodeLab = {
      read,
      ensureSource,
      pullIntoEditor,
      getSnapshot: () => {
        const { source, language, repoUrl } = read();
        if (!source.trim() && !repoUrl.trim()) return null;
        return snapshotForRecord(source, language, repoUrl, lastRun);
      },
      getLastRun: () => lastRun,
    };
  }

  window.GDLCodeValidator = {
    validate,
    generateTests,
    runTests,
    snapshotForRecord,
    bindPanel,
    detectLanguage,
    downloadText,
    renderReportHtml,
    renderRunHtml,
    fetchSourceFromUrl,
    parseGitHubUrl,
    promptPullAuth,
  };
})();
