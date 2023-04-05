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
        casestudies: function (item, element) {
            return element.getAttribute('data-casestudies').toUpperCase();
        },
    },
});

//search/filter functionality
var countField = document.getElementById("item-count");
document.getElementById("item-total").innerText = data.length;
var searchField = document.getElementById("searchField");
var selectField = document.getElementById("case-select");
var searchFieldValue;
var selectFieldValue;
var countFieldValue;

searchField.value = '';
searchFieldValue = searchField.value.toLowerCase();
searchField.addEventListener('search', searchupdate);
searchField.addEventListener('keyup', searchupdate);
selectField.addEventListener('change', select)

function searchupdate() {
    var newSearch = searchField.value.toLowerCase();
    if (searchFieldValue !== newSearch) {
        searchFieldValue = newSearch;
        filter();
        updateCount();
    }
}

function select() {
    selectFieldValue = selectField.value.toLowerCase();
    grid.filter(function (item) {
        var element = item.getElement();
        var isSelectMatch = !selectFieldValue ? true : (element.getAttribute('data-casestudies') || '').toLowerCase().indexOf(selectFieldValue) > -1;
        return isSelectMatch;
    });
    updateCount();

}

function filter() {
    grid.filter(function (item) {
        var element = item.getElement();
        var isSearchMatch = !searchFieldValue ? true : (element.getAttribute('data-all') || '').toLowerCase().indexOf(searchFieldValue) > -1;
        return isSearchMatch;
    });

}

function updateCount() {
    var activeItems = grid.getItems().filter(function (item) {
        return item.isActive();
    });
    countField.innerText = activeItems.length
}


//grid refresh after images loaded, loading spinner removed
window.onload = function () {
    shave('.card-text', 200)
    grid.refreshItems().layout();
    document.body.classList.add('images-loaded');
    countField.innerText = data.length
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
    elems = []
    json.forEach(function (obj) {
        elems.push(addMuuri(obj));
    });
    var newItemsA = grid.add(elems);
    grid.sort('names')
    grid.refreshItems().layout();
}

function addMuuri(data) {

    data._label = getLabelTranslation(data)

    //initiate DOM element
    var itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.setAttribute("data-type", null)
    itemTemplate.setAttribute("data-begin", null)
    itemTemplate.setAttribute("data-end", null)
    itemTemplate.setAttribute("data-name", data._label)
    itemTemplate.setAttribute("data-casestudies", data.casestudies)

    dataAll = data._label + ' '

    //check if types available
    typestrue = false;
    if (data.types) {
        typestrue = true;
        itemTemplate.setAttribute("data-type", getTypeTranslation(data.types))
        dataAll += getTypeTranslation(data.types) + ' '
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
        ((typestrue) ? '<p class="card-title">' + getTypeTranslation(data.types) + '</p>' : '') +
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

//get translation for description
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

//get translation for names/labels
function getLabelTranslation(data) {
    returnlabel = data._label
    eval('if (typeof (data._label' + language.toUpperCase() + ') !== "undefined")' +
        'returnlabel = data._label' + language.toUpperCase())
    return returnlabel
}

function getTypeTranslation(data) {
    returntype = data.name
    eval('if (typeof (data.' + language.toUpperCase() + ') !== "undefined")' +
        'returntype = data.' + language.toUpperCase())
    return returntype
}


async function getData(url) {
    const response = await fetch(url);
    return response.json();

}


function getImages(data) {
    var string = iiifUrl + data + '.jpg/full/max/0/default.jpg'
    return string
}

function setMax(width, height) {
    let string = 'max';
    if (width > 300 && height > 500) string = '^!300,500';
    if (width > 300 && height < 500) string = '300,';
    if (width < 300 && height > 500) string = ',500,';
    var imgstring = iiifUrl + data + '.jpg/full/' + string + '/0/default.jpg';
    return imgstring
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