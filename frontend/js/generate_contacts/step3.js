var parsedContacts = [];

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
  var saved = localStorage.getItem("saved_contacts");
  if (saved) {
    try {
      parsedContacts = JSON.parse(saved);
      renderContactsTable(parsedContacts);
    } catch (e) {
      console.error(e);
    }
  }
});

function renderContactsTable(data) {
  if (!data.length) {
    $("#contacts-container").html("No contacts");
    return;
  }
  var cols = Object.keys(data[0]);
  cols.sort(function (a, b) {
    if (a === "business_name") return -1;
    if (b === "business_name") return 1;
    return 0;
  });
  var html = '<table id="contacts-results-table"><thead><tr>';
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
    url: "/parse_contacts",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ results: Object.values(step2Results) }),
    success: function (data) {
      parsedContacts = parsedContacts.concat(data);
      renderContactsTable(parsedContacts);
      localStorage.setItem("saved_contacts", JSON.stringify(parsedContacts));
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#clear-step3").on("click", function () {
  $("#contacts-container").empty();
  parsedContacts = [];
  localStorage.removeItem("saved_contacts");
});

$("#copy-step3-results").on("click", function () {
  copyTableToClipboard('#contacts-results-table');
});
