$("#process-btn").on("click", function () {
  var location = $("#location-input").val();
  var instructions = $("#instructions").val();
  $.ajax({
    url: "/phase1/process",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ location: location, instructions: instructions }),
    success: function (data) {
      renderTable(data);
    },
    error: function (xhr) {
      alert(xhr.responseText);
    },
  });
});

function renderTable(data) {
  if (!data.length) {
    $("#results-container").html("No results");
    return;
  }
  var html = "<table><thead><tr><th>region</th><th>population</th></tr></thead><tbody>";
  data.forEach(function (row) {
    html +=
      "<tr><td>" +
      (row.region || "") +
      "</td><td>" +
      (row.population || "") +
      "</td></tr>";
  });
  html += "</tbody></table>";
  $("#results-container").html(html);
}
