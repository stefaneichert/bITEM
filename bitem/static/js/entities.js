let mapThere = false;
var elements = document.querySelectorAll('.ent-item');
for (var i = 0; i < elements.length; i++) {
    elements[i].classList.remove('ent-item');
}

//initiate Grid
let grid = new Muuri('.grid', {
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
            let value = parseInt(element.getAttribute('data-sortbegin'));
            if (isNaN(value)) value = -9999999;
            return value;
        },
        end: function (item, element) {
            let value = parseInt(element.getAttribute('data-sortend'));
            if (isNaN(value)) value = -9999999;
            return value;
        },
        casestudies: function (item, element) {
            return element.getAttribute('data-casestudies').toUpperCase();
        }
    }
});

const countField = document.getElementById("item-count");
const itemTotalField = document.getElementById("item-total");
const searchField = document.getElementById("searchField");
const switchList = document.getElementById("list-switch");
const resetBtn = document.getElementById("resetBtn");

let andOr = "and"

const radios = document.querySelectorAll('.radio-select');

let checkedValues = []

radios.forEach(radio => {
    radio.addEventListener('change', function () {
        const checkedRadios = Array.from(radios).filter(radio => radio.checked);
        const checkedRadioValues = radio.value;
        andOr = checkedRadioValues
        applycheckFilters(checkedValues, andOr)

    });
});

const checkboxes = document.querySelectorAll('.filter-input');

checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        const checkedCheckboxes = Array.from(checkboxes).filter(checkbox => checkbox.checked);
        checkedValues = checkedCheckboxes.map(checkbox => checkbox.value);
        applycheckFilters(checkedValues, andOr)
    });
});

//Add map interaction to buttons
searchField.addEventListener('search', function () {
    applycheckFilters(checkedValues, andOr)
});
searchField.addEventListener('keyup', function () {
    applycheckFilters(checkedValues, andOr)
});

resetBtn.addEventListener('click', function () {
    searchField.value = '';
    checkboxes.forEach(function (checkbox) {
        checkbox.checked = false;
    });
    datecheck.checked = true;
    dateless = true;
    prepareTimeData(data)
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#0d6efd', toSlider);
    applycheckFilters([], andOr)
});


searchField.value = '';
itemTotalField.innerText = data.length;

switchList.addEventListener('click', listSwitch);

function applycheckFilters(selectedValues, andOr) {
    let items = grid.getItems();
    if (timethere) {
        items = getDateArray()
    }
    searchValue = searchField.value.toLowerCase();

    // Filter items based on selected values
    let filteredItems = items.filter((item) => {
        const dataMedia = item.getElement().getAttribute('data-media');
        const dataTypeId = item.getElement().getAttribute('data-typeid');
        const dataCaseStudies = item.getElement().getAttribute('data-casestudies');
        const searchMatch = item.getElement().getAttribute('data-all');

        // Check if dataMedia, dataTypeId, and dataCaseStudies match any selected value
        if (andOr === "and") {
            return selectedValues.every((value) => {

                if (value === '_model') {
                    return dataMedia.includes('_model');
                } else if (value === '_image') {
                    return dataMedia.includes('_image')
                } else if (value === '_nomedia') {
                    return dataMedia === '_nomedia'
                } else if (value.startsWith('_cs_')) {
                    let there = false
                    // Check if dataCaseStudies contains the selected value
                    const csValue = dataCaseStudies.split(',');
                    csValue.forEach(element => {
                        if (value === "_cs_" + element) {
                            there = true
                        }
                    })
                    return (there)

                } else if (value.startsWith('_tp_')) {
                    return dataTypeId === value;

                }

                return false;
            });
        } else if (andOr === "or") {
            return selectedValues.some((value) => {
                if (dataMedia.includes(value) || value === dataTypeId) {

                    return true;
                } else if (value.startsWith('_cs_')) {
                    let there = false
                    // Check if dataCaseStudies contains the selected value
                    const csValue = dataCaseStudies.split(',');
                    csValue.forEach(element => {
                        if (value === "_cs_" + element) {
                            there = true
                        }
                    })
                    return (there)

                }

                return false;
            });

        }
    })

    if (filteredItems.length === 0 && andOr === "or") {
        filteredItems = items
    }

    if (filteredItems.length === 0 && checkedValues.length === 0) {
        filteredItems = items
    }

    grid.filter(item => filteredItems.includes(item))

    if (searchValue !== '') {
        applyFilters()
    } else {

        updateCount(filteredItems)
        if (mapThere) setMarkers()
    }
}


function applyFilters() {
    //const searchValue = searchField.value.toLowerCase();
    const activeItems = grid.getItems().filter(item => item.isActive())
    const filteredItems = activeItems.filter(item => {
        const element = item.getElement();
        const isSearchMatch = !searchValue ? true : (element.getAttribute('data-all') || '').toLowerCase().indexOf(searchValue) > -1;
        return isSearchMatch;
    });
    grid.filter(item => filteredItems.includes(item));
    updateCount(filteredItems);
    if (mapThere) setMarkers()
}

function updateCount(filteredItems) {
    items = grid.getItems()
    const activeItemsCount = items.filter(item => item.isActive()).length;
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
    'begin': 'desc',
    'end': 'desc',
    'names': 'asc',
    'types': 'desc'
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
    itemTemplate.dataset.typeid = null;
    itemTemplate.dataset.id = data.id;
    itemTemplate.dataset.begin = null;
    itemTemplate.dataset.sortbegin = null;
    itemTemplate.dataset.end = null;
    itemTemplate.dataset.sortend = null;
    itemTemplate.dataset.media = '';
    itemTemplate.dataset.name = getLabelTranslation(data);
    itemTemplate.dataset.casestudies = data.casestudies;

    let dataAll = getLabelTranslation(data) + ' ';

    if (data.content) {
        dataAll += getLanguage(data.content) + ' ';
    }

    if (data.type) {
        itemTemplate.dataset.type = getTypeTranslation(data.type);
        itemTemplate.dataset.typeid = '_tp_' + data.type.id;
        dataAll += getTypeTranslation(data.type) + ' ';
    }

    let first = false;
    let last = false;
    let both = false;
    const startDate = makeLocalDate(data.start).localdate;
    const endDate = makeLocalDate(data.end).localdate;
    const year = startDate !== '?' && endDate !== '?' && startDate === endDate;

    if (data.start !== undefined) {
        first = true;
        itemTemplate.dataset.begin = data.start;
        itemTemplate.dataset.sortbegin = calculateTimeBP(data.start);
        dataAll += ' ' + startDate + ' ';
    }

    if (data.end !== undefined) {
        last = true;
        itemTemplate.dataset.end = data.end;
        itemTemplate.dataset.sortend = calculateTimeBP(data.end);
        dataAll += ' ' + endDate + ' ';
    }

    if (first && last) {
        first = false;
        last = false;
        both = true;
    }

    if (year) {
        first = true;
        last = false;
        both = false;
    }

    if (first) {
        itemTemplate.dataset.sortend = calculateTimeBP(data.start);
    }

    if (last) {
        itemTemplate.dataset.sortbegin = calculateTimeBP(data.end);
    }

    let images = Boolean(data.images);
    let modelthere = Boolean(data.models);

    let currentmodel = ''
    let poster = ''
    let modelname = ''
    if (modelthere) {
        images = false;
        let model = data.models[0]
        modelname = model.name
        itemTemplate.dataset.media += "_model";

        for (const file of model.files) {
            if (file.includes('glb')) currentmodel = file
            if (file.includes('webp')) poster = file
        }
    }

    if (images) itemTemplate.dataset.media += "_image";
    if (images === false && modelthere === false) itemTemplate.dataset.media = "_nomedia";
    const buttons = `
    <div class="btn-panel text-end">
      ${images ? `<a href="/iiif/${data.image.id.split('.')[0]}" class="info-buttons line-fade"><img src="/static/icons/iiif.png"></a>` : ''}
      ${modelthere ? `<a onclick="enlarge3d(${'\'' + currentmodel + '\''},${'\'' + poster + '\''},${'\'' + modelname + '\''})" class="info-buttons line-fade"><i class="bi bi-badge-3d"></i></a>` : ''}
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
            ${both ? `<p class="card-title">${makeLocalDate(data.start).localdate} - ${makeLocalDate(data.end).localdate}</p>` : ''}
            ${first ? `<p class="card-title">${makeLocalDate(data.start).localdate}</p>` : ''}
            ${last ? `<p class="card-title">${makeLocalDate(data.end).localdate}</p>` : ''}
            ${modelthere ? `<div class="model-content">
                    <model-viewer
                            class="model-3d"
                            alt="${modelname}"
                            src="${uploadPath}/${currentmodel}"
                            shadow-intensity="1"
                            poster="${uploadPath}/${poster}"
                            loading="lazy"              
                            auto-rotate
                            auto-rotate-delay="0"
                    ></model-viewer></div>
                    ` : ''}            
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

sortGrid('names')


//toggle opacity on filterBar

const myFilterBar = document.getElementById('filterBar');

// Add event listener for mouseenter
myFilterBar.addEventListener('mouseenter', function () {
    // Add the 'highlight' class on mouseenter
    this.classList.remove('offcanvas-opacity');
});

// Add event listener for mouseleave
myFilterBar.addEventListener('mouseleave', function () {
    // Remove the 'highlight' class on mouseleave
    this.classList.add('offcanvas-opacity');
});

myFilterBar.addEventListener('shown.bs.offcanvas', function () {
    this.classList.remove('offcanvas-opacity');
    searchField.focus();
})