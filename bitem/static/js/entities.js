const classFilterOptions = {
    'place': {
        'classes': ['place'],
        'icon': '<i class="bi bi-geo-alt"></i>',
        'title': languageTranslations._place_sg,
        'title_pl': languageTranslations._places,
    },
    'actor': {
        'classes': ['person', 'group'],
        'icon': '<i class="bi  bi-people"></i>',
        'title': languageTranslations._actor_sg,
        'title_pl': languageTranslations._actors,
    },
    'item': {
        'classes': ['feature', 'stratigraphic_unit', 'artifact'],
        'icon': '<i class="bi  bi-box-seam"></i>',
        'title': languageTranslations._item_sg,
        'title_pl': languageTranslations._items,
    },
    'event': {
        'classes': ['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
        'icon': '<i class="bi  bi-calendar4-week"></i>',
        'title': languageTranslations._event_sg,
        'title_pl': languageTranslations._events,
    }
}

let mapThere = false;
var elements = document.querySelectorAll('.ent-item');
for (var i = 0; i < elements.length; i++) {
    elements[i].classList.remove('ent-item');
}

//initiate Grid
let grid = new Muuri('#tiles', {
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
        mainclass: function (item, element) {
            return element.getAttribute('data-mainclass').toUpperCase();
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
        },
        favorites: function (item, element) {
            return element.getAttribute('data-favorite');
        }
    }
});

const countField = document.getElementById("item-count");
const itemTotalField = document.getElementById("item-total");
const searchField = document.getElementById("searchField");
const searchFieldTop = document.getElementById("searchFieldTop");
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

let searchValue = ''
//Add map interaction to buttons
searchField.addEventListener('search', function () {
    searchValue = searchField.value.toLowerCase()
    applycheckFilters(checkedValues, andOr)
});

searchField.addEventListener('keyup', function () {
    searchValue = searchField.value.toLowerCase()
    applycheckFilters(checkedValues, andOr)
});

searchFieldTop.addEventListener('search', function () {
    searchValue = searchFieldTop.value.toLowerCase()
    applycheckFilters(checkedValues, andOr)
});

searchFieldTop.addEventListener('keyup', function () {
    searchValue = searchFieldTop.value.toLowerCase()
    applycheckFilters(checkedValues, andOr)
});

resetBtn.addEventListener('click', function () {
    searchValue = ''
    searchField.value = '';
    searchFieldTop.value = '';
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
searchFieldTop.value = '';
itemTotalField.innerText = data.length;

switchList.addEventListener('click', listSwitch);

function applycheckFilters(selectedValues, andOr) {
    let items = grid.getItems();

    // If `timethere` is true, use getDateArray instead
    if (timethere) {
        items = getDateArray();
    }

    // Filter items based on selected values
    let filteredItems = items.filter((item) => {
        const element = item.getElement();
        const dataMedia = element.getAttribute('data-media');
        const dataTypeId = element.getAttribute('data-typeid');
        const dataCaseStudies = element.getAttribute('data-casestudies');
        const dataMainClass = element.getAttribute('data-mainclassraw');
        const searchMatch = element.getAttribute('data-all');

        // Always include the fixed item, regardless of filters
        if (element.classList.contains('fixed-item')) {
            return true;
        }

        // Check if dataMedia, dataTypeId, and dataCaseStudies match any selected value
        if (andOr === "and") {
            return selectedValues.every((value) => {
                if (value === '_model') {
                    return dataMedia.includes('_model');
                } else if (value === '_image') {
                    return dataMedia.includes('_image');
                } else if (value === '_nomedia') {
                    return dataMedia === '_nomedia';
                } else if (value.startsWith('_cs_')) {
                    let there = false;
                    // Check if dataCaseStudies contains the selected value
                    const csValue = dataCaseStudies ? dataCaseStudies.split(',') : [];
                    csValue.forEach((element) => {
                        if (value === "_cs_" + element) {
                            there = true;
                        }
                    });
                    return there;
                } else if (value.startsWith('_tp_')) {
                    return dataTypeId === value;
                } else if (value.startsWith('_cl_')) {
                    console.log ('_cl_' + dataMainClass === value)
                    return '_cl_' + dataMainClass === value
                }

                return false;
            });
        } else if (andOr === "or") {
            return selectedValues.some((value) => {
                if (dataMedia.includes(value) || value === dataTypeId || value === '_cl_' + dataMainClass) {
                    return true;
                } else if (value.startsWith('_cs_')) {
                    let there = false;
                    // Check if dataCaseStudies contains the selected value
                    const csValue = dataCaseStudies ? dataCaseStudies.split(',') : [];
                    csValue.forEach((element) => {
                        if (value === "_cs_" + element) {
                            there = true;
                        }
                    });
                    return there;
                }

                return false;
            });
        }
    });

    // If no matches found for "or" condition, show all items
    if (filteredItems.length === 0 && andOr === "or") {
        filteredItems = items;
    }

    // If no values are selected, show all items
    if (filteredItems.length === 0 && selectedValues.length === 0) {
        filteredItems = items;
    }

    // Apply the filter to the grid and ensure the fixed-item is included
    grid.filter((item) => {
        const element = item.getElement();

        // Always show the fixed-item
        if (element.classList.contains('fixed-item')) {
            return true;
        }

        // Filter other items based on the selected values
        return filteredItems.includes(item);
    });

    // Ensure the fixed-item remains in the first position after filtering
    const fixedItem = document.querySelector('.fixed-item');
    if (fixedItem) {
        fixedItem.parentNode.prepend(fixedItem);  // Ensure it's the first in the DOM
    }

    // If there is a search value, apply it as an additional filter
    if (searchValue !== '') {
        applyFilters();
    } else {
        updateCount(filteredItems);
        if (mapThere) {
            setMarkers();
        }
    }
    moveFixedItemsToBeginning()
}

function moveFixedItemsToBeginning() {
    // Get all the items in the grid
    const items = grid.getItems();

    // Filter the items to find those with the class 'fixed-item'
    const fixedItems = items.filter(item => item.getElement().classList.contains('fixed-item'));

    // Sort the fixed items based on their 'data-order' attribute
    fixedItems.sort((a, b) => {
        const orderA = parseInt(a.getElement().getAttribute('data-order'), 10) || 0;
        const orderB = parseInt(b.getElement().getAttribute('data-order'), 10) || 0;
        return orderA - orderB;  // Ascending order
    });

    // Move each fixed item to the beginning of the grid, in order
    fixedItems.forEach((fixedItem, index) => {
        grid.move(fixedItem, index);
    });
}

function applyFilters() {
    //const searchValue = searchField.value.toLowerCase();
    const activeItems = grid.getItems().filter(item => item.isActive())
    const filteredItems = activeItems.filter(item => {
        const element = item.getElement();
        if (element.classList.contains('fixed-item')) {
            return true;
        }
        const isSearchMatch = !searchValue ? true : (element.getAttribute('data-all') || '').toLowerCase().indexOf(searchValue) > -1;
        return isSearchMatch;
    });

    grid.filter(item => {
        const element = item.getElement();


        if (element.classList.contains('fixed-item')) {
            return true;
        }

        return filteredItems.includes(item);
    });


    updateCount(filteredItems);
    if (mapThere) setMarkers()
    moveFixedItemsToBeginning()
}

function updateCount(filteredItems) {
    let items = grid.getItems()
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
    'mainclass': 'asc',
    'favorites': 'desc',
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
    moveFixedItemsToBeginning()
}

function createMuuriElems(json) {
    const elems = json.map(obj => addMuuri(obj));
    grid.add(elems);
    grid.sort('names');
    grid.refreshItems().layout();
}

function addMuuri(data) {
    let favorite = false;


    const itemTemplate = document.createElement('div');
    itemTemplate.dataset.favorite = "false";
    if (isIdPresent(data, 237297)) {itemTemplate.dataset.favorite = "true"; favorite = true;}
    itemTemplate.className = 'item';
    itemTemplate.dataset.type = null;
    itemTemplate.dataset.class = data._class;

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

    let classInfo = getClassInfo(data._class);
    let classIcon = classInfo.icon;
    let className = classInfo.title;
    let classNameRaw = classInfo.titleRaw;

    itemTemplate.dataset.mainclass = className;
    itemTemplate.dataset.mainclassraw = classNameRaw;

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
        console.log(model)
        modelname = model.name
        itemTemplate.dataset.media += "_model";
        for (const file of model.files) {
            if (typeof file.file !== 'undefined') {
                if (file.file.includes('glb')) currentmodel = file.file
                if (file.file.includes('webp')) poster = file.file
            } else {modelthere = false}
        }
    }

    if (images) itemTemplate.dataset.media += "_image";
    if (images === false && modelthere === false) itemTemplate.dataset.media = "_nomedia";
    const buttons = ''
    const oldbuttons = `
    <div class="btn-panel text-end">
      ${images ? `<a href="/iiif/${data.image.id.split('.')[0]}" class="info-buttons line-fade"><img src="/static/icons/iiif.png"></a>` : ''}
      ${modelthere ? `<a onclick="enlarge3d(${'\'' + currentmodel + '\''},${'\'' + poster + '\''},${'\'' + modelname + '\''})" class="info-buttons line-fade"><i class="bi bi-badge-3d"></i></a>` : ''}
      <a class="line-fade info-buttons" href="/view/${data.id}"><i class="bi bi-info-circle"></i></a>
    </div>
  `;

    itemTemplate.innerHTML = `
    <a class="tile-link" href="/view/${data.id}">
    <div class="item-content">
      <div class="card">
        <div class="card-body">
          ${images ? '<div class="list-col-8">' : ''}
            <p class="card-title d-flex justify-content-between"><span>${classIcon} <span class="ms-2">${className}</span></span>${favorite ? `<span><i class="bi bi-star-fill"></i></span>` : ''}</p>
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
    </a>
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


sortGrid('mainclass')
sortGrid('favorites')


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

const filterClasses = document.getElementById('filterClasses')



function getClassInfo(className, usePlural = false) {
    // Loop through each key in classFilterOptions
    for (let key in classFilterOptions) {
        const option = classFilterOptions[key];

        // Check if the className exists in the 'classes' array
        if (option.classes.includes(className)) {
            // Return the icon and title (or title_pl if usePlural is true)
            return {
                icon: option.icon,
                title: usePlural ? option.title_pl : option.title,
                titleRaw: key,
            };
        }
    }

    // Return null if no matching class is found
    return null;
}


function addFilter(class_, count = 0) {
    // Look up class options based on the provided class_
    const classOptions = classFilterOptions[class_];
    if (count > 0) {
        count = ': ' + count
    } else {
        count = ''
    }
    if (classOptions) {
        const {icon, title} = classOptions;

        let elementHtml = `
            <div title="${title}" class="pb-1">
                <input type="checkbox" class="btn-check mt-2" autocomplete="off" id="classSwitch${class_}" checked>
                <label id="switchLabel${class_}" class="btn filter-label" for="classSwitch${class_}">${icon}<span class="ms-2 filter-title">${title} ${count}</span></label>
                               
            </div>
        `;

        // Assuming filterClasses is a reference to the container where you want to add the HTML
        filterClasses.innerHTML += elementHtml;
    }
}

function isIdPresent(data, targetId) {
    if (Array.isArray(data)) {
        for (let item of data) {
            if (isIdPresent(item, targetId)) {
                return true;
            }
        }
    } else if (typeof data === "object" && data !== null) {
        if (data.id && data.id === targetId) {
            return true;
        }
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                if (isIdPresent(data[key], targetId)) {
                    return true;
                }
            }
        }
    }
    return false;
}

moveFixedItemsToBeginning()