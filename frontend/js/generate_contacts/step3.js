var parsedContacts = [];

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
  var html = "<table><thead><tr>";
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

$("#save-setup-btn").on("click", function () {
  localStorage.setItem("saved_contacts", JSON.stringify(parsedContacts));
});

$("#clear-step3").on("click", function () {
  $("#contacts-container").empty();
  parsedContacts = [];
  localStorage.removeItem("saved_contacts");
});
