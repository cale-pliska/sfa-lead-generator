console.log('step4.js loaded');

let step4Results = [];

function renderStep4Table(rows, replace = false) {
    let table = $('#step4-results-table');
    if (table.length === 0) {
        table = $('<table id="step4-results-table" border="1"></table>');
        const header = $('<tr></tr>');
        header.append('<th>Location</th>');
        header.append('<th>Population</th>');
        table.append(header);
        $('#step4-results-container').append(table);
    }
    if (replace) {
        table.find('tr:gt(0)').remove();
    }
    rows.forEach(function (item) {
        const row = $('<tr></tr>');
        row.append($('<td></td>').text(item.location));
        row.append($('<td></td>').text(item.population));
        table.append(row);
    });
}

function gatherStep3Rows() {
    const rows = [];
    $('#step3-results-table tr').each(function (index) {
        if (index === 0) return; // skip header
        const location = $(this).find('td').eq(0).text();
        const population = parseInt($(this).find('td').eq(1).text(), 10);
        rows.push({ location: location, population: population });
    });
    return rows;
}

async function processRecursive() {
    const depth = parseInt($('#population-stop-depth').val(), 10) || 0;
    const instructions = $('#gpt-instructions-step2').val();
    const rows = gatherStep3Rows();
    if (rows.length === 0) {
        alert('No data to process.');
        return;
    }
    for (const row of rows) {
        if (row.population < depth) {
            step4Results.push(row);
            renderStep4Table([row]);
            continue;
        }
        try {
            const response = await $.ajax({
                url: '/parse_locations/process_single',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    instructions: instructions,
                    data: [row],
                }),
            });
            const res = response.results || [];
            res.forEach(function (item) {
                let rawData = item.raw_data || '';
                rawData = rawData.replace(/```json|```/g, '').trim();
                rawData = rawData.replace(/\/\*[\s\S]*?\*\//g, '');
                try {
                    const obj = JSON.parse(rawData);
                    Object.entries(obj).forEach(function ([key, value]) {
                        const newRow = { location: row.location + ' ' + key, population: value };
                        step4Results.push(newRow);
                        renderStep4Table([newRow]);
                    });
                } catch (e) {
                    console.error('Failed to parse JSON for', row.location, e);
                }
            });
        } catch (e) {
            console.error('Error processing', row.location, e);
        }
    }
}

$(document).ready(function () {
    $('#process-recursive').on('click', async function () {
        $('#step4-results-table').remove();
        step4Results = [];
        await processRecursive();
    });
});
