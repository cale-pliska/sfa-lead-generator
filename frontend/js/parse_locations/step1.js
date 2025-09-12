console.log('step1.js loaded');

function renderStep1Table(rows, replace = false) {
    let table = $('#step1-results-table');
    if (table.length === 0) {
        table = $('<table id="step1-results-table" border="1"></table>');
        const header = $('<tr></tr>');
        header.append('<th>Location</th>');
        header.append('<th>Population</th>');
        table.append(header);
        $('#step1-results-container').append(table);
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
    const saved = localStorage.getItem('parse_locations_step1');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (Array.isArray(data)) {
                renderStep1Table(data, true);
            } else {
                renderStep1Table(data.rows || [], true);
                if (data.min_subgroup_size !== undefined) {
                    $('#min-pop-subgroup-size').val(data.min_subgroup_size);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    $('#parse-locations-form').on('submit', function (event) {
        event.preventDefault();

        const location = $('#location').val();

        $.ajax({
            url: '/parse_locations/run_instructions',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                location: location,
            }),
            success: function (data) {
                const population = data.population;
                const locationName = data.location_name;
                renderStep1Table([{ location: locationName, population: population }]);
            },
            error: function (xhr) {
                alert(xhr.responseText);
            }
        });
    });

    $('#save-step1').on('click', function () {
        const rows = [];
        $('#step1-results-table tr').each(function (index) {
            if (index === 0) return;
            rows.push({
                location: $(this).find('td').eq(0).text(),
                population: $(this).find('td').eq(1).text(),
            });
        });
        const minSize = $('#min-pop-subgroup-size').val();
        localStorage.setItem('parse_locations_step1', JSON.stringify({
            rows: rows,
            min_subgroup_size: minSize,
        }));
    });

    $('#clear-step1').on('click', function () {
        $('#step1-results-table').remove();
        $('#min-pop-subgroup-size').val('25000');
        localStorage.removeItem('parse_locations_step1');
    });
});

