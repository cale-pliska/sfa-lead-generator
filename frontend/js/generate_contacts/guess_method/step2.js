(function () {
  const RESULTS_KEY = "generate_contacts_guess_step2_results";
  const SHARED_PROMPT_KEY = "generate_contacts_guess_shared_prompt";
  const STEP3_INSTRUCTIONS_KEY = "generate_contacts_guess_step3_instructions";
  const STEP3_RESULTS_KEY = "generate_contacts_guess_step3_results";
  const MODE_STORAGE_KEY = "generate_contacts_guess_process_mode";
  const LEGACY_PROMPT_KEYS = [
    "generate_contacts_guess_step2_prompt",
    "generate_contacts_guess_step3_prompt",
  ];

  const PROCESS_MODES = {
    BOTH: "both",
    STEP2: "step2",
    STEP3: "step3",
  };

  const PROCESS_SLIDER_VALUES = [
    PROCESS_MODES.STEP2,
    PROCESS_MODES.BOTH,
    PROCESS_MODES.STEP3,
  ];

  function modeForSliderPosition(position) {
    return PROCESS_SLIDER_VALUES[position] || PROCESS_MODES.BOTH;
  }

  function sliderPositionForMode(mode) {
    const index = PROCESS_SLIDER_VALUES.indexOf(mode);
    if (index === -1) {
      return PROCESS_SLIDER_VALUES.indexOf(PROCESS_MODES.BOTH);
    }
    return index;
  }

  function updateSliderLabels(mode) {
    $(".guess-process-labels span").removeClass("active");
    $(".guess-process-labels span[data-value='" + mode + "']").addClass(
      "active"
    );
  }

  function replaceStepResults(nextResults) {
    const normalized = nextResults && typeof nextResults === "object" ? nextResults : {};
    window.guessStep2Results = normalized;
    return window.guessStep2Results;
  }

  let stepResults = replaceStepResults(window.guessStep2Results || {});
  let cancelProcessing = false;
  let currentRequest = null;

  function getBusinessNameKey(obj) {
    if (!obj) {
      return null;
    }
    for (const key in obj) {
      const lower = key.toLowerCase();
      if (
        lower === "business name" ||
        lower === "business_name" ||
        (lower.includes("business") && lower.includes("name"))
      ) {
        return key;
      }
    }
    if (Object.prototype.hasOwnProperty.call(obj, "name")) {
      return "name";
    }
    const keys = Object.keys(obj);
    return keys.length ? keys[0] : null;
  }

  function formatValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function extractDomainsFromValue(value) {
    if (!value) {
      return "";
    }
    let text;
    if (typeof value === "string") {
      text = value;
    } else {
      try {
        text = JSON.stringify(value);
      } catch (err) {
        text = String(value);
      }
    }
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
    if (!matches) {
      return "";
    }
    const domains = [];
    matches.forEach(function (email) {
      const cleaned = email.trim().replace(/[.,;:]+$/, "");
      const parts = cleaned.split("@");
      if (parts.length === 2) {
        const domain = parts[1].toLowerCase();
        if (domain && domains.indexOf(domain) === -1) {
          domains.push(domain);
        }
      }
    });
    return domains.join(", ");
  }

  function applyEmailDomainExtraction(targetIndexes) {
    let indexes = [];
    if (Array.isArray(targetIndexes) && targetIndexes.length) {
      indexes = targetIndexes.map(function (idx) {
        return String(idx);
      });
    } else {
      indexes = Object.keys(stepResults);
    }

    if (!indexes.length) {
      return false;
    }

    let modified = false;
    indexes.forEach(function (idx) {
      const row = stepResults[idx];
      if (!row) {
        return;
      }
      const domain = extractDomainsFromValue(row.raw_public_emails);
      if (domain !== (row.email_domain || "")) {
        mergeRowData(idx, { email_domain: domain });
        modified = true;
      }
    });

    if (modified) {
      storeResults();
    }

    return modified;
  }

  function mergeRowData(rowIndex, updates) {
    const key = String(rowIndex);
    const previous = stepResults[key] ? { ...stepResults[key] } : {};
    Object.keys(updates || {}).forEach(function (field) {
      const value = updates[field];
      if (typeof value !== "undefined") {
        previous[field] = value;
      }
    });
    previous.index = rowIndex;
    stepResults[key] = previous;
    return previous;
  }

  function renderResultsTable(resultsObj) {
    const indexes = Object.keys(resultsObj).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    if (!indexes.length) {
      $("#guess-results-container").html("No results");
      return;
    }
    const firstRow = resultsObj[indexes[0]] || {};
    const businessKey = getBusinessNameKey(firstRow);
    const columns = [];
    if (businessKey) {
      columns.push(businessKey);
    }
    if (columns.indexOf("raw_public_emails") === -1) {
      columns.push("raw_public_emails");
    }
    if (columns.indexOf("email_domain") === -1) {
      columns.push("email_domain");
    }
    const hasRawContacts = indexes.some(function (idx) {
      const row = resultsObj[idx];
      return row && typeof row.raw_contacts !== "undefined";
    });
    if (hasRawContacts && columns.indexOf("raw_contacts") === -1) {
      columns.push("raw_contacts");
    }
    let html = '<table id="guess-results-table"><thead><tr><th>index</th>';
    columns.forEach(function (col) {
      html += "<th>" + col + "</th>";
    });
    html += "</tr></thead><tbody>";
    indexes.forEach(function (idx) {
      const row = resultsObj[idx] || {};
      html += "<tr><td>" + idx + "</td>";
      columns.forEach(function (col) {
        const value = row[col];
        html += "<td>" + formatValue(value) + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    $("#guess-results-container").html(html);
  }

  function storeResults() {
    window.guessStep2Results = stepResults;
    localStorage.setItem(RESULTS_KEY, JSON.stringify(stepResults));
    localStorage.removeItem(STEP3_RESULTS_KEY);
    $(document).trigger("guessStep2ResultsUpdated", [stepResults]);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function sendRequest(url, payload) {
    return new Promise(function (resolve, reject) {
      currentRequest = $.ajax({
        url: url,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        success: function (data) {
          currentRequest = null;
          resolve(data);
        },
        error: function (xhr, textStatus) {
          currentRequest = null;
          if (textStatus === "abort") {
            reject(new Error("aborted"));
          } else {
            reject(xhr);
          }
        },
      });
    });
  }

  async function attemptRequest(url, payload, retries) {
    if (cancelProcessing) {
      throw new Error("cancelled");
    }
    try {
      const response = await sendRequest(url, payload);
      return response;
    } catch (err) {
      if (cancelProcessing || (err && err.message === "aborted")) {
        throw err;
      }
      if (retries > 0) {
        await wait(300);
        return attemptRequest(url, payload, retries - 1);
      }
      throw err;
    }
  }

  function normalizeResponse(stepName, rowIndex, response) {
    let normalized;
    if (response && typeof response === "object") {
      normalized = { ...response };
    } else {
      normalized = {};
    }
    if (stepName === PROCESS_MODES.STEP2) {
      if (typeof normalized.raw_public_emails === "undefined") {
        normalized.raw_public_emails = normalized.result || response || "";
      }
    } else if (stepName === PROCESS_MODES.STEP3) {
      if (typeof normalized.raw_contacts === "undefined") {
        normalized.raw_contacts = normalized.result || response || "";
      }
    }
    delete normalized.result;
    normalized.index = rowIndex;
    return normalized;
  }

  function handleStepSuccess(stepName, rowIndex, response) {
    const normalized = normalizeResponse(stepName, rowIndex, response);
    mergeRowData(rowIndex, normalized);
    storeResults();
    if (stepName === PROCESS_MODES.STEP2) {
      applyEmailDomainExtraction([rowIndex]);
    }
  }

  async function processRowPipeline(rowIndex, mode, prompts) {
    const tasks = [];
    if (mode === PROCESS_MODES.BOTH || mode === PROCESS_MODES.STEP2) {
      tasks.push({
        step: PROCESS_MODES.STEP2,
        url: "/generate_contacts/guess/process_single",
        instructions: prompts.step2Instructions,
        prompt: prompts.step2Prompt,
      });
    }
    if (mode === PROCESS_MODES.BOTH || mode === PROCESS_MODES.STEP3) {
      tasks.push({
        step: PROCESS_MODES.STEP3,
        url: "/generate_contacts/guess/step3/process_single",
        instructions: prompts.step3Instructions,
        prompt: prompts.step3Prompt,
      });
    }

    for (let i = 0; i < tasks.length; i += 1) {
      if (cancelProcessing) {
        break;
      }
      const task = tasks[i];
      const payload = {
        prompt: task.prompt,
        instructions: task.instructions,
        row_index: rowIndex,
      };
      try {
        const data = await attemptRequest(task.url, payload, 1);
        handleStepSuccess(task.step, rowIndex, data);
      } catch (err) {
        if (cancelProcessing || (err && err.message === "aborted")) {
          break;
        }
        const errorText = err && err.responseText ? err.responseText : err;
        console.error(
          "Error processing row",
          rowIndex,
          "for",
          task.step,
          errorText
        );
      }
      if (cancelProcessing) {
        break;
      }
      await wait(300);
    }
  }

  async function processRows(indexes, mode, prompts) {
    cancelProcessing = false;
    for (let position = 0; position < indexes.length; position += 1) {
      if (cancelProcessing) {
        break;
      }
      const idx = indexes[position];
      await processRowPipeline(idx, mode, prompts);
      if (cancelProcessing) {
        break;
      }
      await wait(200);
    }
  }

  function gatherPrompts() {
    const sharedPrompt = $("#guess-shared-prompt").val() || "";
    return {
      step2Instructions: $("#guess-instructions").val() || "",
      step2Prompt: sharedPrompt,
      step3Instructions: $("#guess-step3-instructions").val() || "",
      step3Prompt: sharedPrompt,
    };
  }

  function getSelectedMode() {
    const position = parseInt($("#guess-process-slider").val(), 10);
    return modeForSliderPosition(position);
  }

  function setSelectedMode(mode) {
    const normalized =
      mode === PROCESS_MODES.STEP2 || mode === PROCESS_MODES.STEP3
        ? mode
        : PROCESS_MODES.BOTH;
    const sliderValue = sliderPositionForMode(normalized);
    $("#guess-process-slider").val(sliderValue);
    updateSliderLabels(normalized);
    localStorage.setItem(MODE_STORAGE_KEY, normalized);
  }

  $("#guess-process-single-btn").on("click", function () {
    const prompts = gatherPrompts();
    const rowIndex = parseInt($("#guess-row-index").val(), 10) || 0;
    processRows([rowIndex], getSelectedMode(), prompts);
  });

  $("#guess-process-range-btn").on("click", function () {
    const prompts = gatherPrompts();
    const start = parseInt($("#guess-start-index").val(), 10) || 0;
    const end = parseInt($("#guess-end-index").val(), 10) || 0;
    if (end < start) {
      alert("End index must be greater than or equal to start index");
      return;
    }
    const indexes = [];
    for (let i = start; i <= end; i += 1) {
      indexes.push(i);
    }
    processRows(indexes, getSelectedMode(), prompts);
  });

  $("#guess-cancel-step2").on("click", function () {
    cancelProcessing = true;
    if (currentRequest) {
      currentRequest.abort();
    }
  });

  $("#guess-extract-domain-btn").on("click", function () {
    const indexes = Object.keys(stepResults);
    if (!indexes.length) {
      alert("No results available to extract domains");
      return;
    }
    applyEmailDomainExtraction(indexes);
  });

  $("#guess-clear-step2").on("click", function () {
    stepResults = replaceStepResults({});
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem(STEP3_RESULTS_KEY);
    $("#guess-results-container").html("No results");
    $(document).trigger("guessStep2ResultsUpdated", [stepResults]);
  });

  $("#guess-process-slider").on("input change", function () {
    const position = parseInt($(this).val(), 10) || 0;
    const mode = modeForSliderPosition(position);
    setSelectedMode(mode);
  });

  $(".guess-process-labels span").on("click", function () {
    const mode = $(this).attr("data-value");
    setSelectedMode(mode);
  });

  $(document).on("guessStep2ResultsUpdated", function (event, latest) {
    if (latest && typeof latest === "object") {
      stepResults = replaceStepResults(latest);
    }
    renderResultsTable(stepResults);
  });

  $(document).ready(function () {
    const defaultStep2Instructions = `provide 3 publicly available email addresses for the company.

ONLY list the emails in a list ['e1@co.com, 'e2@co.com', ...]

NO NOT PROVIDE ANY OTHER DETAILS OR SUPPLEMENTAL INFORMATION`;
    if (!$("#guess-instructions").val()) {
      $("#guess-instructions").val(defaultStep2Instructions);
    }

    const defaultPrompt = "{business_name} {website}";
    const savedPrompt = localStorage.getItem(SHARED_PROMPT_KEY);
    if (savedPrompt && savedPrompt.trim() !== "") {
      $("#guess-shared-prompt").val(savedPrompt);
    } else {
      $("#guess-shared-prompt").val(defaultPrompt);
    }
    $("#guess-shared-prompt").on("input", function () {
      localStorage.setItem(SHARED_PROMPT_KEY, $(this).val());
    });
    LEGACY_PROMPT_KEYS.forEach(function (key) {
      localStorage.removeItem(key);
    });

    const defaultStep3Instructions = `You are a contact generation expert for sales.

For the business provided, find leadership contacts. Prioritize accuracy in your contacts.

Required output format must contain:
- firstname
- lastname
- role

⚠️ Do not include company name, emails, or any extra explanation.
⚠️ Output only the raw JSON.

Example input:
ABC Company

Example output:
[
  ["Andrew", "McRae", "Chief Executive Officer"],
  ["Jeffrey", "Hasham", "Chief Financial Officer"],
  ["Charles", "Reichmann", "Co-Founder & Managing Partner"],
  ["Jarrad", "Segal", "Co-Founder & Managing Partner"]
]`;
    const savedStep3Instructions = localStorage.getItem(
      STEP3_INSTRUCTIONS_KEY
    );
    if (savedStep3Instructions && savedStep3Instructions.trim() !== "") {
      $("#guess-step3-instructions").val(savedStep3Instructions);
    } else {
      $("#guess-step3-instructions").val(defaultStep3Instructions);
    }
    $("#guess-step3-instructions").on("input", function () {
      localStorage.setItem(STEP3_INSTRUCTIONS_KEY, $(this).val());
    });

    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    setSelectedMode(savedMode || PROCESS_MODES.BOTH);

    const savedResults = localStorage.getItem(RESULTS_KEY);
    if (savedResults) {
      try {
        stepResults = replaceStepResults(JSON.parse(savedResults));
      } catch (err) {
        console.error("Unable to parse saved Step 2 results", err);
        stepResults = replaceStepResults({});
      }
    }

    const legacyStep3 = localStorage.getItem(STEP3_RESULTS_KEY);
    if (legacyStep3) {
      try {
        const parsed = JSON.parse(legacyStep3);
        Object.keys(parsed).forEach(function (idx) {
          const row = parsed[idx];
          if (row && Object.prototype.hasOwnProperty.call(row, "raw_contacts")) {
            mergeRowData(idx, { raw_contacts: row.raw_contacts });
          }
        });
        localStorage.removeItem(STEP3_RESULTS_KEY);
        storeResults();
      } catch (err) {
        console.error("Unable to merge legacy Step 3 results", err);
      }
    }

    renderResultsTable(stepResults);
  });

  $(window).on("beforeunload", function () {
    const sharedPromptValue = $("#guess-shared-prompt").val();
    if (typeof sharedPromptValue === "string") {
      localStorage.setItem(SHARED_PROMPT_KEY, sharedPromptValue);
    }
    const step3InstructionsValue = $("#guess-step3-instructions").val();
    if (typeof step3InstructionsValue === "string") {
      localStorage.setItem(STEP3_INSTRUCTIONS_KEY, step3InstructionsValue);
    }
    if (Object.keys(stepResults).length) {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(stepResults));
    }
  });
})();
