const RESULTS_KEY = "prioritize_businesses_step2_results";
var step2Results = {};
var cancelProcessing = false;
var currentRequest = null;

function getBusinessNameKey(obj) {
  for (var key in obj) {
    var lower = key.toLowerCase();
    if (
      lower === "business name" ||
      lower === "business_name" ||
      (lower.includes("business") && lower.includes("name"))
    ) {
      return key;
    }
  }
  if (obj.hasOwnProperty("name")) return "name";
  return Object.keys(obj)[0];
}

function renderResultsTable(resultsObj) {
  var indexes = Object.keys(resultsObj).sort(function (a, b) {
    return parseInt(a) - parseInt(b);
  });
  if (!indexes.length) {
    $("#results-container").html("No results");
    return;
  }
  var firstRow = resultsObj[indexes[0]];
  var businessKey = getBusinessNameKey(firstRow);
  var html =
    "<table><thead><tr><th>index</th><th>" +
    businessKey +
    "</th><th>result</th></tr></thead><tbody>";
  indexes.forEach(function (idx) {
    var row = resultsObj[idx];
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
  $("#results-container").html(html);
}

$("#process-range-btn").on("click", function () {
  var prompt = $("#prompt").val();
  var instructions = $("#instructions").val();
  var start = parseInt($("#start-index").val()) || 0;
  var end = parseInt($("#end-index").val()) || 0;
  if (end < start) {
    alert("End index must be greater than or equal to start index");
    return;
  }
  var indexes = [];
  for (var i = start; i <= end; i++) {
    indexes.push(i);
  }

  cancelProcessing = false;

  function processNext(pos) {
    if (cancelProcessing || pos >= indexes.length) return;
    var idx = indexes[pos];
    function send(attempt) {
      currentRequest = $.ajax({
        url: "/prioritize_businesses/process_single",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          prompt: prompt,
          instructions: instructions,
          row_index: idx,
        }),
        success: function (data) {
          data.index = idx;
          step2Results[idx] = data;
          renderResultsTable(step2Results);
          localStorage.setItem(RESULTS_KEY, JSON.stringify(step2Results));
          if (!cancelProcessing) {
            setTimeout(function () {
              processNext(pos + 1);
            }, 300);
          }
        },
        error: function (xhr) {
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
        },
      });
    }
    send(0);
  }
  processNext(0);
});

$("#process-single-btn").on("click", function () {
  var prompt = $("#prompt").val();
  var instructions = $("#instructions").val();
  var rowIndex = parseInt($("#row-index").val()) || 0;
  $.ajax({
    url: "/prioritize_businesses/process_single",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      prompt: prompt,
      instructions: instructions,
      row_index: rowIndex,
    }),
    success: function (data) {
      data.index = rowIndex;
      step2Results[rowIndex] = data;
      renderResultsTable(step2Results);
      localStorage.setItem(RESULTS_KEY, JSON.stringify(step2Results));
    },
    error: function (xhr) {
      console.error("Error processing row", rowIndex, xhr.responseText);
    },
  });
});

$("#cancel-step2").on("click", function () {
  cancelProcessing = true;
  if (currentRequest) {
    currentRequest.abort();
  }
});

$(document).ready(function () {
  var defaultInstructions = `You are a contact generation expert for sales.

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
  $("#instructions").val(defaultInstructions);
  var defaultPrompt = "{business_name} {website}";
  var savedPrompt = localStorage.getItem("prioritize_businesses_step2_prompt");
  if (savedPrompt && savedPrompt.trim() !== "") {
    $("#prompt").val(savedPrompt);
  } else {
    $("#prompt").val(defaultPrompt);
  }
  $("#prompt").on("input", function () {
    localStorage.setItem("prioritize_businesses_step2_prompt", $(this).val());
  });

  var saved = localStorage.getItem(RESULTS_KEY);
  if (saved) {
    try {
      step2Results = JSON.parse(saved);
      renderResultsTable(step2Results);
    } catch (e) {
      console.error(e);
    }
  }

  $("#clear-step2").on("click", function () {
    step2Results = {};
    $("#results-container").empty();
    localStorage.removeItem(RESULTS_KEY);
  });
});

$(window).on("beforeunload", function () {
  localStorage.setItem("prioritize_businesses_step2_prompt", $("#prompt").val());
  localStorage.setItem(RESULTS_KEY, JSON.stringify(step2Results));
});

