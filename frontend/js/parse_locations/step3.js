console.log('step3.js loaded');

let step3Results = [];

function renderStep3Table(rows, replace = false) {
    let table = $('#step3-results-table');
    if (table.length === 0) {
        table = $('<table id="step3-results-table" border="1"></table>');
        const header = $('<tr></tr>');
        header.append('<th>Location</th>');
        header.append('<th>Population</th>');
        table.append(header);
        $('#step3-results-container').append(table);
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

$(document).ready(function () {
    const saved = localStorage.getItem('parse_locations_step3');
    if (saved) {
        try {
            step3Results = JSON.parse(saved) || [];
            renderStep3Table(step3Results, true);
        } catch (e) {
            console.error(e);
        }
    }

    $('#parse-data').on('click', function () {
        const rows = [];

        $('#step2-results-table tr').each(function (index) {
            if (index === 0) return; // skip header
            const baseLocation = $(this).find('td').eq(0).text().trim();
            let rawData = $(this).find('td').eq(1).text();

            rawData = rawData.replace(/```json|```/g, '').trim();
            rawData = rawData.replace(/\/\*[\s\S]*?\*\//g, '');

            try {
                const dataObj = JSON.parse(rawData);
                Object.entries(dataObj).forEach(function ([key, value]) {
                    rows.push({
                        location: baseLocation + ' ' + key,
                        population: value,
                    });
                });
            } catch (e) {
                console.error('Failed to parse JSON for', baseLocation, e);
            }
        });

        if (rows.length === 0) {
            alert('No data to parse.');
            return;
        }

        step3Results = rows;
        renderStep3Table(step3Results, true);
        localStorage.setItem('parse_locations_step3', JSON.stringify(step3Results));
    });

    $('#save-step3').on('click', function () {
        localStorage.setItem('parse_locations_step3', JSON.stringify(step3Results));
    });

    $('#clear-step3').on('click', function () {
        $('#step3-results-table').remove();
        step3Results = [];
        localStorage.removeItem('parse_locations_step3');
    });
});

