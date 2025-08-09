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

function renderResultsTable(data) {
  if (!data.length) {
    $("#results-container").html("No results");
    return;
  }
  var businessKey = getBusinessNameKey(data[0]);
  var html =
    "<table><thead><tr><th>index</th><th>" +
    businessKey +
    "</th><th>result</th></tr></thead><tbody>";
  data.forEach(function (row) {
    html +=
      "<tr><td>" +
      row.index +
      "</td><td>" +
      (row[businessKey] || "") +
      "</td><td>" +
      row.result +
      "</td></tr>";
  });
  html += "</tbody></table>";
  $("#results-container").html(html);
}

function appendRawOutput(rowIndex, data) {
  var container = $("#raw-output");
  var id = "raw-row-" + rowIndex;
  var html =
    '<div id="' +
    id +
    '"><h4>Row ' +
    rowIndex +
    '</h4><pre>' +
    JSON.stringify(data, null, 2) +
    "</pre></div>";
  var existing = container.find("#" + id);
  if (existing.length) {
    existing.replaceWith(html);
  } else {
    container.append(html);
  }
}

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
      var rows = Object.keys(step2Results)
        .sort(function (a, b) {
          return a - b;
        })
        .map(function (k) {
          return step2Results[k];
        });
      renderResultsTable(rows);
      appendRawOutput(rowIndex, data);
      localStorage.setItem("saved_results", JSON.stringify(step2Results));
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
  });

  $("#process-range-btn").on("click", function () {
    var prompt = $("#prompt").val();
    var instructions = $("#instructions").val();
    var startIndex = parseInt($("#start-index").val()) || 0;
    var endIndex = parseInt($("#end-index").val()) || startIndex;
    var indexes = [];
    for (var i = startIndex; i <= endIndex; i++) {
      indexes.push(i);
    }

    function processNext(pos) {
      if (pos >= indexes.length) return;
      var rowIndex = indexes[pos];
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
          var rows = Object.keys(step2Results)
            .sort(function (a, b) {
              return a - b;
            })
            .map(function (k) {
              return step2Results[k];
            });
          renderResultsTable(rows);
          appendRawOutput(rowIndex, data);
          localStorage.setItem("saved_results", JSON.stringify(step2Results));
          setTimeout(function () {
            processNext(pos + 1);
          }, 300);
        },
        error: function (xhr) {
          console.error("Error processing row", rowIndex, xhr);
          setTimeout(function () {
            processNext(pos + 1);
          }, 300);
        },
      });
    }

    processNext(0);
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
      if (Array.isArray(step2Results)) {
        var temp = {};
        step2Results.forEach(function (row, idx) {
          if (row) {
            row.index = row.index || idx;
            temp[row.index] = row;
            appendRawOutput(row.index, row);
          }
        });
        step2Results = temp;
      } else {
        for (var key in step2Results) {
          if (step2Results.hasOwnProperty(key)) {
            appendRawOutput(key, step2Results[key]);
          }
        }
      }
      var rows = Object.keys(step2Results)
        .sort(function (a, b) {
          return a - b;
        })
        .map(function (k) {
          return step2Results[k];
        });
      renderResultsTable(rows);
    } catch (e) {
      console.error(e);
    }
  }

  $("#clear-step2").on("click", function () {
    step2Results = {};
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
