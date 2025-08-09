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
    url: "/process",
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
    url: "/process_single",
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
  var defaultInstructions = `You are a contact generation expert for sales.

For the business provided, find all key contacts. Prioritize:  
– Founders  
– COOs  
– Heads of Operations  
– Other senior decision-makers  

Required output format:  
Return results as a JSON array of objects.  
Each object must contain:  
- firstname  
- lastname  
- role
- email (if you can't find their email directly guess it)

⚠️ Do not include company name, emails, or any extra explanation.  
⚠️ Output only the raw JSON.

Example input:  
ABC Company

Example output:
[
  { "firstname": "John", "lastname": "Smith", "role": "Founder", "email": "john.smith@abccompany.com" },
  { "firstname": "Jane", "lastname": "Doe", "role": "COO", "email": "jane.doe@abccompany.com" },
  { "firstname": "Michael", "lastname": "Johnson", "role": "Head of Operations", "email": "michael.johnson@abccompany.com" },
  { "firstname": "Ryan", "lastname": "Patel", "role": "Founder", "email": "ryan.patel@abccompany.com" },
  { "firstname": "Laura", "lastname": "Nguyen", "role": "VP of Operations", "email": "laura.nguyen@abccompany.com" },
  { "firstname": "Carlos", "lastname": "Rivera", "role": "COO", "email": "carlos.rivera@abccompany.com" }
]`;
  $("#instructions").val(defaultInstructions);
  var savedPrompt = localStorage.getItem("generate_contacts_step2_prompt");
  if (savedPrompt && savedPrompt.trim() !== "") {
    $("#prompt").val(savedPrompt);
  } else {
    $("#prompt").val("{Business_Name}");
  }
  $("#prompt").on("input", function () {
    localStorage.setItem("generate_contacts_step2_prompt", $(this).val());
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
});

$(window).on("beforeunload", function () {
  localStorage.setItem("generate_contacts_step2_prompt", $("#prompt").val());
  localStorage.setItem("saved_results", JSON.stringify(step2Results));
});
