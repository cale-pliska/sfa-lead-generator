(function () {
  const RESULTS_KEY = "generate_contacts_guess_step2_results";
  const PROMPT_KEY = "generate_contacts_guess_step2_prompt";

  function replaceStep2Results(nextResults) {
    window.guessStep2Results = nextResults || {};
    return window.guessStep2Results;
  }

  let step2Results = replaceStep2Results(window.guessStep2Results || {});
  let cancelProcessing = false;
  let currentRequest = null;

  function getBusinessNameKey(obj) {
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
    if (Object.prototype.hasOwnProperty.call(obj, "name")) return "name";
    return Object.keys(obj)[0];
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
      return row && row.raw_contacts !== undefined;
    });
    if (hasRawContacts && columns.indexOf("raw_contacts") === -1) {
      columns.push("raw_contacts");
    }
    let html = "<table><thead><tr><th>index</th>";
    columns.forEach(function (col) {
      html += "<th>" + col + "</th>";
    });
    html += "</tr></thead><tbody>";
    indexes.forEach(function (idx) {
      const row = resultsObj[idx];
      html += "<tr><td>" + idx + "</td>";
      columns.forEach(function (col) {
        const value = row ? row[col] : "";
        html += "<td>" + formatValue(value) + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    $("#guess-results-container").html(html);
  }

  function storeResults() {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(step2Results));
    $(document).trigger("guessStep2ResultsUpdated");
  }

  function runSingleRequest(payload, onSuccess, onError) {
    currentRequest = $.ajax({
      url: "/generate_contacts/guess/process_single",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
      success: onSuccess,
      error: onError,
    });
  }

  $("#guess-process-range-btn").on("click", function () {
    const prompt = $("#guess-prompt").val();
    const instructions = $("#guess-instructions").val();
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

    cancelProcessing = false;

    function processNext(pos) {
      if (cancelProcessing || pos >= indexes.length) return;
      const idx = indexes[pos];
      function send(attempt) {
        runSingleRequest(
          {
            prompt: prompt,
            instructions: instructions,
            row_index: idx,
          },
          function (data) {
            data.index = idx;
            step2Results[idx] = data;
            renderResultsTable(step2Results);
            storeResults();
            if (!cancelProcessing) {
              setTimeout(function () {
                processNext(pos + 1);
              }, 300);
            }
          },
          function (xhr) {
            console.error("Error processing row", idx, xhr.responseText);
            if (!cancelProcessing) {
              if (attempt < 1) {
                setTimeout(function () {
                  send(attempt + 1);
                }, 300);
              } else {
                setTimeout(function () {
                  processNext(pos + 1);
                }, 300);
              }
            }
          }
        );
      }
      send(0);
    }
    processNext(0);
  });

  $("#guess-process-single-btn").on("click", function () {
    const prompt = $("#guess-prompt").val();
    const instructions = $("#guess-instructions").val();
    const rowIndex = parseInt($("#guess-row-index").val(), 10) || 0;
    runSingleRequest(
      {
        prompt: prompt,
        instructions: instructions,
        row_index: rowIndex,
      },
      function (data) {
        data.index = rowIndex;
        step2Results[rowIndex] = data;
        renderResultsTable(step2Results);
        storeResults();
      },
      function (xhr) {
        console.error("Error processing row", rowIndex, xhr.responseText);
      }
    );
  });

  $("#guess-cancel-step2").on("click", function () {
    cancelProcessing = true;
    if (currentRequest) {
      currentRequest.abort();
    }
  });

  $("#guess-extract-domain-btn").on("click", function () {
    const indexes = Object.keys(step2Results);
    if (!indexes.length) {
      alert("No Step 2 results to process");
      return;
    }
    indexes.forEach(function (idx) {
      const row = step2Results[idx];
      if (!row) {
        return;
      }
      row.email_domain = extractDomainsFromValue(row.raw_public_emails);
    });
    renderResultsTable(step2Results);
    storeResults();
  });

  $(document).ready(function () {
    const defaultInstructions = `You are a research assistant tasked with locating public-facing email inboxes for a company.

Given the business name, location, and website, find three publicly listed email addresses that a prospect could use to reach the company. Prioritize shared inboxes such as info@, contact@, support@, hello@, or similar addresses that appear on the website or reputable directories.

Return exactly three email strings in a JSON array. If fewer than three unique emails are available, repeat the best available emails so the array still contains three entries.

Output format example:
["info@example.com", "support@example.com", "contact@example.com"]

Respond with only the JSON array.`;
    $("#guess-instructions").val(defaultInstructions);
    const defaultPrompt = "{business_name} {location} {website}";
    const savedPrompt = localStorage.getItem(PROMPT_KEY);
    if (savedPrompt && savedPrompt.trim() !== "") {
      $("#guess-prompt").val(savedPrompt);
    } else {
      $("#guess-prompt").val(defaultPrompt);
    }
    $("#guess-prompt").on("input", function () {
      const value = $(this).val();
      localStorage.setItem(PROMPT_KEY, value);
    });

    const saved = localStorage.getItem(RESULTS_KEY);
    if (saved) {
      try {
        step2Results = replaceStep2Results(JSON.parse(saved));
        renderResultsTable(step2Results);
        $(document).trigger("guessStep2ResultsUpdated");
      } catch (e) {
        console.error(e);
      }
    }

    $(document).on("guessStep2ResultsUpdated", function () {
      renderResultsTable(step2Results);
    });

    $("#guess-clear-step2").on("click", function () {
      step2Results = replaceStep2Results({});
      $("#guess-results-container").empty();
      localStorage.removeItem(RESULTS_KEY);
      $(document).trigger("guessStep2ResultsUpdated");
    });
  });

  $(window).on("beforeunload", function () {
    const promptValue = $("#guess-prompt").val();
    localStorage.setItem(PROMPT_KEY, promptValue);
    storeResults();
  });
})();
