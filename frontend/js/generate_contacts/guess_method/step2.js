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

  function renderResultsTable(resultsObj) {
    const indexes = Object.keys(resultsObj).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    if (!indexes.length) {
      $("#guess-results-container").html("No results");
      return;
    }
    const firstRow = resultsObj[indexes[0]];
    const businessKey = getBusinessNameKey(firstRow);
    let html =
      "<table><thead><tr><th>index</th><th>" +
      businessKey +
      "</th><th>result</th></tr></thead><tbody>";
    indexes.forEach(function (idx) {
      const row = resultsObj[idx];
      html +=
        "<tr><td>" +
        idx +
        "</td><td>" +
        (row[businessKey] || "") +
        "</td><td>" +
        row.result +
        "</td></tr>";
    });
    html += "</tbody></table>";
    $("#guess-results-container").html(html);
  }

  function storeResults() {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(step2Results));
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

  $(document).ready(function () {
    const defaultInstructions = `You are a contact generation expert for sales.

For the business provided, find all key contacts. Prioritize:
– Founders
– COOs
– Heads of Operations
– Other senior decision-makers

Required output format:
Return results as a JSON array of objects.
Each object must contain:
- firstname
- lastname
- role
- email (if you can't find their email directly guess it)

⚠️ Do not include company name, emails, or any extra explanation.
⚠️ Output only the raw JSON.

Example input:
ABC Company

Example output:
[
  { "firstname": "John", "lastname": "Smith", "role": "Founder", "email": "john.smith@abccompany.com" },
  { "firstname": "Jane", "lastname": "Doe", "role": "COO", "email": "jane.doe@abccompany.com" },
  { "firstname": "Michael", "lastname": "Johnson", "role": "Head of Operations", "email": "michael.johnson@abccompany.com" },
  { "firstname": "Ryan", "lastname": "Patel", "role": "Founder", "email": "ryan.patel@abccompany.com" },
  { "firstname": "Laura", "lastname": "Nguyen", "role": "VP of Operations", "email": "laura.nguyen@abccompany.com" },
  { "firstname": "Carlos", "lastname": "Rivera", "role": "COO", "email": "carlos.rivera@abccompany.com" }
]`;
    $("#guess-instructions").val(defaultInstructions);
    const defaultPrompt = "{business_name} {website}";
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
      } catch (e) {
        console.error(e);
      }
    }

    $("#guess-clear-step2").on("click", function () {
      step2Results = replaceStep2Results({});
      $("#guess-results-container").empty();
      localStorage.removeItem(RESULTS_KEY);
    });
  });

  $(window).on("beforeunload", function () {
    const promptValue = $("#guess-prompt").val();
    localStorage.setItem(PROMPT_KEY, promptValue);
    storeResults();
  });
})();
