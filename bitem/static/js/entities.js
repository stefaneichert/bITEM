//initiate Grid
grid = new Muuri('.grid', {
    dragEnabled: false,
    dragPlaceholder: {
        enabled: true
    },
    layout: {
        fillGaps: true,
    },
    sortData: {
        id: function (item, element) {
            return element.getAttribute('data-id');
        },
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

const countField = document.getElementById("item-count");
const itemTotalField = document.getElementById("item-total");
const searchField = document.getElementById("searchField");
const selectField = document.getElementById("case-select");
const switchList = document.getElementById("list-switch");

searchField.value = '';
itemTotalField.innerText = data.length;

searchField.addEventListener('search', applyFilters);
searchField.addEventListener('keyup', applyFilters);
selectField.addEventListener('change', applyFilters);
switchList.addEventListener('click', listSwitch);

function applyFilters() {
    const searchValue = searchField.value.toLowerCase();
    const selectValue = selectField.value.toLowerCase();
    const filteredItems = grid.getItems().filter(item => {
        const element = item.getElement();
        const isSelectMatch = !selectValue ? true : (element.getAttribute('data-casestudies') || '').toLowerCase().indexOf(selectValue) > -1;
        const isSearchMatch = !searchValue ? true : (element.getAttribute('data-all') || '').toLowerCase().indexOf(searchValue) > -1;
        return isSelectMatch && isSearchMatch;
    });
    grid.filter(item => filteredItems.includes(item));
    updateCount(filteredItems);
}

function updateCount(filteredItems) {
    const activeItemsCount = filteredItems.filter(item => item.isActive()).length;
    countField.innerText = activeItemsCount;
}


//grid refresh after images loaded, loading spinner removed
window.onload = function () {
    shave('.card-text', 200)
    countField.innerText = data.length;
    grid.refreshItems().layout();


    document.body.classList.add('images-loaded');

};

createMuuriElems(data)

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
    const elems = json.map(obj => addMuuri(obj));
    grid.add(elems);
    grid.sort('names');
    grid.refreshItems().layout();
}

function addMuuri(data) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.dataset.type = null;
    itemTemplate.dataset.id = data.id;
    itemTemplate.dataset.begin = null;
    itemTemplate.dataset.end = null;
    itemTemplate.dataset.name = getLabelTranslation(data);
    itemTemplate.dataset.casestudies = data.casestudies;

    let dataAll = getLabelTranslation(data) + ' ';

    if (data.content) {
        dataAll += getLanguage(data.content) + ' ';
    }

    if (data.type) {
        itemTemplate.dataset.type = getTypeTranslation(data.type);
        dataAll += getTypeTranslation(data.type) + ' ';
    }

    let first = false;
    let last = false;
    let both = false;

    if (data.start !== undefined) {
        first = true;
        itemTemplate.dataset.begin = data.start;
        dataAll += data.start;
    }

    if (data.end !== undefined) {
        last = true;
        itemTemplate.dataset.end = data.end;
        dataAll += data.end;
    }

    if (first && last) {
        first = false;
        last = false;
        both = true;
    }

    const images = Boolean(data.images);

    const buttons = `
    <div class="btn-panel text-end">
      ${images ? `<a href="/iiif/${data.image.id.split('.')[0]}" class="info-buttons line-fade"><img src="/static/icons/iiif.png"></a>` : ''}
      <a class="line-fade info-buttons" href="/view/${data.id}"><i class="bi bi-info-circle"></i></a>
    </div>
  `;

    itemTemplate.innerHTML = `
    <div class="item-content">
      <div class="card">
        <div class="card-body">
          ${images ? '<div class="list-col-8">' : ''}
            <h5 class="card-title">${getLabelTranslation(data)}</h5>
            ${data.type ? `<p class="card-title">${getTypeTranslation(data.type)}</p>` : ''}
            ${both ? `<p class="card-title">${makeLocalDate(data.start)} - ${makeLocalDate(data.end)}</p>` : ''}
            ${first ? `<p class="card-title">${makeLocalDate(data.start)}</p>` : ''}
            ${last ? `<p class="card-title">${makeLocalDate(data.end)}</p>` : ''}
            ${images ? `<div><img src="${data.image.path}" loading="eager" class="image-content"></div>` : ''}
            <p class="card-text mt-2">${getLanguage(data.content)}</p>
            ${buttons}
          ${images ? '</div>' : ''}
          ${images ? `<div class="list-col-4"><img src="${data.image.path}" loading="lazy" class="float-end img-fluid list-image d-none"></div>` : ''}
        </div>
      </div>
    </div>
  `;

    itemTemplate.dataset.all = dataAll;

    return itemTemplate;
}

//switch from tiles to list and back

const tiles = document.getElementById("tiles");

function listSwitch() {
    tiles.classList.toggle("list");
    exchangeListClass();
    shave('.card-text', 200);
    grid.refreshItems().layout();
}

const col8 = document.querySelectorAll('.list-col-8');
const col4 = document.querySelectorAll('.list-col-4');
const infobuttons = document.querySelectorAll('.btn-panel');
const listimages = document.querySelectorAll('.list-image');
const listrow = document.querySelectorAll('.card-body');

function toggleClass(elements, className) {
    elements.forEach(element => element.classList.toggle(className));
}

function exchangeListClass() {
    toggleClass(col8, "col-10");
    toggleClass(infobuttons, "text-end");
    toggleClass(col4, "col-2");
    toggleClass(listimages, "d-none");
    toggleClass(listrow, "row");

    const button = document.getElementById('viewbutton');
    button.classList.toggle("bi-list-ul");
    button.classList.toggle("bi-layout-wtf");
}