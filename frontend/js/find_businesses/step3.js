var parsedBusinesses = [];

function copyTableToClipboard(selector) {
  var table = $(selector);
  if (table.length === 0) {
    alert('No data to copy.');
    return;
  }
  var rows = [];
  table.find('tr').each(function () {
    var cols = [];
    $(this).find('th,td').each(function () {
      cols.push($(this).text());
    });
    rows.push(cols.join('\t'));
  });
  var tsv = rows.join('\n');
  navigator.clipboard.writeText(tsv);
}

$(document).ready(function () {
  var saved = localStorage.getItem("saved_businesses");
  if (saved) {
    try {
      parsedBusinesses = JSON.parse(saved);
      renderBusinessesTable(parsedBusinesses);
    } catch (e) {
      console.error(e);
    }
  }
});

function renderBusinessesTable(data) {
  if (!data.length) {
    $("#contacts-container").html("No businesses");
    return;
  }
  var cols = Object.keys(data[0]);
  cols.sort(function (a, b) {
    if (a === "business_name") return -1;
    if (b === "business_name") return 1;
    return 0;
  });
  var html = '<table id="businesses-results-table"><thead><tr>';
  cols.forEach(function (col) {
    html += "<th>" + col + "</th>";
  });
  html += "</tr></thead><tbody>";
  data.forEach(function (row) {
    html += "<tr>";
    cols.forEach(function (k) {
      html += "<td>" + (row[k] || "") + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  $("#contacts-container").html(html);
}

$("#parse-btn").on("click", function () {
  if (Object.keys(step2Results).length === 0) {
    alert("No Step 2 results to parse");
    return;
  }
  $.ajax({
    url: "/find_businesses/parse_contacts",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ results: Object.values(step2Results) }),
    success: function (data) {
      parsedBusinesses = parsedBusinesses.concat(data);
      renderBusinessesTable(parsedBusinesses);
      localStorage.setItem("saved_businesses", JSON.stringify(parsedBusinesses));
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#clear-step3").on("click", function () {
  $("#contacts-container").empty();
  parsedBusinesses = [];
  localStorage.removeItem("saved_businesses");
});

$("#copy-step3-results").on("click", function () {
  copyTableToClipboard('#businesses-results-table');
});
