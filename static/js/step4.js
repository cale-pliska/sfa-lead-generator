var step4Results = [];

$(document).ready(function () {
  var saved = localStorage.getItem("saved_step4_results");
  if (saved) {
    try {
      step4Results = JSON.parse(saved);
      renderStep4ResultsTable(step4Results);
    } catch (e) {
      console.error(e);
    }
  }
});

function renderStep4ResultsTable(data) {
  if (!data.length) {
    $("#step4-results-container").html("No results");
    return;
  }
  var cols = Object.keys(data[0]);
  var html = "<table><thead><tr>";
  cols.forEach(function (col) {
    html += "<th>" + col + "</th>";
  });
  html += "</tr></thead><tbody>";
  data.forEach(function (row) {
    html += "<tr>";
    cols.forEach(function (c) {
      html += "<td>" + (row[c] || "") + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  $("#step4-results-container").html(html);
}

function addOrUpdateStep4ResultRow(rowData, index) {
  var $table = $("#step4-results-container table");
  if (!$table.length) {
    renderStep4ResultsTable([rowData]);
    return;
  }
  var cols = Object.keys(rowData);
  var rowHtml = "<tr>";
  cols.forEach(function (c) {
    rowHtml += "<td>" + (rowData[c] || "") + "</td>";
  });
  rowHtml += "</tr>";
  var $rows = $table.find("tbody tr");
  if (index < $rows.length) {
    $rows.eq(index).replaceWith(rowHtml);
  } else {
    $table.find("tbody").append(rowHtml);
  }
}

$("#process-step4-btn").on("click", function () {
  if (!parsedContacts.length) {
    alert("No parsed contacts to process");
    return;
  }
  var prompt = $("#prompt-step4").val();
  var instructions = $("#instructions-step4").val();
  $.ajax({
    url: "/step4/process",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      prompt: prompt,
      instructions: instructions,
      contacts: parsedContacts,
    }),
    success: function (data) {
      step4Results = data;
      renderStep4ResultsTable(data);
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#process-single-step4-btn").on("click", function () {
  if (!parsedContacts.length) {
    alert("No parsed contacts to process");
    return;
  }
  var prompt = $("#prompt-step4").val();
  var instructions = $("#instructions-step4").val();
  var rowIndex = parseInt($("#row-index-step4").val()) || 0;
  if (rowIndex < 0 || rowIndex >= parsedContacts.length) {
    alert("Invalid row index");
    return;
  }
  $.ajax({
    url: "/step4/process_single",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      prompt: prompt,
      instructions: instructions,
      contact: parsedContacts[rowIndex],
    }),
    success: function (data) {
      step4Results[rowIndex] = data;
      addOrUpdateStep4ResultRow(data, rowIndex);
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#save-setup-btn").on("click", function () {
  localStorage.setItem("saved_step4_results", JSON.stringify(step4Results));
});
