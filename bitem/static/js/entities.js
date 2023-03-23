//initiate Grid
grid = new Muuri('.grid', {
    dragEnabled: true,
    dragPlaceholder: {
        enabled: true
    },
    layout: {
        fillGaps: true,
    },
    sortData: {
        types: function (item, element) {
            return element.getAttribute('data-type').toUpperCase();
        },
        names: function (item, element) {
            return element.getAttribute('data-name').toUpperCase();
        },
        begin: function (item, element) {
            return element.getAttribute('data-begin').toUpperCase();
        },
        end: function (item, element) {
            return element.getAttribute('data-end').toUpperCase();
        },
    },
});

//search/filter functionality
var searchField = document.getElementById("searchField");
var searchFieldValue;

searchField.value = '';
searchFieldValue = searchField.value.toLowerCase();
searchField.addEventListener('search', searchupdate);
searchField.addEventListener('keyup',searchupdate);

function searchupdate() {
    var newSearch = searchField.value.toLowerCase();
    if (searchFieldValue !== newSearch) {
        searchFieldValue = newSearch;
        filter();
    }
}

function filter() {
    grid.filter(function (item) {
        var element = item.getElement();
        var isSearchMatch = !searchFieldValue ? true : (element.getAttribute('data-all') || '').toLowerCase().indexOf(searchFieldValue) > -1;
        return isSearchMatch;
    });

}


//grid refresh after images loaded, loading spinner removed
window.onload = function () {
    shave('.card-text', 200)
    grid.refreshItems().layout();
    document.body.classList.add('images-loaded');
};

createMuuriElems(data)

/*fetch('https://thanados.openatlas.eu/api/query/?system_classes=' + query_params[0] + '&type_id=' + query_params[1] +
    '&show=geometry&show=types&show=geonames&show=relations&show=names&show=links&show=geometry&format=loud')
    .then(response => response.json())
    .then(json => createMuuriElems(json))
    .catch(error => console.error(error))*/


//define variables for sort order
sortorder = {
    'names': 'asc',
    'types': 'asc',
    'begin': 'asc',
    'end': 'asc'
}


function sortGrid(key, order = 'asc') {
    order = eval('sortorder.' + key)
    if (eval('sortorder.' + key + ' === "asc"')) {
        (eval('sortorder.' + key + ' = "desc"'));
    } else {
        (eval('sortorder.' + key + ' = "asc"'))
    }
    grid.sort(key + ':' + order);
}

function createMuuriElems(json) {
    console.log(json)
    elems = []
    json.forEach(function (obj) {
        elems.push(addMuuri(obj));
    });
    var newItemsA = grid.add(elems);
    grid.refreshItems().layout();
}

function addMuuri(data) {

    //initiate DOM element
    var itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.setAttribute("data-type", null)
    itemTemplate.setAttribute("data-begin", null)
    itemTemplate.setAttribute("data-end", null)
    itemTemplate.setAttribute("data-name", data._label)

    dataAll = data._label + ' '

    //check if types available
    typestrue = false;
    if (data.types) {
        typestrue = true;
        itemTemplate.setAttribute("data-type", data.types[0].type)
        dataAll += data.types[0].type + ' '
    }

    //check if timespan available
    first = false;
    last = false;
    both = false;
    if (typeof (data.first) != 'undefined') {
        first = true;
        itemTemplate.setAttribute("data-begin", data.first);
        dataAll += data.first
    }
    if (typeof (data.last) != 'undefined') {
        last = true;
        itemTemplate.setAttribute("data-end", data.last)
        dataAll += data.last
    }
    if (first && last) {
        first = false;
        last = false;
        both = true
    }

    //check if image available
    images = false
    if (data.images) images = true

    //build HTML elements

    itemTemplate.innerHTML = '' +
        '            <div class="item-content">\n' +
        '                <div class="card">\n' +
        '                    <div class="card-body">\n' +
        ((images) ? '                   <div class="list-col-8">\n' : '') +
        '                        <h5 class="card-title">' + data._label + '</h5>\n' +
        ((typestrue) ? '<p class="card-title">' + data.types[0].type + '</p>' : '') +
        ((both) ? '<p class="card-title">' + data.first + ' - ' + data.last + '</p>' : '') +
        ((first) ? '<p class="card-title">' + data.first + '</p>' : '') +
        ((last) ? '<p class="card-title">' + data.last + '</p>' : '') +
        ((images) ? '<img src="' + getImages(data.images) + '" loading="eager" class="image-content">' : '') +
        '                        <p class="card-text mt-2">' + getLanguage(data) + '</p>\n' +
        ((images) ? '</div>' : '') +
        ((images) ? '<div class="list-col-4"><img src="' + getImages(data.images) + '" loading="lazy" class="float-end img-fluid list-image d-none"></div>' : '') +
        '                    </div>\n' +
        '                </div>\n' +
        '            </div>';
    itemTemplate.setAttribute("data-all", dataAll)
    return (itemTemplate)
}

function getLanguage(data) {
    if (data.content) {
        var text = data.content;
        if (text.includes('_##')) {
            var mySubString = text.substring(
                text.indexOf('##' + language + '_##') + 7,
                text.lastIndexOf('##_' + language + '##')
            );
            text = mySubString;
        }
        dataAll += ' ' + text
        return text
    } else {
        return ''
    }
}

function getImages(data) {
    //return '/static/images/test/' + iter + '.jpg'
    return 'https://thanados.openatlas.eu/api/display/' + data[0]
}

//switch from tiles to list and back

tiles = document.getElementById("tiles");

function listSwitch() {
    tiles.classList.toggle("list");
    tilesthere = false
    exchangeListClass()
    shave('.card-text', 200)
    grid.refreshItems().layout();

}

col8 = document.getElementsByClassName('list-col-8')
col4 = document.getElementsByClassName('list-col-4')
listimages = document.getElementsByClassName('list-image')
listrow = document.getElementsByClassName('card-body')

function exchangeListClass() {
    Array.from(col8).forEach(function (obj) {
        obj.classList.toggle("col-10")
    })

    Array.from(col4).forEach(function (obj) {
        obj.classList.toggle("col-2")
    })

    Array.from(listimages).forEach(function (obj) {
        obj.classList.toggle("d-none")
    })

    Array.from(listrow).forEach(function (obj) {
        obj.classList.toggle("row")
    })

    var button = document.getElementById('viewbutton')
    button.classList.toggle("bi-list-ul")
    button.classList.toggle("bi-layout-wtf")

}