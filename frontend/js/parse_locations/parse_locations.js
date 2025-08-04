console.log('parse_locations.js loaded');

$(document).ready(function () {
    $('#parse-locations-form').on('submit', function (event) {
        event.preventDefault();

        const populationStopDepth = $('#population-stop-depth').val();
        const location = $('#location').val();
        const gptPrompt = $('#gpt-prompt').val();

        let table = $('#results-table');
        if (table.length === 0) {
            table = $('<table id="results-table" border="1"></table>');
            const header = $('<tr></tr>');
            header.append('<th>Population Stop Depth</th>');
            header.append('<th>Location</th>');
            header.append('<th>GPT Prompt</th>');
            table.append(header);
            $('#results-container').append(table);
        }

        const row = $('<tr></tr>');
        row.append($('<td></td>').text(populationStopDepth));
        row.append($('<td></td>').text(location));
        row.append($('<td></td>').text(gptPrompt));
        table.append(row);
    });
});

