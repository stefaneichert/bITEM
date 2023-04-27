//initiate Grid
grid = new Muuri('.grid', {
    dragEnabled: true,
    dragPlaceholder: {
        enabled: true
    },
    layout: {
        fillGaps: true,
    },
});

//grid refresh after images loaded, loading spinner removed
window.onload = function () {
    grid.refreshItems().layout();
document.body.classList.add('images-loaded');

};

createMuuriElems(data)

//define variables for sort order

function createMuuriElems(json) {
    const elems = json.map(obj => addMuuri(obj));
    grid.add(elems);
    grid.sort('names');
    grid.refreshItems().layout();
}

function addMuuri(data) {
    data._label = getLabelTranslation(data);
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.dataset.type = null;
    itemTemplate.dataset.id = data.id;
    itemTemplate.dataset.begin = null;
    itemTemplate.dataset.end = null;
    itemTemplate.dataset.name = data._label;
    itemTemplate.dataset.casestudies = data.casestudies;

    let dataAll = data._label + ' ';

    if (data.types) {
        itemTemplate.dataset.type = getTypeTranslation(data.types);
        dataAll += getTypeTranslation(data.types) + ' ';
    }

    let first = false;
    let last = false;
    let both = false;

    if (data.first !== undefined) {
        first = true;
        itemTemplate.dataset.begin = data.first;
        dataAll += data.first;
    }

    if (data.last !== undefined) {
        last = true;
        itemTemplate.dataset.end = data.last;
        dataAll += data.last;
    }

    if (first && last) {
        first = false;
        last = false;
        both = true;
    }

    const images = Boolean(data.images);

    const buttons = `
    <div class="btn-panel text-end">
      ${images ? `<a href="/iiif/${data.image.id}" class="info-buttons line-fade"><img src="/static/icons/iiif.png"></a>` : ''}
      <a class="line-fade info-buttons" href="/view/${data.id}"><i class="bi bi-info-circle"></i></a>
    </div>
  `;

    itemTemplate.innerHTML = `
    <div class="item-content">
      <div class="card">
        <div class="card-body">
          ${images ? '<div class="list-col-8">' : ''}
            <h5 class="card-title">${data._label}</h5>
            ${data.types ? `<p class="card-title">${getTypeTranslation(data.types)}</p>` : ''}
            ${both ? `<p class="card-title">${data.first} - ${data.last}</p>` : ''}
            ${first ? `<p class="card-title">${data.first}</p>` : ''}
            ${last ? `<p class="card-title">${data.last}</p>` : ''}
            ${images ? `<div><img src="${data.image.path}" loading="eager" class="image-content"></div>` : ''}
            <p class="card-text mt-2">${getLanguage(data)}</p>
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

function getLanguage(data) {
    if (data.content) {
        let text = data.content;
        if (text.includes('_##')) {
            const mySubString = text.substring(
                text.indexOf(`##${language}_##`) + 7,
                text.lastIndexOf(`##_${language}##`)
            );
            text = mySubString;
        }
        return text;
    } else {
        return '';
    }
}

function getLabelTranslation(data) {
    let label = data._label;
    const languageLabel = data._label[language.toUpperCase()];
    if (typeof languageLabel !== "undefined") {
        label = languageType;
    }
    return label;
}


function getTypeTranslation(data) {
    let typeName = data.name;
    const languageType = data[language.toUpperCase()];
    if (typeof languageType !== "undefined") {
        typeName = languageType;
    }
    return typeName;
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