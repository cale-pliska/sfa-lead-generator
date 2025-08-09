var step2Results = [];
var activeRequest = null;
var isProcessingRange = false;
var rangeQueue = [];
var retryCounts = {};
var requestDelay = 300; // ms delay between row requests

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

function renderResultsTable(data) {
  if (!data.length) {
    $("#results-container").html("No results");
    return;
  }
  var businessKey = getBusinessNameKey(data[0]);
  var html =
    "<table><thead><tr>" +
    "<th>index</th><th>" +
    businessKey +
    "</th><th>result</th>" +
    "</tr></thead><tbody>";
  data.forEach(function (row) {
    if (!row) return;
    html +=
      "<tr>" +
      "<td>" +
      (row.index != null ? row.index : "") +
      "</td><td>" +
      (row[businessKey] || "") +
      "</td><td>" +
      row.result +
      "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  $("#results-container").html(html);
}


  $("#process-single-btn").on("click", function () {
    var prompt = $("#prompt").val();
    var instructions = $("#instructions").val();
    var rowIndex = parseInt($("#start-index").val()) || 0;
    activeRequest = $.ajax({
      url: "/find_businesses/process_single",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        prompt: prompt,
        instructions: instructions,
        row_index: rowIndex,
      }),
      success: function (data) {
        step2Results[rowIndex] = data;
        renderResultsTable(step2Results);
        $("#raw-output").text(JSON.stringify(data, null, 2));
        localStorage.setItem("saved_results", JSON.stringify(step2Results));
      },
      error: function (xhr, textStatus) {
        if (textStatus !== "abort") {
          alert(xhr.responseText);
        }
      },
      complete: function () {
        activeRequest = null;
      },
    });
  });

  $("#process-range-btn").on("click", function () {
    var prompt = $("#prompt").val();
    var instructions = $("#instructions").val();
    var startIndex = parseInt($("#start-index").val()) || 0;
    var endIndex = parseInt($("#end-index").val()) || startIndex;

    rangeQueue = [];
    for (var i = startIndex; i <= endIndex; i++) {
      rangeQueue.push(i);
    }
    isProcessingRange = true;

    function processNext() {
      if (!isProcessingRange || rangeQueue.length === 0) {
        isProcessingRange = false;
        activeRequest = null;
        return;
      }
      var rowIndex = rangeQueue.shift();

      activeRequest = $.ajax({
        url: "/find_businesses/process_single",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          prompt: prompt,
          instructions: instructions,
          row_index: rowIndex,
        }),
        success: function (data) {
          step2Results[rowIndex] = data;
          renderResultsTable(step2Results);
          $("#raw-output").text(JSON.stringify(data, null, 2));
          localStorage.setItem("saved_results", JSON.stringify(step2Results));
          retryCounts[rowIndex] = 0;
        },
        error: function (xhr, textStatus) {
          if (textStatus !== "abort") {
            console.error("Error processing row " + rowIndex + ":", xhr.responseText);
            retryCounts[rowIndex] = (retryCounts[rowIndex] || 0) + 1;
            if (retryCounts[rowIndex] <= 1) {
              rangeQueue.unshift(rowIndex);
            }
          }
        },
        complete: function () {
          activeRequest = null;
          if (isProcessingRange) {
            setTimeout(processNext, requestDelay);
          }
        },
      });
    }

    processNext();
  });

  $("#stop-execution-btn").on("click", function () {
    isProcessingRange = false;
    rangeQueue = [];
    if (activeRequest) {
      activeRequest.abort();
      activeRequest = null;
    }
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
  var defaultPrompt = "{Locations}";
  var savedPrompt = localStorage.getItem("find_businesses_step2_prompt");
  if (savedPrompt && savedPrompt.trim() !== "") {
    $("#prompt").val(savedPrompt);
  } else {
    $("#prompt").val(defaultPrompt);
  }
  $("#prompt").on("input", function () {
    localStorage.setItem("find_businesses_step2_prompt", $(this).val());
  });

  var saved = localStorage.getItem("saved_results");
  if (saved) {
    try {
      step2Results = JSON.parse(saved);
      renderResultsTable(step2Results);
    } catch (e) {
      console.error(e);
    }
  }

  $("#clear-step2").on("click", function () {
    step2Results = [];
    $("#results-container").empty();
    $("#raw-output").empty();
    $("#prompt").val(defaultPrompt);
    $("#instructions").val(defaultInstructions);
    localStorage.removeItem("saved_results");
    localStorage.removeItem("find_businesses_step2_prompt");
  });
});

$(window).on("beforeunload", function () {
  localStorage.setItem("find_businesses_step2_prompt", $("#prompt").val());
  localStorage.setItem("saved_results", JSON.stringify(step2Results));
});
