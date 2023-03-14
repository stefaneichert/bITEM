grid = new Muuri('.grid', {
    dragEnabled: true,
    dragPlaceholder: {
        enabled: true
    },
    layout: {
        fillGaps: true,
    }
});

fetch('https://thanados.openatlas.eu/api/query/?system_classes=' + query_params[0] + '&type_id=' + query_params[1] +
    '&show=geometry&show=types&show=geonames&show=relations&show=names&show=links&show=geometry&format=loud')
    .then(response => response.json())
    .then(json => createMuuriElems(json))
    .catch(error => console.error(error))


function createMuuriElems(json) {
    console.log(json)
    elems = []
    json.results.forEach(function (obj) {
        elems.push(addMuuri(obj))
    });
    var newItemsA = grid.add(elems);
    grid.refreshItems().layout();
    document.body.classList.add('images-loaded');
}

function addMuuri(data) {
    var itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    itemTemplate.innerHTML = '' +
        '            <div class="item-content">\n' +
        '                <div class="card">\n' +
        '                    <div class="card-body">\n' +
        '                        <h5 class="card-title">' + data._label + '</h5>\n' +
        '                        <p class="card-text">' + getLanguage(data) + '</p>\n' +
        '                    </div>\n' +
        '                </div>\n' +
        '            </div>';
    return (itemTemplate)
}

function getLanguage(data) {
    //get languages
    if (data.content) {
        var text = data.content;
        if (text.includes('_##')) {
            var mySubString = text.substring(
                text.indexOf('##' + language + '_##') + 7,
                text.lastIndexOf('##_' + language + '##')
            );
            text = mySubString;
        }
        text = text.substring(0, 300);
        text = text.substring(0, Math.min(text.length, text.lastIndexOf(" "))) + '...'
        return text
    } else {
        return ''
    }
}