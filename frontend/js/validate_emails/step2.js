(function () {
  const START_BUTTON_SELECTOR =
    "#validate-emails-run, #validate-emails-start, #validate-emails-validate-btn, #validate-emails-process-btn";
  const CANCEL_BUTTON_SELECTOR = "#validate-emails-cancel, #validate-emails-stop";
  const DEFAULT_BATCH_SIZE = 20;
  const state = (window.validateEmailsState = window.validateEmailsState || {});

  state.data = Array.isArray(state.data) ? state.data : [];
  state.results = state.results || {};
  state.progress = state.progress || {
    total: state.data.length || null,
    processed: Object.keys(state.results).length,
    remaining: null,
    complete: false,
  };

  let isProcessing = false;
  let cancelRequested = false;
  let currentRequest = null;

  function toNumber(value) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  function setText(selector, text) {
    if (!selector) return;
    const el = $(selector);
    if (!el.length) return;
    el.text(text);
  }

  function escapeHtml(value) {
    if (value === undefined || value === null) {
      return "";
    }
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function extractEmail(row) {
    if (row === null || row === undefined) return "";
    if (typeof row === "string") return row.trim();
    if (Array.isArray(row)) {
      for (let i = 0; i < row.length; i += 1) {
        const emailCandidate = extractEmail(row[i]);
        if (emailCandidate) return emailCandidate;
      }
      return "";
    }
    if (typeof row === "object") {
      if (row.email) return String(row.email).trim();
      if (row.Email) return String(row.Email).trim();
      for (const key in row) {
        if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
        const lower = key.toLowerCase();
        if (lower.includes("email")) {
          const val = row[key];
          if (val === null || val === undefined) continue;
          if (typeof val === "string") return val.trim();
          const nested = extractEmail(val);
          if (nested) return nested;
        }
      }
    }
    return "";
  }

  function getBatchSize() {
    const input = $("#validate-emails-batch-size");
    if (input.length) {
      const parsed = toNumber(input.val());
      if (parsed && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_BATCH_SIZE;
  }

  function chunkEntries(entries, size) {
    const batches = [];
    for (let i = 0; i < entries.length; i += size) {
      batches.push(entries.slice(i, i + size));
    }
    return batches;
  }

  function recomputeSummary() {
    const results = state.results || {};
    const summary = {
      total:
        state.progress && state.progress.total !== undefined && state.progress.total !== null
          ? state.progress.total
          : state.data
          ? state.data.length
          : null,
      processed: 0,
      valid: 0,
      invalid: 0,
      missing: 0,
    };

    Object.keys(results).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(results, key)) return;
      const entry = results[key] || {};
      summary.processed += 1;
      const status = (entry.status || "").toLowerCase();
      if (status === "valid") summary.valid += 1;
      else if (status === "invalid") summary.invalid += 1;
      else if (status === "missing" || status === "empty") summary.missing += 1;
    });

    if (summary.total !== null && summary.total !== undefined) {
      summary.remaining = Math.max(summary.total - summary.processed, 0);
    } else {
      summary.remaining = null;
    }
    state.summary = summary;
    return summary;
  }

  function updateSummaryUI() {
    if (!state.summary) return;
    const summary = state.summary;
    const summaryContainer = $("#validate-emails-summary");
    if (summaryContainer.length) {
      const parts = [];
      if (summary.total !== null && summary.total !== undefined) {
        parts.push("Total: " + summary.total);
      }
      parts.push("Processed: " + summary.processed);
      parts.push("Valid: " + summary.valid);
      parts.push("Invalid: " + summary.invalid);
      parts.push("Missing: " + summary.missing);
      if (summary.remaining !== null && summary.remaining !== undefined) {
        parts.push("Remaining: " + summary.remaining);
      }
      summaryContainer.text(parts.join(" • "));
    }

    setText("#validate-emails-summary-total", summary.total !== null ? summary.total : "");
    setText("#validate-emails-summary-processed", summary.processed);
    setText("#validate-emails-summary-valid", summary.valid);
    setText("#validate-emails-summary-invalid", summary.invalid);
    setText("#validate-emails-summary-missing", summary.missing);
    if (summary.remaining !== null && summary.remaining !== undefined) {
      setText("#validate-emails-summary-remaining", summary.remaining);
    }
  }

  function renderResultsTable() {
    const table = $("#validate-emails-results");
    if (!table.length) return;
    let tbody = table.find("tbody");
    if (!tbody.length) {
      tbody = $("<tbody></tbody>");
      table.append(tbody);
    }

    const rows = [];
    const keys = Object.keys(state.results || {}).sort(function (a, b) {
      return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
    });

    keys.forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(state.results, key)) return;
      const entry = state.results[key] || {};
      rows.push(
        "<tr>" +
          '<td class="index">' + escapeHtml(key) + "</td>" +
          '<td class="email">' + escapeHtml(entry.email || "") + "</td>" +
          '<td class="status">' + escapeHtml(entry.status || "") + "</td>" +
          '<td class="detail">' + escapeHtml(entry.reason || entry.message || entry.detail || "") + "</td>" +
          "</tr>"
      );
    });

    tbody.html(rows.join(""));
  }

  function updateProgressUI(progress) {
    state.progress = state.progress || {};
    if (progress) {
      if (progress.total !== undefined) state.progress.total = progress.total;
      if (progress.processed !== undefined) state.progress.processed = progress.processed;
      if (progress.remaining !== undefined) state.progress.remaining = progress.remaining;
      if (progress.complete !== undefined) state.progress.complete = !!progress.complete;
    } else {
      state.progress.processed = Object.keys(state.results || {}).length;
      if (state.summary && state.summary.remaining !== undefined) {
        state.progress.remaining = state.summary.remaining;
      }
    }

    const summary = state.summary || recomputeSummary();
    if (state.progress.total === null || state.progress.total === undefined) {
      state.progress.total = summary.total;
    }
    if (state.progress.remaining === null || state.progress.remaining === undefined) {
      state.progress.remaining = summary.remaining;
    }
    state.progress.processed = summary.processed;

    const progressTextParts = [];
    if (state.progress.total !== null && state.progress.total !== undefined) {
      progressTextParts.push(state.progress.processed + " / " + state.progress.total);
    } else {
      progressTextParts.push(state.progress.processed + " processed");
    }
    if (state.progress.remaining !== null && state.progress.remaining !== undefined) {
      progressTextParts.push(state.progress.remaining + " remaining");
    }
    if (state.progress.complete) {
      progressTextParts.push("Complete");
    }

    setText("#validate-emails-progress", progressTextParts.join(" • "));
    setText("#validate-emails-progress-processed", state.progress.processed);
    if (state.progress.total !== null && state.progress.total !== undefined) {
      setText("#validate-emails-progress-total", state.progress.total);
    }
    if (state.progress.remaining !== null && state.progress.remaining !== undefined) {
      setText("#validate-emails-progress-remaining", state.progress.remaining);
    }

    const progressBar = $("#validate-emails-progress-bar");
    if (progressBar.length && state.progress.total) {
      const percent = Math.min(100, Math.round((state.progress.processed / state.progress.total) * 100));
      progressBar.css("width", percent + "%");
      progressBar.attr("aria-valuenow", percent);
      progressBar.attr("aria-valuemax", 100);
    }
  }

  function toggleProcessingUI(running, currentBatch, totalBatches) {
    const buttons = $(START_BUTTON_SELECTOR);
    if (buttons.length) {
      buttons.prop("disabled", !!running);
    }
    const cancelButtons = $(CANCEL_BUTTON_SELECTOR);
    if (cancelButtons.length) {
      cancelButtons.prop("disabled", !running);
    }
    const statusEl = $("#validate-emails-status, #validate-emails-processing-status");
    if (statusEl.length) {
      if (running) {
        const label = totalBatches
          ? "Validating batch " + currentBatch + " of " + totalBatches + "..."
          : "Validating emails...";
        statusEl.text(label);
      } else if (!cancelRequested) {
        statusEl.text("Ready");
      } else {
        statusEl.text("Cancelled");
      }
    }
  }

  function mergeBatchResults(partialResults) {
    if (!partialResults) return recomputeSummary();
    const keys = Object.keys(partialResults);
    keys.forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(partialResults, key)) return;
      const result = partialResults[key] || {};
      let index = toNumber(key);
      if (index === null && result.index !== undefined) {
        index = toNumber(result.index);
      }
      const normalizedKey = index === null ? String(key) : String(index);
      const emailFromResult = result.email || result.value;
      const merged = Object.assign(
        {},
        state.results[normalizedKey] || {},
        result,
        {
          index: index === null ? result.index : index,
          email:
            emailFromResult ||
            (index !== null && state.data && state.data[index] ? extractEmail(state.data[index]) : emailFromResult || ""),
        }
      );
      state.results[normalizedKey] = merged;
    });
    return recomputeSummary();
  }

  function buildEntries() {
    const entries = [];
    const dataset = Array.isArray(state.data) ? state.data : [];
    for (let i = 0; i < dataset.length; i += 1) {
      const email = extractEmail(dataset[i]);
      entries.push({
        index: i,
        email: email,
        row: dataset[i],
      });
    }
    return entries;
  }

  function buildPayloadFromBatch(batch) {
    return {
      emails: batch.map(function (item) {
        return {
          index: item.index,
          value: item.email,
        };
      }),
      total_count: state.data ? state.data.length : undefined,
    };
  }

  function sendBatchQueue(batches, pos) {
    if (cancelRequested) {
      isProcessing = false;
      toggleProcessingUI(false);
      cancelRequested = false;
      currentRequest = null;
      updateProgressUI();
      updateSummaryUI();
      return;
    }

    if (pos >= batches.length) {
      isProcessing = false;
      toggleProcessingUI(false);
      state.progress.complete = true;
      updateProgressUI({ complete: true });
      updateSummaryUI();
      currentRequest = null;
      return;
    }

    toggleProcessingUI(true, pos + 1, batches.length);
    const payload = buildPayloadFromBatch(batches[pos]);

    currentRequest = $.ajax({
      url: "/validate_emails/validate",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function (response) {
        const partialResults = response && response.results ? response.results : {};
        mergeBatchResults(partialResults);
        if (response && response.progress) {
          updateProgressUI(response.progress);
        } else {
          updateProgressUI();
        }
        updateSummaryUI();
        currentRequest = null;
        sendBatchQueue(batches, pos + 1);
      })
      .fail(function (xhr, textStatus) {
        currentRequest = null;
        if (textStatus === "abort") {
          return;
        }
        console.error("Failed to validate email batch", textStatus, xhr && xhr.responseText);
        toggleProcessingUI(false);
        isProcessing = false;
        cancelRequested = false;
        let message = "Unable to validate this batch.";
        if (xhr && xhr.responseJSON && xhr.responseJSON.error) {
          message += " " + xhr.responseJSON.error;
        } else if (xhr && xhr.responseText) {
          message += " " + xhr.responseText;
        }
        alert(message);
      });
  }

  function startValidation() {
    if (isProcessing) return;
    cancelRequested = false;

    const dataset = Array.isArray(state.data) ? state.data : [];
    if (!dataset.length) {
      alert("No email data loaded for validation.");
      return;
    }

    const entries = buildEntries();
    const results = state.results || {};
    const remainingEntries = entries.filter(function (entry) {
      return !Object.prototype.hasOwnProperty.call(results, String(entry.index));
    });

    const batchSize = getBatchSize();
    const batches = chunkEntries(remainingEntries, batchSize);

    if (!batches.length) {
      state.progress.complete = true;
      updateProgressUI({ complete: true });
      updateSummaryUI();
      alert("All rows have already been validated.");
      return;
    }

    isProcessing = true;
    state.progress.complete = false;
    updateProgressUI({ total: dataset.length });
    updateSummaryUI();
    sendBatchQueue(batches, 0);
  }

  function cancelValidation() {
    if (!isProcessing) return;
    cancelRequested = true;
    if (currentRequest && currentRequest.readyState !== 4) {
      currentRequest.abort();
    }
    toggleProcessingUI(false);
  }

  function bindEventHandlers() {
    $(START_BUTTON_SELECTOR)
      .off("click.validateEmails")
      .on("click.validateEmails", function (event) {
        event.preventDefault();
        startValidation();
      });

    $(CANCEL_BUTTON_SELECTOR)
      .off("click.validateEmailsCancel")
      .on("click.validateEmailsCancel", function (event) {
        event.preventDefault();
        cancelValidation();
      });
  }

  function initialise() {
    bindEventHandlers();
    recomputeSummary();
    updateSummaryUI();
    updateProgressUI();
    renderResultsTable();
  }

  $(document).ready(function () {
    initialise();
  });
})();
