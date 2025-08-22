const RESULTS_KEY = "find_businesses_step2_results";
var step2Results = {};

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

  function processNext(pos) {
    if (pos >= indexes.length) return;
    var idx = indexes[pos];
    function send(attempt) {
      $.ajax({
        url: "/find_businesses/process_single",
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
          setTimeout(function () {
            processNext(pos + 1);
          }, 300);
        },
        error: function (xhr) {
          console.error("Error processing row", idx, xhr.responseText);
          if (attempt < 1) {
            setTimeout(function () {
              send(attempt + 1);
            }, 300);
          } else {
            setTimeout(function () {
              processNext(pos + 1);
            }, 300);
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
    url: "/find_businesses/process_single",
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
      alert(xhr.responseText);
    },
  });
});

$(document).ready(function () {
  var defaultInstructions = `You are a business finder expert for sales.

  For the location provided, find all types of mortgage broker businesses. search like a CIA pro to find every business in the area.

  Required output format:
Return results as a JSON array of objects.
Each object must contain:
- business_name
- website

DO NOT return any explanation, description, or formatting outside the JSON.`;
  $("#instructions").val(defaultInstructions);
  var defaultPrompt = "{Location}";
  var savedPrompt = localStorage.getItem("find_businesses_step2_prompt");
  if (savedPrompt && savedPrompt.trim() !== "") {
    $("#prompt").val(savedPrompt);
  } else {
    $("#prompt").val(defaultPrompt);
  }
  $("#prompt").on("input", function () {
    localStorage.setItem("find_businesses_step2_prompt", $(this).val());
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
  localStorage.setItem("find_businesses_step2_prompt", $("#prompt").val());
  localStorage.setItem(RESULTS_KEY, JSON.stringify(step2Results));
});
