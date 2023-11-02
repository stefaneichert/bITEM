const Clmarkers = L.markerClusterGroup({singleMarkerMode: true, maxClusterRadius: 1})

window.onload = function () {
    if (typeof (grid2) != 'undefined') grid2.refreshItems().layout();
    grid.refreshItems().layout();
    setTimeout(() => {
        grid.refreshItems().layout();
    }, 100);
    document.body.classList.add('images-loaded');
    const accordions = document.querySelectorAll('.accordion-button');
    accordions.forEach(el => el.addEventListener('click', event => {
        setTimeout(() => {
            grid.refreshItems().layout();
        }, 400);
    }))
};

window.addEventListener('resize', function (event) {
    setTimeout(() => {
        grid.refreshItems().layout();
        if (typeof (grid2) != 'undefined') grid2.refreshItems().layout();
    }, 500);
}, true);


async function updateEnts() {
    const response = await fetch("/update");
    const message = await response.text();
    console.log(message);
}

async function getImageExt(id) {
    const response = await fetch("/iiif/" + id + ".json");
    const message = await response.json();
    return (message)
}

//updateEnts()

const grid = new Muuri('.grid', {
    dragEnabled: false,
    dragPlaceholder: {
        enabled: true
    },
    layout: {
        fillGaps: true,
    },
});

createMuuriElems(data)

function createMuuriElems(obj) {
    const elem = addMuuri(obj);
    grid.add(elem);

    let models = (obj.models)
    if (models) {
        make3d(models)
    }


    let sourceConnections = data.connections.filter(
        (connection) => ['external_reference', 'bibliography'].includes(connection.class)
    );
    if (sourceConnections.length > 0) grid.add(getSources(sourceConnections))

    const placeInfo = extractPlaceInfo(data)
    if (placeInfo.length > 0) {
        grid.add(setmap())
        setMarkers(placeInfo)

    }

    let actors = makeEnts(obj, ['group', 'person'])
    if (actors.length > 0) {
        grid.add(setEnts(actors, '_actor'))
    }

    let items = makeEnts(obj, ['artifact'])
    if (items.length > 0) {
        grid.add(setEnts(items, '_item'))
    }


    let images = (obj.images)
    if (images) {
        extractImages(images);
    }

    let events = makeEnts(obj, ['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'])
    if (events.length > 0) {
        grid.add(setEvents(events))
        timeline(document.querySelectorAll('.timeline'));
    }


}

function make3d(models) {
    for (const model of models) {
        let poster = ''
        let currentmodel = ''
        for (const file of model.files) {
            if (file.includes('glb')) currentmodel = file
            if (file.includes('webp')) poster = file
        }
        const itemTemplate = document.createElement('div');
        itemTemplate.className = 'item';
        itemTemplate.innerHTML = `
    <div class="item-content item-3d">
      <div class="card">
      <div class="card-body">        
            <model-viewer
            class="model-3d hover-img"
                alt="${model.name}"
                src="${uploadPath}/${currentmodel}"
                shadow-intensity="1"
                poster="${uploadPath}/${poster}"
                loading="lazy"
                camera-controls
                auto-rotate
                auto-rotate-delay="0"
        ></model-viewer>
        <div class="btn-panel text-end ">
            <span onclick="enlarge3d(${'\'' + currentmodel + '\''},${'\'' + poster + '\''},${'\'' + model.name + '\''})" class="img-btn line-fade-m"><i class="fullscreen-btn bi bi-arrows-fullscreen"></i></a>
        </div>              
      </div>
      </div>

    </div>
  `;
        grid.add(itemTemplate)
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
                    auto-rotate
                    auto-rotate-delay="0"
            ></model-viewer>
            <button id="closebutton" type="button" class="btn btn-outline-light" title="Close Window" onclick="history.back()" aria-label="Close"><i class="bi bi-x-lg"></i></button>
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

function extractImages(images) {
    const itemTemplate = document.createElement('div');
    let galLength = images.length
    let galClass = 'item-content'
    if (galLength > 5) galClass = 'item-content gal-100'

    itemTemplate.className = 'item';
    itemTemplate.innerHTML = `
    <div class="${galClass}">
      <div class="card">
        <div class="card-body">
            <div id="gallery" class="gallery"></div>
        </div>
      </div>
    </div>
  `;
    grid.add(itemTemplate)
    setGallery(images)
}

function setGallery(images) {

    grid2 = new Muuri('.gallery', {
        layout: {
            fillGaps: true
        }
    });

    for (const img of images) {
        const itemTemplate = document.createElement('div');
        let currentStyle = 'max-width: 250px; max-height: 250px';

        itemTemplate.className = 'gal-item';
        let returnHtml = ''
        returnHtml += `
    <div className="gal-item-content">
        <img class="img-fluid hover-img" style="${currentStyle}" src="${img.path}">
        <div class="btn-panel text-end ">
            <a href="/iiif/${img.id.split('.')[0]}" title="${languageTranslations._openInViewer}" class="img-btn line-fade-m"><img src="/static/icons/iiif.png"></a>
        </div>
    </div>
  `
        itemTemplate.innerHTML = returnHtml
        grid2.add(itemTemplate);
    }

}

function setmap() {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.innerHTML = `
    <div class="item-content">
      <div class="card">
        <div class="card-body">
            <div id="map"></div>
        </div>
      </div>
    </div>
  `;
    return itemTemplate
}


function extractPlaceInfo(data) {
    const connections = data.connections;

    const placeInfo = [];

    for (const connection of connections) {
        if (connection.class === 'place') {
            const nodes = connection.nodes;
            const placeDataArray = nodes.map(node => {
                if (typeof (node.spatialinfo) !== 'undefined') {
                    return {
                        id: node.spatialinfo.properties.place_id,
                        _label: node.spatialinfo.properties._label,
                        type: node.spatialinfo.properties.type,
                        link: node.involvement,
                        coordinates: node.spatialinfo.geometry.geometries[0].coordinates,
                        geometryType: node.spatialinfo.geometry.geometries[0].type
                    }
                }
            });
            for (const place of placeDataArray) {
                if (typeof (place) !== 'undefined') placeInfo.push(place)
            }
        }
    }

    return placeInfo

}

function setMarkers(data) {

    map = L.map('map', {minZoom: 2, maxZoom: 17, worldCopyJump: false, dragging: false});
    let Markers = []
    L.control.layers(baseMaps).addTo(map);
    for (const place of data) {
        let links = '';
        if (typeof (place) !== 'undefined' && place.geometryType === 'Point') {
            const [latitude, longitude] = place.coordinates;
            const label = getLabelTranslation(place);
            const type = getTypeTranslation(place.type);
            for (const invo of place.link) {
                const currentlink = getTypeTranslation(invo.origin);
                links += '<i>' + getTypeTranslation(invo.property) + ':     </i>' + currentlink + '<br>'
            }

            const popupContent = `<a href="/view/${place.id}">${label}</a> (${type})<br>${links}`;
            const circleMarker = L.circleMarker([longitude, latitude], CircleStyle)
                .bindPopup(popupContent);
            Markers.push(circleMarker)
            let ClMarker = L.marker([longitude, latitude]).bindPopup(popupContent);
            Clmarkers.addLayer(ClMarker)
        }
        if (typeof (place) !== 'undefined' && place.geometryType === 'Polygon') {
            const label = getLabelTranslation(place);
            const type = getTypeTranslation(place.type);
            for (const invo of place.link) {
                const currentlink = getTypeTranslation(invo.origin);
                links += '<i>' + getTypeTranslation(invo.property) + ':     </i>' + currentlink + '<br>'
            }
            const popupContent = `<a href="/view/${place.id}">${label}</a> (${type})<br>${links}`;
            const polygon = {
                "type": "Feature",
                "geometry": {
                    "type": place.geometryType,
                    "coordinates": place.coordinates
                }
            };

            const drawpolygon = L.geoJSON(polygon).bindPopup(popupContent);
            Markers.push(drawpolygon)
        }
    }
    OpenStreetMap.addTo(map)
    const Features = new L.FeatureGroup(Markers)
    let bounds = Features.getBounds()
    map.addLayer(Clmarkers);

    map.fitBounds(bounds, {
        padding: [150, 150]
    })

}


function addMuuri(data) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    let first = false;
    let last = false;
    let both = false;

    if (data.start !== undefined) {
        first = true;
    }

    if (data.end !== undefined) {
        last = true;
    }

    if (first && last) {
        first = false;
        last = false;
        both = true;
    }

    itemTemplate.innerHTML = `
    <div class="item-content item-content-main">
      <div class="card">
        <div class="card-body">
            <h3 class="card-title">${getLabelTranslation(data)}</h3>
            ${getAliases(data)}
            ${data.type ? `<p class="card-title">${getTypeTranslation(data.type)}</p>` : ''}
            ${both ? `<p class="card-title">${makeLocalDate(data.start)} - ${makeLocalDate(data.end)}</p>` : ''}
            ${first ? `<p class="card-title">${makeLocalDate(data.start)}</p>` : ''}
            ${last ? `<p class="card-title">${makeLocalDate(data.end)}</p>` : ''}
            <p class="card-text mt-2">${getLanguage(data.content)}</p>
            ${getTypes(data)}
            ${getMatchingNodes(refSys, data)}
        </div>
      </div>
    </div>
  `;


    return itemTemplate;
}

function getAliases(data) {
    const connections = data.connections;
    const aliases = [];

    for (const connection of connections) {
        if (connection.class === 'appellation') {
            const nodes = connection.nodes;
            const aliasArray = nodes
                .filter(node => typeof node !== 'undefined')
                .map(node => node._label.name);
            aliases.push(...aliasArray);
        }
    }

    if (aliases.length === 0) {
        return '';
    }

    return '<p>Alias: ' + aliases.join(', ') + '</p>';
}

function getTypes(data) {
    const typeConnections = data.connections.filter(
        (connection) => connection.class === "type"
    );

    const result = [];

    typeConnections.forEach((connection) => {
        connection.nodes.forEach((node) => {
            const entry = {
                name: node._label,
                root: getTypeTranslation(node.root_type)
            };

            if (node.involvement && node.involvement[0] && node.involvement[0].info) {
                entry.value = node.involvement[0].info;
            } else {
                entry.value = ''
            }

            if (node.content && node.content.description) {
                entry.unit = node.content.description;
            } else {
                entry.unit = ''
            }

            result.push(entry);
        });
    });

    if (result.length === 0) {
        return '';
    }
    let returnHtml = ''
    for (const node of result) {
        returnHtml += '<span class="badge text-bg-light me-2" title="' + node.root + ' ' + node.value + ' ' + node.unit + '">' + getTypeTranslation(node.name) + '</span>'
    }
    return returnHtml;
}

function getSources(sourceConnections) {

    const result = [];

    sourceConnections.forEach((connection) => {
        let current_class = connection.class
        connection.nodes.forEach((node) => {
            const entry = {
                name: node._label.name,
                class: current_class
            };
            if (node.type) {
                entry.type = getTypeTranslation(node.type)
            } else {
                entry.type = ''
            }

            if (node.involvement && node.involvement[0] && node.involvement[0].info) {
                entry.pages = node.involvement[0].info;
            } else {
                entry.pages = ''
            }

            if (node.content && node.content.description) {
                entry.citation = node.content.description;
            } else {
                entry.citation = ''
            }

            result.push(entry);
        });
    });

    if (result.length === 0) {
        return '';
    }


    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    let returnHtml = `
    <div class="item-content bib-cont">
      <div class="card">
        <div class="card-body">
        <h5 class="card-title mb-3">${result.length + ' ' + languageTranslations._source}</h5>
        `

    result.forEach(source => {

        if (source.class === 'bibliography') {
            returnHtml += `
        <p class="card-text"><i class="me-3 bi bi-book"></i>${source.citation} ${source.pages}</p>
        `
        } else {
            let linktext = source.name;
            if (source.citation !== '') linktext = source.citation
            returnHtml += '<p class="card-text"><i class="me-3 bi bi-globe"></i><a class="breaklink inside-link" href="' + source.name + '" target="_blank"><span style="line-break: auto">' + linktext + '</span><i class="ms-1 bi bi-arrow-up-right-square"></i></a></p>'
        }
    })

    returnHtml += '</div></div></div>'
    itemTemplate.innerHTML = returnHtml
    return itemTemplate
}


function getMatchingNodes(referenceSystems, data) {
    const nodes = [];

    // Create a map of reference URLs for faster lookup
    const referenceUrlMap = {};
    for (const reference of referenceSystems) {
        referenceUrlMap[reference.id] = reference.url;
    }

    // Iterate through the "connections" in the data
    for (const connection of data.connections) {
        for (const node of connection.nodes) {
            const id = node.id;
            if (referenceUrlMap[id]) {
                const url = referenceUrlMap[id] + (node.involvement ? node.involvement[0].specification[0].info : '');

                // If the ID exists in the reference systems, add it to the result
                nodes.push({
                    id: id,
                    name: node._label.name,
                    URL: url,
                    match: connection.class === 'reference_system' ? node.involvement[0].specification[0].qualifier.name : ''
                });
            }
        }
    }

    if (nodes.length === 0) return ''
    let returnHtml = '<br>'
    for (const node of nodes) {
        returnHtml += '<span class="badge text-bg-light me-2"><a class="badge-btn line-fade line-fade-d" title="' + node.match + ' at: ' + node.name + '" href="' + node.URL + '" target="_blank">' + node.name + '</a></span>'
    }
    return returnHtml;
}


function setEvents(current_data) {

    if (['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'].includes(data._class)) {
        let main_node = {
            'begin': data.start,
            'end': data.end,
            'content': data.content,
            'id': data.id,
            'type': data.type,
            '_label': data._label,
            'involvement': [{'origin_id': 0}]
        }
        current_data.push(main_node)
    }

    current_data.sort((a, b) => {
        const dateA = new Date(a.begin);
        const dateB = new Date(b.begin);
        return dateA - dateB;
    });


    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    eventdates = []
    for (const node of current_data) {
        if (node.begin) eventdates.push(node.begin)
        if (node.end) eventdates.push(node.end)
    }

    returnHtml = `
    <div class="item-content tl-cont">
      <div class="card">
        <div class="card-body">
        <h5 id="timeline-header" class="card-title">${current_data.length + ' ' + languageTranslations._event + ' (' + makeLocalDate(eventdates[0]) + ' ' + languageTranslations._until + ' ' + makeLocalDate(eventdates[eventdates.length - 1]) + ')'}</h5>
            <div class="timeline" data-visible-items="5" data-mode="horizontal" data-move-items="3" data-force-vertical-mode="900">
                <div class="timeline__wrap">
                    <div class="timeline__items">
                
            `

    for (const event of current_data) {
        const label = getLabelTranslation(event);
        const type = getTypeTranslation(event.type);
        let titleString = ''
        let htmlClass = ''
        for (const invo of event.involvement) {
            if (invo.origin_id === data.id) {
                titleString += getTypeTranslation(invo.property) + ': ' + getTypeTranslation(invo.origin);
                htmlClass = invo.property.name.replace(' ', '-')
            }
            if (invo.origin_id === 0) {
                titleString += languageTranslations._current + ' ' + languageTranslations._event;
                htmlClass = 'this-event'
            }
        }


        let first = false;
        let last = false;
        let both = false;

        if (event.begin !== undefined) {
            first = true;
        }

        if (event.end !== undefined) {
            last = true;
        }

        if (first && last) {
            first = false;
            last = false;
            both = true;
        }

        let links = '';

        returnHtml += `
        
         <div class="timeline__item">
                <div class="timeline__content ${htmlClass}" title="${titleString}">
                    ${both ? `<span class="h6">${makeLocalDate(event.begin)} - ${makeLocalDate(event.end)}</span>` : ''}
                    ${first ? `<span class="h6">${makeLocalDate(event.begin)}</span>` : ''}
                    ${last ? `<span class="h6">${makeLocalDate(event.end)}</span>` : ''}    <br>
                    ${label} (${type})<a class="info-buttons-d line-fade line-fade-d" href="/view/${event.id}"><i class="bi bi-arrow-up-right-square"></i></a>
                </div>
            </div>
         `
    }
    returnHtml += `</div>
                </div>
            </div>
        </div>
        </div>
    </div>`

    itemTemplate.innerHTML = returnHtml
    return itemTemplate
}

function makeEnts(data, array) {
    const connections = data.connections;

    const allEnts = [];

    for (const connection of connections) {
        if (array.includes(connection.class)) {
            const nodes = connection.nodes;
            for (const node of nodes) {
                node.class = connection.class
                allEnts.push(node);

            }
        }
    }

    for (const ent of allEnts) {
        ent.involvement.sort((a, b) => {
            const dateA = new Date(a.begin);
            const dateB = new Date(b.begin);
            return dateA - dateB;
        });
    }

    allEnts.sort((a, b) => {
        const dateA = new Date(a.begin);
        const dateB = new Date(b.begin);
        return dateA - dateB;
    });


    return allEnts
}


function setEnts(current_data, class_) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    returnHtml = `
    <div class="item-content ent-content">
      <div class="card">
        <div class="card-body">
        <h5 class="card-title">${current_data.length + ' ' + returnTranslation(class_)}</h5>
        `
    let iteration = 0
    for (const currentDatum of current_data) {

        iteration += 1
        let icon = '<div><i class="h2 bi bi-person me-2"></i></div>'
        if (currentDatum.class === 'group') icon = '<div><i class="h2 bi bi-people me-2"></i></div>'
        let img = ''
        if (currentDatum.images) img = returnImage(50, currentDatum.images[0])
        const label = getLabelTranslation(currentDatum);
        let first = false;
        let last = false;
        let both = false;

        if (currentDatum.begin !== undefined) {
            first = true;
        }

        if (currentDatum.end !== undefined) {
            last = true;
        }

        if (first && last) {
            first = false;
            last = false;
            both = true;
        }

        returnHtml += `

                <div>
                <div class="actor-box mt-3" title="">
                ${icon}<span class="h5 me-4">${label}<a class="info-buttons line-fade line-fade" href="/view/${currentDatum.id}"><i class="bi bi-arrow-up-right-square"></i></a></span> ${img}
                `
        if (typeof (currentDatum.involvement) !== 'undefined') {
            let invo = currentDatum.involvement
            invo.sort(customSortInvolvement)
            let propstring = ''
            let subevents = 0
            let subevents_strings = ''
            invo.forEach(involvment => {
                    if (involvment.origin_id === data.id) {
                        propstring += '<div class="mt-2 margin-event">' + getTypeTranslation(involvment.property) + ': <i>' + getTypeTranslation(involvment.origin) + ' </i>'

                        if (typeof (involvment.specification) !== 'undefined') {
                            propstring += ' ('
                            for (const spec of involvment.specification) {


                                if (spec.invbegin !== undefined) {
                                    propstring += makeLocalDate(spec.invbegin)
                                }

                                if (spec.invbegin !== undefined && spec.invend !== undefined) {
                                    propstring += ' '
                                }

                                if (spec.invend !== undefined) {
                                    propstring += languageTranslations._until + ' ' + makeLocalDate(spec.invend)
                                }

                                propstring += ' '

                                if (spec.qualifier !== undefined) {
                                    propstring += languageTranslations._as + ' ' + getTypeTranslation(spec.qualifier)
                                }
                                propstring += ')'
                            }


                        }
                        propstring += '</div>'
                    } else {
                        subevents_strings += '<div class="mt-2 margin-event">' + getTypeTranslation(involvment.property) + ': <i><a class="breaklink inside-link" href="/view/' + involvment.origin_id + '"><span style="line-break: auto">' + getTypeTranslation(involvment.origin) + ' </span></a></i>'

                        if (typeof (involvment.specification) !== 'undefined') {
                            let current_spec = ' ('
                            for (const spec of involvment.specification) {


                                if (spec.invbegin !== undefined) {
                                    current_spec += makeLocalDate(spec.invbegin)
                                }

                                if (spec.invbegin !== undefined && spec.invend !== undefined) {
                                    current_spec += ' '
                                }

                                if (spec.invend !== undefined) {
                                    current_spec += languageTranslations._until + ' ' + makeLocalDate(spec.invend) + ' '
                                }


                                if (spec.qualifier !== undefined) {
                                    current_spec += languageTranslations._as + ' ' + getTypeTranslation(spec.qualifier)
                                }
                                current_spec += ')'

                                subevents_strings += current_spec
                            }
                        }
                        subevents += 1
                        subevents_strings += '</div>'
                    }
                }
            )

            if (subevents > 0) {
                propstring += '<div class="accordion sub-info-accordion accordion-flush" id="subInfoAccordion-' + class_ + '_' + iteration + '">\n' +
                    '  <div class="accordion-item">\n' +
                    '    <h2 class="accordion-header">\n' +
                    '      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapse-' + class_ + '_' + iteration + '" aria-expanded="false" aria-controls="flush-collapseOne">\n' +
                    '        ' + subevents + ' indirect connections\n' +
                    '      </button>\n' +
                    '    </h2>\n' +
                    '    <div id="flush-collapse-' + class_ + '_' + iteration + '" class="accordion-collapse collapse" data-bs-parent="#subInfoAccordion-' + class_ + '_' + iteration + '">\n' +
                    '      <div class="accordion-body">' + subevents_strings + '</div>\n' +
                    '    </div>\n' +
                    '  </div>\n' +
                    '</div>'
            }


            returnHtml += '<br><span>' + propstring + '</span>'
        }
        returnHtml += '</div></div>'

    }

    returnHtml += `
            </div>
        </div>
    </div>`

    itemTemplate.innerHTML = returnHtml
    return itemTemplate
}

function returnImage(height, id) {
    let path = iiifUrl + id + '/full/,' + height + '/0/default.jpg'
    let img = `<img src="${path}" loading="eager">`
    return img
}

