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

function updateRawOutput(rowIndex, data) {
  var container = $("#raw-output-container");
  var entryId = "raw-row-" + rowIndex;
  var $entry = $("#" + entryId);
  var pre = $("<pre></pre>").text(JSON.stringify(data, null, 2));
  if ($entry.length) {
    $entry.find("pre").replaceWith(pre);
  } else {
    var wrapper = $("<div></div>")
      .attr("id", entryId)
      .append("<h4>Row " + rowIndex + "</h4>")
      .append(pre);
    container.append(wrapper);
  }
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
          updateRawOutput(idx, data);
          localStorage.setItem("saved_results", JSON.stringify(step2Results));
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
      updateRawOutput(rowIndex, data);
      localStorage.setItem("saved_results", JSON.stringify(step2Results));
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
      Object.keys(step2Results).forEach(function (idx) {
        updateRawOutput(idx, step2Results[idx]);
      });
    } catch (e) {
      console.error(e);
    }
  }

  $("#clear-step2").on("click", function () {
    step2Results = {};
    $("#results-container").empty();
    $("#raw-output-container").empty();
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
