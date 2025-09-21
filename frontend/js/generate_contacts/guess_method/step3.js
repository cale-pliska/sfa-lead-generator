(function () {
  const STEP2_RESULTS_KEY = "generate_contacts_guess_step2_results";
  const STEP3_RESULTS_KEY = "generate_contacts_guess_step3_results";
  const STEP3_PROMPT_KEY = "generate_contacts_guess_step3_prompt";
  const STEP3_INSTRUCTIONS_KEY = "generate_contacts_guess_step3_instructions";

  let step3Results = {};
  let cancelProcessing = false;
  let currentRequest = null;

  function ensureStep2Results() {
    if (window.guessStep2Results && typeof window.guessStep2Results === "object") {
      return window.guessStep2Results;
    }
    const saved = localStorage.getItem(STEP2_RESULTS_KEY);
    if (saved) {
      try {
        window.guessStep2Results = JSON.parse(saved);
        return window.guessStep2Results;
      } catch (err) {
        console.error("Unable to parse Step 2 results", err);
      }
    }
    window.guessStep2Results = {};
    return window.guessStep2Results;
  }

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

  function fallbackCopy(text) {
    const temp = $("<textarea>");
    $("body").append(temp);
    temp.val(text).select();
    document.execCommand("copy");
    temp.remove();
  }

  function copyTableToClipboard(selector) {
    const table = $(selector);
    if (table.length === 0) {
      alert("No data to copy.");
      return;
    }
    const rows = [];
    table.find("tr").each(function () {
      const cols = [];
      $(this)
        .find("th,td")
        .each(function () {
          cols.push($(this).text());
        });
      rows.push(cols.join("\t"));
    });
    const tsv = rows.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).catch(function () {
        fallbackCopy(tsv);
      });
    } else {
      fallbackCopy(tsv);
    }
  }

  function storeStep3Results() {
    localStorage.setItem(STEP3_RESULTS_KEY, JSON.stringify(step3Results));
  }

  function persistStep2Results(updatedResults) {
    window.guessStep2Results = updatedResults;
    localStorage.setItem(STEP2_RESULTS_KEY, JSON.stringify(updatedResults));
    $(document).trigger("guessStep2ResultsUpdated");
  }

  function buildCombinedRows() {
    const step2Data = ensureStep2Results();
    const indexes = Object.keys(step2Data).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    return indexes.map(function (idx) {
      const baseRow = step2Data[idx] || {};
      const supplemental = step3Results[idx] || {};
      const combined = { ...baseRow };
      if (supplemental && Object.prototype.hasOwnProperty.call(supplemental, "raw_contacts")) {
        combined.raw_contacts = supplemental.raw_contacts;
      }
      combined.index = idx;
      return combined;
    });
  }

  function renderCombinedTable() {
    const rows = buildCombinedRows();
    if (!rows.length) {
      $("#guess-step3-results-container").html("No Step 2 results available");
      return;
    }
    const businessKey = getBusinessNameKey(rows[0]);
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
    if (columns.indexOf("raw_contacts") === -1) {
      columns.push("raw_contacts");
    }
    let html = '<table id="guess-step3-results-table"><thead><tr><th>index</th>';
    columns.forEach(function (col) {
      html += "<th>" + col + "</th>";
    });
    html += "</tr></thead><tbody>";
    rows.forEach(function (row) {
      html += "<tr><td>" + row.index + "</td>";
      columns.forEach(function (col) {
        const value = row[col];
        html += "<td>" + formatValue(value) + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    $("#guess-step3-results-container").html(html);
  }

  function runStep3Request(payload, onSuccess, onError) {
    currentRequest = $.ajax({
      url: "/generate_contacts/guess/step3/process_single",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
      success: onSuccess,
      error: onError,
    });
  }

  function handleSuccess(idx, data) {
    const normalizedRow = data && typeof data === "object" ? data : {};
    const rawContacts = Object.prototype.hasOwnProperty.call(normalizedRow, "raw_contacts")
      ? normalizedRow.raw_contacts
      : normalizedRow.result;
    step3Results[idx] = { raw_contacts: rawContacts };
    const step2Data = ensureStep2Results();
    const existingRow = step2Data[idx] || {};
    const mergedRow = { ...existingRow, ...normalizedRow, raw_contacts: rawContacts, index: idx };
    step2Data[idx] = mergedRow;
    persistStep2Results(step2Data);
    storeStep3Results();
    renderCombinedTable();
  }

  function processRange(start, end, prompt, instructions) {
    if (end < start) {
      alert("End index must be greater than or equal to start index");
      return;
    }
    const indexes = [];
    for (let i = start; i <= end; i += 1) {
      indexes.push(i);
    }
    cancelProcessing = false;

    function processNext(position) {
      if (cancelProcessing || position >= indexes.length) {
        return;
      }
      const idx = indexes[position];
      function send(attempt) {
        runStep3Request(
          {
            prompt: prompt,
            instructions: instructions,
            row_index: idx,
          },
          function (response) {
            handleSuccess(idx, response);
            if (!cancelProcessing) {
              setTimeout(function () {
                processNext(position + 1);
              }, 300);
            }
          },
          function (xhr) {
            console.error("Error processing Step 3 row", idx, xhr.responseText);
            if (!cancelProcessing) {
              if (attempt < 1) {
                setTimeout(function () {
                  send(attempt + 1);
                }, 300);
              } else {
                setTimeout(function () {
                  processNext(position + 1);
                }, 300);
              }
            }
          }
        );
      }
      send(0);
    }

    processNext(0);
  }

  $(document).ready(function () {
    const savedStep3 = localStorage.getItem(STEP3_RESULTS_KEY);
    if (savedStep3) {
      try {
        step3Results = JSON.parse(savedStep3);
      } catch (err) {
        console.error("Unable to parse Step 3 results", err);
        step3Results = {};
      }
    }

    const defaultInstructions = `You are a sales research assistant.

Given the business name, location, and website, identify every contact who matches the operations leadership profile (e.g., COO, Head of Operations, Director of Operations, Operations Manager, or similar senior roles). For each matching contact, provide their first name, last name, and role.

Return the contacts as a JSON array of arrays in the form [["First", "Last", "Role"], ...]. Only include contacts that match the profile and respond with just the JSON array.`;
    const savedInstructions = localStorage.getItem(STEP3_INSTRUCTIONS_KEY);
    if (savedInstructions && savedInstructions.trim() !== "") {
      $("#guess-step3-instructions").val(savedInstructions);
    } else {
      $("#guess-step3-instructions").val(defaultInstructions);
    }
    $("#guess-step3-instructions").on("input", function () {
      localStorage.setItem(STEP3_INSTRUCTIONS_KEY, $(this).val());
    });

    const defaultPrompt = "{business_name} {location} {website}";
    const savedPrompt = localStorage.getItem(STEP3_PROMPT_KEY);
    if (savedPrompt && savedPrompt.trim() !== "") {
      $("#guess-step3-prompt").val(savedPrompt);
    } else {
      $("#guess-step3-prompt").val(defaultPrompt);
    }
    $("#guess-step3-prompt").on("input", function () {
      localStorage.setItem(STEP3_PROMPT_KEY, $(this).val());
    });

    renderCombinedTable();

    $(document).on("guessStep2ResultsUpdated", function () {
      renderCombinedTable();
    });

    $("#guess-step3-process-single-btn").on("click", function () {
      const prompt = $("#guess-step3-prompt").val();
      const instructions = $("#guess-step3-instructions").val();
      const rowIndex = parseInt($("#guess-step3-row-index").val(), 10) || 0;
      cancelProcessing = false;
      runStep3Request(
        {
          prompt: prompt,
          instructions: instructions,
          row_index: rowIndex,
        },
        function (data) {
          handleSuccess(rowIndex, data);
        },
        function (xhr) {
          console.error("Error processing Step 3 row", rowIndex, xhr.responseText);
        }
      );
    });

    $("#guess-step3-process-range-btn").on("click", function () {
      const prompt = $("#guess-step3-prompt").val();
      const instructions = $("#guess-step3-instructions").val();
      const start = parseInt($("#guess-step3-start-index").val(), 10) || 0;
      const end = parseInt($("#guess-step3-end-index").val(), 10) || 0;
      processRange(start, end, prompt, instructions);
    });

    $("#guess-step3-cancel").on("click", function () {
      cancelProcessing = true;
      if (currentRequest) {
        currentRequest.abort();
      }
    });

    $("#guess-step3-clear").on("click", function () {
      step3Results = {};
      localStorage.removeItem(STEP3_RESULTS_KEY);
      const step2Data = ensureStep2Results();
      Object.keys(step2Data).forEach(function (idx) {
        if (step2Data[idx]) {
          delete step2Data[idx].raw_contacts;
        }
      });
      persistStep2Results(step2Data);
      renderCombinedTable();
    });

    $("#guess-step3-copy-results").on("click", function () {
      copyTableToClipboard("#guess-step3-results-table");
    });
  });

  $(window).on("beforeunload", function () {
    storeStep3Results();
    const promptValue = $("#guess-step3-prompt").val();
    const instructionsValue = $("#guess-step3-instructions").val();
    if (typeof promptValue === "string") {
      localStorage.setItem(STEP3_PROMPT_KEY, promptValue);
    }
    if (typeof instructionsValue === "string") {
      localStorage.setItem(STEP3_INSTRUCTIONS_KEY, instructionsValue);
    }
  });
})();
