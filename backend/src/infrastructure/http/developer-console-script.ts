/**
 * Behaviour for the server-rendered developer console. It is inlined into the
 * page so the API origin never has to serve a client bundle, and it only ever
 * calls same-origin operations named by the server-provided contract island.
 */
export function developerConsoleScript(): string {
  return String.raw`
(function () {
  "use strict";
  var island = document.getElementById("console-contract");
  if (!island) return;
  var DATA = JSON.parse(island.textContent || "{}");
  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };
  var live = $("#console-live");
  function announce(message) { if (live) live.textContent = message; }
  function text(node, value) { if (node) node.textContent = value; }
  // SVG elements have no "hidden" IDL property, so visibility is toggled
  // through the attribute the stylesheet actually matches.
  function setHidden(node, hidden) {
    if (!node) return;
    if (hidden) node.setAttribute("hidden", "");
    else node.removeAttribute("hidden");
  }

  /* ------------------------------------------------------------- drawer */
  var body = document.body;
  var toggle = $("#drawer-toggle");
  var scrim = $("#sidebar-scrim");
  var sidebar = $("#sidebar");
  function setDrawer(open) {
    body.setAttribute("data-drawer", open ? "open" : "closed");
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && sidebar) {
      // The panel is only focusable once the open state has been applied, so
      // flush the pending style change before moving focus into it.
      window.requestAnimationFrame(function () {
        void sidebar.offsetWidth;
        var first = sidebar.querySelector("#drawer-close, a");
        if (first) first.focus();
      });
    } else if (toggle && document.activeElement && sidebar && sidebar.contains(document.activeElement)) {
      toggle.focus();
    }
  }
  if (toggle) toggle.addEventListener("click", function () {
    setDrawer(body.getAttribute("data-drawer") !== "open");
  });
  if (scrim) scrim.addEventListener("click", function () { setDrawer(false); });
  var drawerClose = $("#drawer-close");
  if (drawerClose) drawerClose.addEventListener("click", function () { setDrawer(false); });
  if (sidebar) sidebar.addEventListener("click", function (event) {
    if (event.target.closest("a") && window.matchMedia("(max-width: 1024px)").matches) setDrawer(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && body.getAttribute("data-drawer") === "open") setDrawer(false);
  });

  /* --------------------------------------------------------------- copy */
  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "readonly");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var copied = false;
      try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
      document.body.removeChild(area);
      copied ? resolve() : reject(new Error("copy-unavailable"));
    });
  }
  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-copy-target]");
    if (!button) return;
    var source = $(button.getAttribute("data-copy-target"));
    var value = source ? (source.value !== undefined && source.tagName === "INPUT" ? source.value : source.textContent) : "";
    var label = button.getAttribute("data-copy-label") || "Value";
    copyText(String(value || "").trim()).then(function () {
      button.setAttribute("data-copied", "true");
      announce(label + " copied to the clipboard.");
      window.setTimeout(function () { button.removeAttribute("data-copied"); }, 1600);
    }).catch(function () {
      announce(label + " could not be copied. Select the text and copy it manually.");
    });
  });

  /* ---------------------------------------------------------- telemetry */
  var samples = [];
  var chart = $("#activity-chart");
  var chartEmpty = $("#activity-empty");
  var chartTotal = $("#activity-total");
  var latencyValue = $("#stat-latency");
  var latencyNote = $("#stat-latency-note");
  var successValue = $("#stat-success");
  var successNote = $("#stat-success-note");

  function record(durationMs, ok) {
    samples.push({ at: Date.now(), duration: Math.round(durationMs), ok: ok });
    if (samples.length > 60) samples.shift();
    renderTelemetry();
  }
  function renderTelemetry() {
    if (!samples.length) return;
    var durations = samples.map(function (sample) { return sample.duration; });
    var sorted = durations.slice().sort(function (a, b) { return a - b; });
    var median = sorted[Math.floor((sorted.length - 1) / 2)];
    var succeeded = samples.filter(function (sample) { return sample.ok; }).length;
    var rate = (succeeded / samples.length) * 100;
    text(latencyValue, median + " ms");
    text(latencyNote, "Median of " + samples.length + " request" + (samples.length === 1 ? "" : "s"));
    text(successValue, (Math.round(rate * 10) / 10) + "%");
    text(successNote, succeeded + " of " + samples.length + " succeeded");
    text(chartTotal, String(samples.length));
    drawChart(durations);
  }
  function drawChart(values) {
    if (!chart) return;
    setHidden(chartEmpty, true);
    setHidden(chart, false);
    var width = Math.max(320, Math.round(chart.clientWidth) || 600);
    var height = Math.max(140, Math.round(chart.clientHeight) || 160);
    var padding = { top: 12, right: 8, bottom: 22, left: 40 };
    var maximum = Math.max.apply(null, values.concat([1]));
    var scale = Math.pow(10, Math.max(0, String(Math.round(maximum)).length - 2));
    var top = Math.ceil(maximum / scale) * scale || 1;
    var innerWidth = width - padding.left - padding.right;
    var innerHeight = height - padding.top - padding.bottom;
    var step = values.length > 1 ? innerWidth / (values.length - 1) : 0;
    var points = values.map(function (value, index) {
      var x = padding.left + (values.length > 1 ? index * step : innerWidth / 2);
      var y = padding.top + innerHeight - (value / top) * innerHeight;
      return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
    });
    var line = points.map(function (point, index) {
      return (index === 0 ? "M" : "L") + point[0] + " " + point[1];
    }).join(" ");
    var area = points.length
      ? line + " L" + points[points.length - 1][0] + " " + (padding.top + innerHeight) +
        " L" + points[0][0] + " " + (padding.top + innerHeight) + " Z"
      : "";
    var ticks = [0, 0.5, 1].map(function (ratio) {
      var y = padding.top + innerHeight - ratio * innerHeight;
      return '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y +
        '" stroke="var(--line)" stroke-width="1" />' +
        '<text x="' + (padding.left - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="var(--ink-faint)">' +
        Math.round(top * ratio) + "</text>";
    }).join("");
    chart.setAttribute("viewBox", "0 0 " + width + " " + height);
    chart.innerHTML =
      '<defs><linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.34" />' +
      '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />' +
      "</linearGradient></defs>" + ticks +
      '<path d="' + area + '" fill="url(#activity-fill)" />' +
      '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />' +
      '<text x="' + padding.left + '" y="' + (height - 6) + '" font-size="10" fill="var(--ink-faint)">oldest</text>' +
      '<text x="' + (width - padding.right) + '" y="' + (height - 6) + '" font-size="10" text-anchor="end" fill="var(--ink-faint)">latest</text>';
    chart.setAttribute("aria-label",
      "Response time of the last " + values.length + " console requests, in milliseconds. Latest " +
      values[values.length - 1] + " milliseconds.");
  }

  /* ------------------------------------------------------------ requests */
  function requestId() {
    var random = window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    return "console-" + random;
  }
  function call(path, headers, signal) {
    var controller = new AbortController();
    var abortedBy = null;
    var timer = window.setTimeout(function () {
      abortedBy = "deadline";
      controller.abort();
    }, DATA.deadlineMs);
    if (signal) signal.addEventListener("abort", function () {
      abortedBy = "cancelled";
      controller.abort();
    });
    var started = performance.now();
    var requestHeaders = Object.assign({ Accept: "application/json", "X-Request-Id": requestId() }, headers || {});
    return fetch(path, {
      method: "GET",
      headers: requestHeaders,
      // The console only reads public discovery operations, so it never sends
      // the session cookie and can never be used to replay a signed-in call.
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    }).then(function (response) {
      // The body read stays inside the same deadline as the request itself.
      return response.text().then(function (raw) {
        return { response: response, raw: raw, duration: performance.now() - started };
      });
    }).catch(function (error) {
      if (!abortedBy) throw error;
      var aborted = new Error(abortedBy);
      aborted.name = "AbortError";
      aborted.abortedBy = abortedBy;
      throw aborted;
    }).finally(function () { window.clearTimeout(timer); });
  }

  /* -------------------------------------------------------------- health */
  var healthRows = {};
  $$("[data-health]").forEach(function (row) { healthRows[row.getAttribute("data-health")] = row; });
  var healthMessage = $("#health-message");
  var healthButton = $("#health-refresh");
  var heroStatus = $("#hero-status");
  var apiStatus = $("#stat-status");

  function setRow(key, state, tone) {
    var row = healthRows[key];
    if (!row) return;
    var value = $("[data-health-state]", row);
    var dot = $("[data-health-dot]", row);
    text(value, state);
    if (value) value.className = "health-state " + tone;
    if (dot) dot.className = "dot " + tone;
  }
  function setOverall(label, tone) {
    if (heroStatus) {
      heroStatus.className = "pill pill-lg " + tone;
      var heroText = $("[data-status-text]", heroStatus);
      text(heroText, label);
    }
    if (apiStatus) {
      apiStatus.className = "stat-value";
      apiStatus.innerHTML = '<span class="dot ' + tone + '"></span>' + label;
    }
  }
  function refreshHealth() {
    if (healthButton) healthButton.disabled = true;
    text(healthMessage, "Checking the public probes…");
    ["runtime", "database", "queue"].forEach(function (key) { setRow(key, "Checking…", "tone-idle"); });
    var probes = Promise.all([
      call(DATA.probes.liveness).catch(function (error) { return { error: error }; }),
      call(DATA.probes.readiness).catch(function (error) { return { error: error }; }),
    ]);
    probes.then(function (results) {
      var liveness = results[0];
      var readiness = results[1];
      if (liveness.error && readiness.error) {
        ["runtime", "database", "queue"].forEach(function (key) { setRow(key, "Unavailable", "tone-danger"); });
        setOverall("Unreachable", "tone-danger");
        text(healthMessage, "The health probes could not be reached from this browser. Retry, or check the API process.");
        announce("The API health probes are unreachable.");
        return;
      }
      if (!liveness.error) {
        record(liveness.duration, liveness.response.ok);
        setRow("runtime", liveness.response.ok ? "Healthy" : "Degraded", liveness.response.ok ? "tone-ok" : "tone-danger");
        setOverall(liveness.response.ok ? "API online" : "API degraded", liveness.response.ok ? "tone-ok" : "tone-danger");
      } else {
        setRow("runtime", "Unavailable", "tone-danger");
        setOverall("Unreachable", "tone-danger");
      }
      if (readiness.error) {
        setRow("database", "Unknown", "tone-idle");
        setRow("queue", "Unknown", "tone-idle");
        text(healthMessage, "Readiness did not answer within the request deadline.");
        return;
      }
      record(readiness.duration, readiness.response.ok);
      var payload = {};
      try { payload = JSON.parse(readiness.raw || "{}"); } catch (error) { payload = {}; }
      var dependencies = payload.dependencies || {};
      var mapping = { database: dependencies.database, queue: dependencies.redis };
      Object.keys(mapping).forEach(function (key) {
        var state = mapping[key];
        if (state === "up") setRow(key, "Connected", "tone-ok");
        else if (state === "down") setRow(key, "Unavailable", "tone-danger");
        else setRow(key, "Not reported", "tone-idle");
      });
      var ready = payload.status === "ready";
      text(healthMessage, ready
        ? "All dependencies reported ready."
        : "Readiness reported a degraded dependency. The API answers " + readiness.response.status + " on the readiness probe.");
      announce(ready ? "All API dependencies are ready." : "The API reported a degraded dependency.");
    }).finally(function () { if (healthButton) healthButton.disabled = false; });
  }
  if (healthButton) healthButton.addEventListener("click", refreshHealth);

  /* ---------------------------------------------------------- playground */
  var operations = DATA.playground || [];
  var operationSelect = $("#playground-operation");
  var parameterHost = $("#playground-parameters");
  var sendButton = $("#playground-send");
  var cancelButton = $("#playground-cancel");
  var accessNote = $("#playground-access");
  var responseStatus = $("#response-status");
  var responseDuration = $("#response-duration");
  var responseBody = $("#response-body");
  var responseCopy = $("#response-copy");
  var curlBlock = $("#snippet-curl");
  var jsBlock = $("#snippet-js");
  var marketOptions = null;
  var inFlight = null;

  function currentOperation() {
    if (!operationSelect) return null;
    for (var index = 0; index < operations.length; index += 1) {
      if (operations[index].operationId === operationSelect.value) return operations[index];
    }
    return operations[0] || null;
  }
  function parameterControls() {
    return $$("[data-parameter]", parameterHost);
  }
  function renderParameters() {
    var operation = currentOperation();
    if (!parameterHost || !operation) return;
    parameterHost.innerHTML = "";
    if (accessNote) {
      accessNote.textContent = operation.parameters.length
        ? "Public discovery operation. " + operation.parameters.length + " documented parameter" +
          (operation.parameters.length === 1 ? "" : "s") + "."
        : "Public discovery operation with no documented parameters.";
    }
    operation.parameters.forEach(function (parameter) {
      var control = document.createElement("div");
      control.className = "control";
      var id = "param-" + parameter.name.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
      var label = document.createElement("label");
      label.className = "field-label";
      label.setAttribute("for", id);
      label.textContent = parameter.name + (parameter.required ? " (required)" : "");
      control.appendChild(label);
      var field;
      if (parameter.name === DATA.marketHeader && marketOptions && marketOptions.length) {
        var wrap = document.createElement("div");
        wrap.className = "select-wrap";
        field = document.createElement("select");
        field.className = "select";
        marketOptions.forEach(function (market) {
          var option = document.createElement("option");
          option.value = market.code;
          option.textContent = market.code + " — " + market.name;
          field.appendChild(option);
        });
        wrap.appendChild(field);
        control.appendChild(wrap);
      } else {
        field = document.createElement("input");
        field.className = "input";
        field.type = "text";
        field.value = parameter.defaultValue || "";
        field.placeholder = parameter.location === "header" ? "Header value" : "Query value";
        control.appendChild(field);
      }
      field.id = id;
      field.setAttribute("data-parameter", parameter.name);
      field.setAttribute("data-location", parameter.location);
      if (parameter.description) {
        var hint = document.createElement("small");
        hint.textContent = parameter.description;
        control.appendChild(hint);
        field.setAttribute("aria-describedby", id + "-hint");
        hint.id = id + "-hint";
      }
      parameterHost.appendChild(control);
      field.addEventListener("input", renderSnippets);
      field.addEventListener("change", renderSnippets);
    });
    renderSnippets();
  }
  function buildRequest() {
    var operation = currentOperation();
    if (!operation) return null;
    var query = new URLSearchParams();
    var headers = {};
    parameterControls().forEach(function (field) {
      var value = String(field.value || "").trim();
      if (!value) return;
      if (field.getAttribute("data-location") === "header") headers[field.getAttribute("data-parameter")] = value;
      else query.set(field.getAttribute("data-parameter"), value);
    });
    var search = query.toString();
    return {
      operation: operation,
      path: operation.requestPath + (search ? "?" + search : ""),
      headers: headers,
    };
  }
  function renderSnippets() {
    var request = buildRequest();
    if (!request) return;
    var absolute = DATA.origin + request.path;
    var curl = ["curl --request GET \\", "  '" + absolute + "'"];
    Object.keys(request.headers).forEach(function (name) {
      curl.splice(curl.length - 1, 0, "  --header '" + name + ": " + request.headers[name] + "' \\");
    });
    text(curlBlock, curl.join("\n"));
    var headerLines = Object.keys(request.headers).map(function (name) {
      return "    " + JSON.stringify(name) + ": " + JSON.stringify(request.headers[name]) + ",";
    });
    text(jsBlock, [
      "const response = await fetch(",
      "  " + JSON.stringify(absolute) + ",",
      "  {",
      "    headers: {",
      "      Accept: \"application/json\"," ,
      headerLines.length ? headerLines.map(function (line) { return "  " + line; }).join("\n") : null,
      "    },",
      "  },",
      ");",
      "const data = await response.json();",
    ].filter(function (line) { return line !== null; }).join("\n"));
  }
  function setSending(sending) {
    if (sendButton) sendButton.disabled = sending;
    setHidden(cancelButton, !sending);
    if (operationSelect) operationSelect.disabled = sending;
  }
  function showResponseTab() {
    var group = $("[data-tab-group]");
    if (!group) return;
    var tabs = $$("[role=tab]", group);
    for (var index = 0; index < tabs.length; index += 1) {
      if (tabs[index].getAttribute("aria-controls") === "panel-response") selectTab(tabs, index);
    }
  }

  function send() {
    var request = buildRequest();
    if (!request) return;
    showResponseTab();
    var controller = new AbortController();
    inFlight = controller;
    setSending(true);
    text(responseStatus, "Sending…");
    if (responseStatus) responseStatus.className = "pill tone-idle";
    text(responseDuration, "");
    text(responseBody, "Waiting for the API…");
    call(request.path, request.headers, controller.signal).then(function (result) {
      record(result.duration, result.response.ok);
      var tone = result.response.ok ? "tone-ok" : result.response.status >= 500 ? "tone-danger" : "tone-accent";
      if (responseStatus) responseStatus.className = "pill " + tone;
      text(responseStatus, result.response.status + " " + (result.response.statusText || ""));
      text(responseDuration, Math.round(result.duration) + " ms");
      var formatted = result.raw;
      try { formatted = JSON.stringify(JSON.parse(result.raw), null, 2); } catch (error) { /* not JSON */ }
      var truncated = formatted.length > 40000;
      text(responseBody, truncated ? formatted.slice(0, 40000) + "\n… response truncated for display." : formatted);
      setHidden(responseCopy, false);
      announce("Response " + result.response.status + " in " + Math.round(result.duration) + " milliseconds.");
    }).catch(function (error) {
      if (responseStatus) responseStatus.className = "pill tone-danger";
      var abortedBy = error && error.abortedBy;
      var label = abortedBy === "cancelled" ? "Cancelled" : abortedBy === "deadline" ? "Timed out" : "Failed";
      text(responseStatus, label);
      text(responseDuration, "");
      text(responseBody, abortedBy === "cancelled"
        ? "The request was cancelled before the API answered."
        : abortedBy === "deadline"
          ? "The request exceeded the " + Math.round(DATA.deadlineMs / 1000) + " second deadline and was stopped."
          : "The request could not be completed from this browser. Check that the API is reachable and retry.");
      setHidden(responseCopy, true);
      announce(label + ".");
    }).finally(function () { inFlight = null; setSending(false); });
  }
  if (operationSelect) operationSelect.addEventListener("change", renderParameters);
  if (sendButton) sendButton.addEventListener("click", send);
  if (cancelButton) cancelButton.addEventListener("click", function () {
    if (inFlight) inFlight.abort();
  });

  $$("[data-tab-group]").forEach(function (group) {
    var tabs = $$("[role=tab]", group);
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { selectTab(tabs, index); });
      tab.addEventListener("keydown", function (event) {
        var offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!offset) return;
        event.preventDefault();
        selectTab(tabs, (index + offset + tabs.length) % tabs.length, true);
      });
    });
  });
  function selectTab(tabs, index, focus) {
    tabs.forEach(function (tab, position) {
      var selected = position === index;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      setHidden($("#" + tab.getAttribute("aria-controls")), !selected);
    });
    if (focus) tabs[index].focus();
  }

  /* ------------------------------------------------------------- probes */
  $$("[data-probe]").forEach(function (button) {
    button.addEventListener("click", function () {
      var path = button.getAttribute("data-probe");
      var match = operations.filter(function (operation) { return operation.requestPath === path; })[0];
      if (match && operationSelect) {
        operationSelect.value = match.operationId;
        renderParameters();
        send();
      }
      var section = $("#playground");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ------------------------------------------------------------ endpoints */
  var tableBody = $("#endpoint-rows");
  var essentialRows = tableBody ? tableBody.innerHTML : "";
  var searchInputs = $$("[data-endpoint-search]");
  var accessButtons = $$("[data-access-filter]");
  var domainSelect = $("#endpoint-domain");
  var tableCount = $("#endpoint-count");
  var accessFilter = "all";
  var MAX_ROWS = 80;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  function renderEndpoints() {
    if (!tableBody) return;
    var query = (searchInputs.length ? String(searchInputs[0].value || "") : "").trim().toLowerCase();
    var domain = domainSelect ? domainSelect.value : "all";
    var filtering = Boolean(query) || accessFilter !== "all" || domain !== "all";
    if (!filtering) {
      tableBody.innerHTML = essentialRows;
      text(tableCount, "Showing " + DATA.essentialCount + " essential operations of " + DATA.operations.length + " documented.");
      return;
    }
    var matches = DATA.operations.filter(function (operation) {
      if (accessFilter !== "all" && operation[3] !== accessFilter) return false;
      if (domain !== "all" && operation[4] !== domain) return false;
      if (!query) return true;
      return (operation[0] + " " + operation[1] + " " + operation[2]).toLowerCase().indexOf(query) >= 0;
    });
    if (!matches.length) {
      tableBody.innerHTML = '<tr class="empty-row"><td colspan="4">No documented operation matches this filter.</td></tr>';
      text(tableCount, "No match. Clear the filters to return to the essential operations.");
      announce("No documented operation matches this filter.");
      return;
    }
    tableBody.innerHTML = matches.slice(0, MAX_ROWS).map(function (operation) {
      var tone = operation[3] === "public" ? "tone-ok" : operation[3] === "staff" ? "tone-staff" : "tone-info";
      return '<tr><td><span class="method-tag method-' + operation[0].toLowerCase() + '">' + escapeHtml(operation[0]) +
        '</span></td><td class="path"><code>' + escapeHtml(operation[1]) + "</code></td>" +
        '<td class="purpose">' + escapeHtml(operation[2]) + "</td>" +
        '<td><span class="pill ' + tone + '">' + escapeHtml(DATA.accessLabels[operation[3]]) + "</span></td></tr>";
    }).join("");
    text(tableCount, matches.length > MAX_ROWS
      ? "Showing the first " + MAX_ROWS + " of " + matches.length + " matching operations. Refine the filter to narrow it."
      : "Showing " + matches.length + " matching operation" + (matches.length === 1 ? "" : "s") + ".");
    announce(matches.length + " operations match this filter.");
  }
  searchInputs.forEach(function (input) {
    input.addEventListener("input", function () {
      searchInputs.forEach(function (other) { if (other !== input) other.value = input.value; });
      renderEndpoints();
    });
  });
  accessButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      accessFilter = button.getAttribute("data-access-filter");
      accessButtons.forEach(function (other) {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      renderEndpoints();
    });
  });
  if (domainSelect) domainSelect.addEventListener("change", renderEndpoints);

  document.addEventListener("keydown", function (event) {
    var typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    var shortcut = (event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing);
    if (!shortcut) return;
    event.preventDefault();
    var input = $("#docs-search");
    if (input) { input.focus(); input.select(); }
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderTelemetry, 150);
  });

  /* ---------------------------------------------------------------- boot */
  refreshHealth();
  call(DATA.marketsPath).then(function (result) {
    if (!result.response.ok) return;
    record(result.duration, true);
    var payload = JSON.parse(result.raw || "[]");
    // The contract carries the platform's own ordering, so the default market
    // is the one Shongre presents first rather than an alphabetical accident.
    marketOptions = (Array.isArray(payload) ? payload : [])
      .filter(function (market) { return market && market.code && market.enabled !== false; })
      .map(function (market) {
        return {
          code: market.code,
          name: market.name || market.code,
          order: typeof market.displayOrder === "number" ? market.displayOrder : Number.MAX_SAFE_INTEGER,
        };
      })
      .sort(function (first, second) {
        return first.order - second.order || first.code.localeCompare(second.code);
      });
    renderParameters();
  }).catch(function () { /* the free-text market field remains usable */ });
  renderParameters();
  renderEndpoints();
})();
`;
}
