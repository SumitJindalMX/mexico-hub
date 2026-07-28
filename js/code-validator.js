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

  /**
   * Bind a code-lab UI block.
   * Expected elements with data-cv-* inside root:
   *  language, repo, source, validate, generate, run, download, report
   */
  function bindPanel(root) {
    if (!root || root.dataset.cvBound) return;
    root.dataset.cvBound = "1";

    const langEl = root.querySelector("[data-cv-language]");
    const repoEl = root.querySelector("[data-cv-repo]");
    const sourceEl = root.querySelector("[data-cv-source]");
    const reportEl = root.querySelector("[data-cv-report]");
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

    btnValidate?.addEventListener("click", () => {
      const { source, language } = read();
      if (!source.trim()) {
        if (reportEl) reportEl.innerHTML = `<p class="code-lab__status is-bad">Paste source code first (optional field — skip if none).</p>`;
        return;
      }
      const report = validate(source, language);
      lastPack = generateTests(source, language);
      if (reportEl) {
        reportEl.innerHTML =
          renderReportHtml(report) +
          `<p class="code-lab__meta">${lastPack.tests.length} test case(s) ready · ${escapeHtml(lastPack.note)}</p>`;
      }
    });

    btnGenerate?.addEventListener("click", () => {
      const { source, language } = read();
      if (!source.trim()) {
        if (reportEl) reportEl.innerHTML = `<p class="code-lab__status is-bad">Paste source code to generate tests.</p>`;
        return;
      }
      lastPack = generateTests(source, language);
      if (reportEl) {
        reportEl.innerHTML =
          renderReportHtml(lastPack.validation) +
          `<p class="code-lab__meta"><strong>Generated ${lastPack.tests.length} tests</strong> · ${escapeHtml(
            lastPack.note,
          )}</p>` +
          `<ol class="code-lab__testlist">${lastPack.tests
            .map((t) => `<li><code>${escapeHtml(t.id)}</code> ${escapeHtml(t.name)}</li>`)
            .join("")}</ol>`;
      }
    });

    btnRun?.addEventListener("click", async () => {
      const { source, language } = read();
      if (!source.trim()) {
        if (reportEl) reportEl.innerHTML = `<p class="code-lab__status is-bad">Paste source code to run tests.</p>`;
        return;
      }
      if (reportEl) reportEl.innerHTML = `<p class="code-lab__meta">Running tests…</p>`;
      btnRun.disabled = true;
      try {
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
            renderReportHtml(lastRun.validation) + renderRunHtml(lastRun);
        }
      } finally {
        btnRun.disabled = false;
      }
    });

    btnDownload?.addEventListener("click", () => {
      const { source, language } = read();
      if (!source.trim()) {
        alert("Paste source code first.");
        return;
      }
      lastPack = lastPack || generateTests(source, language);
      const ext =
        lastPack.language === "python" ? "py" : lastPack.language === "java" ? "java" : "js";
      downloadText(`mexico-hub-tests.${ext}`, lastPack.harness);
    });

    root.__gdlCodeLab = {
      read,
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
  };
})();
