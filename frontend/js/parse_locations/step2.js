console.log('step2.js loaded');

$(document).ready(function () {
    function gatherRows() {
        const rows = [];
        $('#results-table tr').each(function (index) {
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

    function renderResults(results) {
        let table = $('#step2-results-table');
        if (table.length === 0) {
            table = $('<table id="step2-results-table" border="1"></table>');
            const header = $('<tr></tr>');
            header.append('<th>Location</th>');
            header.append('<th>Raw Data</th>');
            table.append(header);
            $('#step2-results-container').append(table);
        }

        results.forEach(function (item) {
            const row = $('<tr></tr>');
            row.append($('<td></td>').text(item.location));
            const outputCell = $('<td></td>').html((item.raw_data || '').replace(/\n/g, '<br>'));
            row.append(outputCell);
            table.append(row);
        });
    }

    $('#process-single').on('click', function () {
        const instructions = $('#gpt-instructions-step2').val();

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
                renderResults(data.results || []);
            },
            error: function (xhr) {
                alert(xhr.responseText);
            },
        });
    });

    $('#process-all').on('click', function () {
        const instructions = $('#gpt-instructions-step2').val();
        const rows = gatherRows();
        if (rows.length === 0) {
            alert('No data to process.');
            return;
        }

        $.ajax({
            url: '/parse_locations/process_all',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                instructions: instructions,
                data: rows,
            }),
            success: function (data) {
                renderResults(data.results || []);
            },
            error: function (xhr) {
                alert(xhr.responseText);
            },
        });
    });
});
