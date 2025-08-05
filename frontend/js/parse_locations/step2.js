console.log('step2.js loaded');

const DEFAULT_INSTRUCTIONS = "divide up the given location into common sub-areas and get the population of the sub locations.\n\n**only return sub-areas with populations more than 50,000\n\nReturn the result as a valid JSON object. Keys must be sub-area names. Values must be integer population counts.\n\nDO NOT return any explanation, description, or formatting outside the JSON.";
window.DEFAULT_INSTRUCTIONS = DEFAULT_INSTRUCTIONS;

let step2Results = [];

function renderResults(results, replace = false) {
    let table = $('#step2-results-table');
    if (table.length === 0) {
        table = $('<table id="step2-results-table" border="1"></table>');
        const header = $('<tr></tr>');
        header.append('<th>Location</th>');
        header.append('<th>Raw Data</th>');
        table.append(header);
        $('#step2-results-container').append(table);
    }
    if (replace) {
        table.find('tr:gt(0)').remove();
    }
    results.forEach(function (item) {
        const row = $('<tr></tr>');
        row.append($('<td></td>').text(item.location));
        const outputCell = $('<td></td>').html((item.raw_data || '').replace(/\n/g, '<br>'));
        row.append(outputCell);
        table.append(row);
    });
}

$(document).ready(function () {
    $('#gpt-instructions-step2').val(DEFAULT_INSTRUCTIONS).prop('readonly', true);
    const saved = localStorage.getItem('parse_locations_step2');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            step2Results = data.results || [];
            renderResults(step2Results, true);
        } catch (e) {
            console.error(e);
        }
    }

    function gatherRows() {
        const rows = [];
        $('#step1-results-table tr').each(function (index) {
            if (index === 0) return; // skip header
            const location = $(this).find('td').eq(0).text();
            const population = $(this).find('td').eq(1).text();
            rows.push({
                location: location,
                population: population,
            });
        });
        return rows;
    }

    $('#process-single').on('click', function () {
        const instructions = DEFAULT_INSTRUCTIONS;

        const rows = gatherRows();
        if (rows.length === 0) {
            alert('No data to process.');
            return;
        }

        const row = rows[0]; // process only the first row

        $.ajax({
            url: '/parse_locations/process_single',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                instructions: instructions,
                data: [row],
            }),
            success: function (data) {
                const res = data.results || [];
                step2Results = step2Results.concat(res);
                renderResults(res);
            },
            error: function (xhr) {
                alert(xhr.responseText);
            },
        });
    });

    $('#save-step2').on('click', function () {
        localStorage.setItem('parse_locations_step2', JSON.stringify({
            results: step2Results,
        }));
    });

    $('#clear-step2').on('click', function () {
        $('#step2-results-table').remove();
        step2Results = [];
        localStorage.removeItem('parse_locations_step2');
        $('#gpt-instructions-step2').val(DEFAULT_INSTRUCTIONS);
    });
});

