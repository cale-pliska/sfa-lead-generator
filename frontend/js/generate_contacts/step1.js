const STORAGE_KEYS = {
  tsv: "generate_contacts_step1_tsv",
  instructions: "generate_contacts_step1_instructions",
  prompt: "generate_contacts_step1_prompt",
};

function loadSavedSetup() {
  const savedTsv = localStorage.getItem(STORAGE_KEYS.tsv) || "";
  const savedInstructions =
    localStorage.getItem(STORAGE_KEYS.instructions) || "";
  const savedPrompt = localStorage.getItem(STORAGE_KEYS.prompt) || "";

  return { savedTsv, savedInstructions, savedPrompt };
}

function autoPopulateFromSaved() {
  const setup = loadSavedSetup();
  let tsvData = setup.savedTsv;

  if (!tsvData) {
    tsvData =
      "business_name\tLocation\tPopulation\twebsite\n" +
      "Origin Point\tmadison wi Downtown\t25000\thttps://www.originpoint.com/branches/wi/madison";
  }

  $("#tsv-input").val(tsvData);
  $("#instructions").val(setup.savedInstructions);
  $("#prompt").val(setup.savedPrompt);

  if (tsvData) {
    const formData = new FormData();
    formData.append("tsv_text", tsvData);
    $.ajax({
      url: "/upload",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        renderDataTable(JSON.parse(data));
      },
      error: function (xhr) {
        console.error(xhr.responseText);
      },
    });
  }
}

function autoSave() {
  localStorage.setItem(STORAGE_KEYS.tsv, $("#tsv-input").val());
  localStorage.setItem(STORAGE_KEYS.instructions, $("#instructions").val());
  localStorage.setItem(STORAGE_KEYS.prompt, $("#prompt").val());
}

$(document).ready(function () {
  autoPopulateFromSaved();
  $("#tsv-input, #instructions, #prompt").on("input", autoSave);
  $(window).on("beforeunload", autoSave);
});

$("#upload-form").on("submit", function (e) {
  e.preventDefault();
  var formData = new FormData(this);
  $.ajax({
    url: "/upload",
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (data) {
      renderDataTable(JSON.parse(data));
      autoSave();
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

$("#clear-step1").on("click", function () {
  $("#table-container").empty();
});

function renderDataTable(data) {
  if (!data.length) {
    $("#table-container").html("No rows");
    return;
  }
  var html = "<table><thead><tr><th>index</th>";
  Object.keys(data[0]).forEach(function (col) {
    html += "<th>" + col + "</th>";
  });
  html += "</tr></thead><tbody>";
  data.forEach(function (row, idx) {
    html += "<tr><td>" + idx + "</td>";
    Object.values(row).forEach(function (val) {
      html += "<td>" + val + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  $("#table-container").html(html);
}
