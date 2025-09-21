var parsedContacts = [];
var LEGACY_CONTACTS_KEY = "saved_contacts";
var STEP2_RESULTS_KEY = "generate_contacts_simple_step2_results";
var LEGACY_STEP2_RESULTS_KEY = "generate_contacts_step2_results";

function ensureStep2Results() {
  if (window.step2Results && typeof window.step2Results === "object") {
    return window.step2Results;
  }
  var saved =
    localStorage.getItem(STEP2_RESULTS_KEY) ||
    localStorage.getItem(LEGACY_STEP2_RESULTS_KEY);
  if (saved) {
    try {
      window.step2Results = JSON.parse(saved);
      return window.step2Results;
    } catch (e) {
      console.error("Unable to parse Step 2 results", e);
    }
  }
  window.step2Results = {};
  return window.step2Results;
}

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
  var saved =
    localStorage.getItem("generate_contacts_simple_saved_contacts") ||
    localStorage.getItem(LEGACY_CONTACTS_KEY);
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
  var currentStep2Results = ensureStep2Results();
  if (Object.keys(currentStep2Results).length === 0) {
    alert("No Step 2 results to parse");
    return;
  }
  $.ajax({
    url: "/generate_contacts/simple/parse_contacts",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ results: Object.values(currentStep2Results) }),
    success: function (data) {
      parsedContacts = parsedContacts.concat(data);
      renderContactsTable(parsedContacts);
      localStorage.setItem("generate_contacts_simple_saved_contacts", JSON.stringify(parsedContacts));
      localStorage.removeItem(LEGACY_CONTACTS_KEY);
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#clear-step3").on("click", function () {
  $("#contacts-container").empty();
  parsedContacts = [];
  localStorage.removeItem("generate_contacts_simple_saved_contacts");
  localStorage.removeItem(LEGACY_CONTACTS_KEY);
});

$("#copy-step3-results").on("click", function () {
  copyTableToClipboard('#contacts-results-table');
});
