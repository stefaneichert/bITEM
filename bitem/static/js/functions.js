function fadeIn(elem, time, selector) {
    if (selector == "id") {
        var el = [];
        el.push(document.getElementById(elem));
    }
    if (selector == "class") var el = document.getElementsByClassName(elem);

    Array.from(el).forEach(function (element) {
        makeFade(element, time)
    });
}

function makeFade(el, time) {
    el.style.opacity = 0;
    var last = +new Date();
    var tick = function () {
        el.style.opacity = +el.style.opacity + (new Date() - last) / time;
        last = +new Date();

        if (+el.style.opacity < 1) {
            (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
        }
    };
    tick();
}


//scroll to top button
let scrollbutton = document.getElementById("btn-back-to-top");

window.onscroll = function () {
    scrollFunction();
};

function scrollFunction() {
    if (
        document.body.scrollTop > 300 ||
        document.documentElement.scrollTop > 300
    ) {
        scrollbutton.style.display = "block";
    } else {
        scrollbutton.style.display = "none";
    }
}

scrollbutton.addEventListener("click", backToTop);

function backToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

function getLanguage(data) {
    if (data) {
        let text = data.description;
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
    let label = data._label.name;
    const languageLabel = data._label[language.toUpperCase()];
    if (typeof languageLabel !== "undefined") {
        label = languageLabel;
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

function customSortInvolvement(a, b) {
    const dateA = new Date(a.invbegin);
    const dateB = new Date(b.invbegin);
    if (dateA < dateB) {
        return -1;
    } else if (dateA > dateB) {
        return 1;
    } else {
        const endDateA = new Date(a.invend);
        const endDateB = new Date(b.invend);

        if (endDateA < endDateB) {
            return -1;
        } else if (endDateA > endDateB) {
            return 1;
        } else {
            return 0;
        }
    }
}

function makeLocalDate(dateString) {

    let result = {'datestring': dateString, 'localdate': ''}
    let addition = ''
    let addValue = 0
    if (typeof (dateString) === 'undefined') {result.localdate = '?'; return result}

    if (dateString[0] === '-') {
        addition = ' BC'
        addValue = 1
    }

    let parts = dateString.split('-');
    let year = parseInt(parts[0 + addValue], 10);
    let month = parseInt(parts[1 + addValue], 10) - 1; // months are zero-based
    let day = parseInt(parts[2 + addValue], 10);
    let date = new Date(year, month, day);


    if (dateString.includes('-01-01') || isNaN(month)) {
        result.localdate = year + addition
        return result
    }

// Format the date based on the user's locale

    if (isValidDate(date)) {
        const formattedDate = new Intl.DateTimeFormat(language).format(date);
        result.localdate = formattedDate + addition
        return result;
    } else {
        return '?'
    }
}

function isValidDate(d) {

    return d instanceof Date && !isNaN(d);
}


function returnTranslation(key) {
    if (languageTranslations.hasOwnProperty(key)) {
        return languageTranslations[key];
    } else {
        // Handle the case when the key is not found (e.g., return a default value or handle it as needed).
        return ''
    }
}

function enlarge3d(model, poster, name) {
    let modelContainer = document.getElementById('current-3d-model')
    modelContainer.innerHTML = `
    
            
        <div class="modal-header">
            <h5 class="modal-title"><img class="me-4" src="/static/icons/logo.png" alt="bITEM" width="auto" height="24">${name}</h5>                    
        </div>
        <div  class="modal-body">
            <model-viewer 
                    class="fullscreen-model"
                    alt="${name}"
                    src="${uploadPath}/${model}"
                    shadow-intensity="1"
                    poster="${uploadPath}/${poster}"
                    loading="lazy"
                    camera-controls                    
            ></model-viewer>
            <button id="closebutton" type="button" class="btn btn-outline-light" title="Close Window" onclick="history.back()" aria-label="Close"><i class="bi bi-x-lg"></i></button>
            <form method="get" action="${uploadPath}/${model}">
            <button id="downloadbutton" type="submit" class="btn btn-outline-light" title="Download Model" onclick="history.back()" aria-label="Download"><i class="bi bi-download"></i></button>
            </form>
            <button id="infobutton" onclick="toggleInfo()" title="Copyright Information" type="button" class="btn btn-outline-light" aria-label="Info"><i class="bi bi-info-lg"></i></button>
        </div>
        <div class="modal-footer d-none" id="info-footer">
            <p id="attribution"></p>
        </div>
    `
    const modalThreeD = new bootstrap.Modal('#info-modal')


    id = model.replace('.glb', '')

    var closedModalHashStateId = "#modalClosed";
    var openModalHashStateId = "#modalOpen";
    const myModalEl = document.getElementById('info-modal')

    /* Updating the hash state creates a new entry
     * in the web browser's history. The latest entry in the web browser's
     * history is "modal.html#modalClosed". */
    window.location.hash = closedModalHashStateId;

    /* The latest entry in the web browser's history is now "modal.html#modalOpen".
     * The entry before this is "modal.html#modalClosed". */
    myModalEl.addEventListener('show.bs.modal', event => {
        window.location.hash = openModalHashStateId;
    })


    /* When the user closes the modal using the Twitter Bootstrap UI,
     * we just return to the previous entry in the web
     * browser's history, which is "modal.html#modalClosed". This is the same thing
     * that happens when the user clicks the web browser's back button. */
    myModalEl.addEventListener('hide.bs.modal', event => {

        history.replaceState(null, null, ' ');

    });

    window.onhashchange = function () {
        if (window.location.hash != "#modalOpen") {
            modalThreeD.hide()
        }
        if (window.location.hash == ("#modalOpen")) {
            modalThreeD.show()
        }
    }

    modalThreeD.show()

    getImageExt(id)
        .then(data => {
            // Handle the JSON data here
            let attrContainer = document.getElementById('attribution')
            attrContainer.innerHTML = data.requiredStatement.value[language][0]
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

// Immutable hash state identifiers.


function toggleInfo() {
    const infoFooter = document.getElementById('info-footer')
    infoFooter.classList.toggle('d-none')
}

async function getImageExt(id) {
    const response = await fetch("/iiif/" + id + ".json");
    const message = await response.json();
    return (message)
}