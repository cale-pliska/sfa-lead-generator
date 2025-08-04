console.log('step1.js loaded');

$(document).ready(function () {
    $('#parse-locations-form').on('submit', function (event) {
        event.preventDefault();

        const populationStopDepth = $('#population-stop-depth').val();
        const location = $('#location').val();
        const gptInstructions = $('#gpt-instructions').val();
        const temperature = $('#temperature').val();

        $.ajax({
            url: '/parse_locations/run_instructions',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                instructions: gptInstructions,
                prompt: location,
                temperature: parseFloat(temperature),
            }),
            success: function (data) {
                const result = data.result;

                let table = $('#results-table');
                if (table.length === 0) {
                    table = $('<table id="results-table" border="1"></table>');
                    const header = $('<tr></tr>');
                    header.append('<th>Population Stop Depth</th>');
                    header.append('<th>Location</th>');
                    header.append('<th>Temperature</th>');
                    header.append('<th>Result</th>');
                    table.append(header);
                    $('#results-container').append(table);
                }

                const row = $('<tr></tr>');
                row.append($('<td></td>').text(populationStopDepth));
                row.append($('<td></td>').text(location));
                row.append($('<td></td>').text(temperature));
                row.append($('<td></td>').text(result));
                table.append(row);
            },
            error: function (xhr) {
                alert(xhr.responseText);
            }
        });
    });
});

