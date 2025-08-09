var step2Results = [];

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
    "<th>" +
    businessKey +
    "</th><th>result</th>" +
    "</tr></thead><tbody>";
  data.forEach(function (row) {
    html +=
      "<tr>" +
      "<td>" +
      (row[businessKey] || "") +
      "</td>" +
      "<td>" +
      row.result +
      "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  $("#results-container").html(html);
}

function addOrUpdateResultRow(rowData, index) {
  var $table = $("#results-container table");
  if (!$table.length) {
    renderResultsTable([rowData]);
    return;
  }
  var businessKey = getBusinessNameKey(rowData);
  var rowHtml =
    "<tr><td>" +
    (rowData[businessKey] || "") +
    "</td><td>" +
    rowData.result +
    "</td></tr>";
  var $rows = $table.find("tbody tr");
  if (index < $rows.length) {
    $rows.eq(index).replaceWith(rowHtml);
  } else {
    $table.find("tbody").append(rowHtml);
  }
}

  $("#process-btn").on("click", function () {
    var prompt = $("#prompt").val();
    var instructions = $("#instructions").val();
    $.ajax({
      url: "/find_businesses/process",
      method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ prompt: prompt, instructions: instructions }),
    success: function (data) {
      console.log("Raw data from backend:", data);
      step2Results = data;
      renderResultsTable(data);
      localStorage.setItem("saved_results", JSON.stringify(step2Results));
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
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
      step2Results[rowIndex] = data;
      addOrUpdateResultRow(data, rowIndex);
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
    } catch (e) {
      console.error(e);
    }
  }

  $("#clear-step2").on("click", function () {
    step2Results = [];
    $("#results-container").empty();
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
