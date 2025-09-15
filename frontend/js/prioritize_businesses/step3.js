var parsedPriorities = [];

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
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tsv).catch(function () {
      fallbackCopy(tsv);
    });
  } else {
    fallbackCopy(tsv);
  }
}

function fallbackCopy(text) {
  var temp = $('<textarea>');
  $('body').append(temp);
  temp.val(text).select();
  document.execCommand('copy');
  temp.remove();
}

$(document).ready(function () {
  var saved = localStorage.getItem("prioritize_businesses_saved_priorities");
  if (saved) {
    try {
      parsedPriorities = JSON.parse(saved);
      renderPrioritiesTable(parsedPriorities);
    } catch (e) {
      console.error(e);
    }
  }
});

function renderPrioritiesTable(data) {
  if (!data.length) {
    $("#priorities-container").html("No data");
    return;
  }
  var cols = Object.keys(data[0]);
  cols.sort(function (a, b) {
    if (a === "business_name") return -1;
    if (b === "business_name") return 1;
    return 0;
  });
  var html = '<table id="priorities-results-table"><thead><tr>';
  cols.forEach(function (col) {
    html += "<th>" + col + "</th>";
  });
  html += "</tr></thead><tbody>";
  data.forEach(function (row) {
    html += "<tr>";
    cols.forEach(function (k) {
      var value = row[k];
      if (value === null || value === undefined) {
        value = "";
      }
      html += "<td>" + value + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  $("#priorities-container").html(html);
}

$("#parse-btn").on("click", function () {
  if (Object.keys(step2Results).length === 0) {
    alert("No Step 2 results to parse");
    return;
  }
  $.ajax({
    url: "/prioritize_businesses/parse_priorities",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ results: Object.values(step2Results) }),
    success: function (data) {
      parsedPriorities = parsedPriorities.concat(data);
      renderPrioritiesTable(parsedPriorities);
      localStorage.setItem(
        "prioritize_businesses_saved_priorities",
        JSON.stringify(parsedPriorities)
      );
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#clear-step3").on("click", function () {
  $("#priorities-container").empty();
  parsedPriorities = [];
  localStorage.removeItem("prioritize_businesses_saved_priorities");
});

$("#copy-step3-results").on("click", function () {
  copyTableToClipboard('#priorities-results-table');
});
