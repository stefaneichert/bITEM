const Clmarkers = L.markerClusterGroup({singleMarkerMode: true, maxClusterRadius: 1})

window.onload = function () {
    if (typeof (grid2) != 'undefined') grid2.refreshItems().layout();
    grid.refreshItems().layout();
    setTimeout(() => {
        grid.refreshItems().layout();
    }, 100);
    document.body.classList.add('images-loaded');
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
        grid.add(setActors(actors))
    }

    let items = makeEnts(obj, ['artifact'])
    if (items.length > 0) {
        grid.add(setArtifacts(items))
    }


    let images = (obj.images)
    if (images) {
        extractImages(images);

    }

    let events = makeEvents(data)
    if (events.length > 0) {
        grid.add(setEvents(events))
        timeline(document.querySelectorAll('.timeline'));
    }


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
            <a href="/iiif/${img.id}" title="${languageTranslations._openInViewer}" class="img-btn line-fade-m"><img src="/static/icons/iiif.png"></a>
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
                        link: node.link,
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
        if (typeof (place) !== 'undefined' && place.geometryType === 'Point') {
            const [latitude, longitude] = place.coordinates;
            const label = getLabelTranslation(place);
            const type = getTypeTranslation(place.type);
            const property = getTypeTranslation(place.link.property);
            const link = getLabelTranslation(place.link);
            const popupContent = `\"${link + '\" ' + property + ': '}<a href="/view/${place.id}">${label}</a> (${type})`;
            const circleMarker = L.circleMarker([longitude, latitude], CircleStyle)
                .bindPopup(popupContent);
            Markers.push(circleMarker)
            let ClMarker = L.marker([longitude, latitude]).bindPopup(popupContent);
            Clmarkers.addLayer(ClMarker)
        }
        if (typeof (place) !== 'undefined' && place.geometryType === 'Polygon') {
            const label = getLabelTranslation(place);
            const type = getTypeTranslation(place.type);
            const property = getTypeTranslation(place.link.property);
            const link = getLabelTranslation(place.link);
            const popupContent = `\"${link + '\" ' + property + ': '}<a href="/view/${place.id}">${label}</a> (${type})`;
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
        <h5 class="card-title mb-3">${result.length + ' Sources'}</h5>
        `

    result.forEach(source => {

        if (source.class === 'bibliography') {
            returnHtml += `
        <p class="card-text"><i class="me-3 bi bi-book"></i>${source.citation} ${source.pages}</p>
        `
        } else {
            let linktext = source.name;
            if (source.citation !== '') linktext = source.citation
            returnHtml += '<p class="card-text"><i class="me-3 bi bi-globe"></i><a class="breaklink" href="' + source.name + '" target="_blank"><span style="line-break: anywhere">' + linktext + '</span><i class="ms-1 bi bi-arrow-up-right-square"></i></a></p>'
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
                const url = referenceUrlMap[id] + (node.involvement ? node.involvement[0].info : '');
                // If the ID exists in the reference systems, add it to the result
                nodes.push({
                    id: id,
                    name: node._label.name,
                    URL: url,
                    match: connection.class === 'reference_system' ? 'exact match' : ''
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


function makeEvents(data) {
    const connections = data.connections;
    eventdates = []

    const allEvents = [];

    for (const connection of connections) {
        if (['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'].includes(connection.class)) {
            const nodes = connection.nodes;
            const eventarray = nodes.map(node => {
                if (typeof (node) !== 'undefined') {
                    return {
                        qualifier: node.link.property,
                        origin: node.link.origin,
                        id: node.id,
                        _label: node._label,
                        type: node.type,
                        begin: node.begin,
                        end: node.end,
                    }
                }
            });
            allEvents.push(...eventarray);
            allEvents.sort((a, b) => {
                const dateA = new Date(a.begin);
                const dateB = new Date(b.begin);
                return dateA - dateB;
            });
        }
        for (const node of allEvents) {
            if (node.begin) eventdates.push(node.begin)
            if (node.end) eventdates.push(node.end)
        }
    }
    return allEvents
}

function setEvents(data) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    returnHtml = `
    <div class="item-content tl-cont">
      <div class="card">
        <div class="card-body">
        <h5 id="timeline-header" class="card-title">${data.length + ' ' + languageTranslations._events + ' (' + makeLocalDate(eventdates[0]) + ' ' + languageTranslations._until + ' ' + makeLocalDate(eventdates[eventdates.length - 1]) + ')'}</h5>
            <div class="timeline" data-visible-items="5" data-mode="horizontal" data-move-items="3" data-force-vertical-mode="900">
                <div class="timeline__wrap">
                    <div class="timeline__items">
                
            `

    for (const event of data) {
        const label = getLabelTranslation(event);
        const type = getTypeTranslation(event.type);
        const link = getTypeTranslation(event.qualifier);
        const origin = getTypeTranslation(event.origin);

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

        returnHtml += `

         <div class="timeline__item">
                <div class="timeline__content">
                    ${both ? `<span class="h6">${makeLocalDate(event.begin)} - ${makeLocalDate(event.end)}</span>` : ''}
                    ${first ? `<span class="h6">${makeLocalDate(event.begin)}</span>` : ''}
                    ${last ? `<span class="h6">${makeLocalDate(event.end)}</span>` : ''}    <br>
                    "${origin}" ${link}: ${label} (${type})<a class="info-buttons-d line-fade line-fade-d" href="/view/${event.id}"><i class="bi bi-arrow-up-right-square"></i></a>
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

    const allActors = [];

    for (const connection of connections) {
        if (array.includes(connection.class)) {
            const nodes = connection.nodes;
            for (const node of nodes) {
                if (typeof (node.involvement) != 'undefined') {
                    node.involvement.sort((a, b) => {
                        const dateA = new Date(a.invbegin);
                        const dateB = new Date(b.invend);
                        return dateA - dateB;
                    });
                }
                node.class = connection.class
                allActors.push(node);

            }
        }
    }
    allActors.sort((a, b) => {
        const dateA = new Date(a.begin);
        const dateB = new Date(b.begin);
        return dateA - dateB;
    });
    return allActors
}

function setActors(data) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    returnHtml = `
    <div class="item-content">
      <div class="card">
        <div class="card-body">
        <h5 class="card-title">${data.length + ' ' + languageTranslations._actors}</h5>
        `

    for (const actor of data) {
        let icon = '<div><i class="h2 bi bi-person me-2"></i></div>'
        if (actor.class === 'group') icon = '<div><i class="h2 bi bi-people me-2"></i></div>'
        let img = ''
        if (actor.images) img = returnImage(50, actor.images[0])
        const label = getLabelTranslation(actor);
        let first = false;
        let last = false;
        let both = false;

        if (actor.begin !== undefined) {
            first = true;
        }

        if (actor.end !== undefined) {
            last = true;
        }

        if (first && last) {
            first = false;
            last = false;
            both = true;
        }

        returnHtml += `

                <div class="row justify-content-between">
                <div class="col-auto">
                <div class="actor-box mt-3" title="${getTypeTranslation(actor.link.origin)} ${getTypeTranslation(actor.link.property)} ${getLabelTranslation(actor)}">
                ${icon}<span class="h5 me-2">${label}<a class="info-buttons line-fade line-fade" href="/view/${actor.id}"><i class="bi bi-arrow-up-right-square"></i></a></span>
                `
        if (typeof (actor.involvement) !== 'undefined') {
            let invo = actor.involvement
            invo.sort(customSortInvolvement)
            invo.forEach(involvment => {
                let propstring = ''

                if (involvment.invbegin !== undefined) {
                    propstring += makeLocalDate(involvment.invbegin)
                }

                if (involvment.invbegin !== undefined && involvment.invend !== undefined) {
                    propstring += ' '
                }

                if (involvment.invend !== undefined) {
                    propstring += languageTranslations._until + ' ' + makeLocalDate(involvment.invend)
                }

                propstring += ' '

                if (involvment.qualifier !== undefined) {
                    propstring += languageTranslations._as + ' ' + getTypeTranslation(involvment.qualifier)
                }
                returnHtml += '<br><span class="ms-5">' + propstring + '</span>'

            })
        }
        returnHtml += '</div></div><div class="col-auto mt-3">' + img + '</div></div>'

    }
    returnHtml += `
        </div>
        </div>
        </div>
    </div>`

    itemTemplate.innerHTML = returnHtml
    return itemTemplate
}

function setArtifacts(data) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';

    returnHtml = `
    <div class="item-content">
      <div class="card">
        <div class="card-body">
        <h5 class="card-title">${data.length + ' ' + languageTranslations._items}</h5>
        `

    for (const item of data) {
        let img = ''
        if (item.images) img = returnImage(50, item.images[0])
        const label = getLabelTranslation(item);
        let first = false;
        let last = false;
        let both = false;

        if (item.begin !== undefined) {
            first = true;
        }

        if (item.end !== undefined) {
            last = true;
        }

        if (first && last) {
            first = false;
            last = false;
            both = true;
        }

        returnHtml += `

                <div class="row justify-content-between">
                <div class="col-auto">
                <div class="actor-box mt-3" title="${getTypeTranslation(item.link.origin)} ${getTypeTranslation(item.link.property)} ${getLabelTranslation(item)}">
                <span class="h5 me-2">${label} (${getTypeTranslation(item.type)}) <a class="info-buttons line-fade line-fade" href="/view/${item.id}"><i class="bi bi-arrow-up-right-square"></i></a></span>
                `
        if (typeof (item.involvement) !== 'undefined') {
            let invo = item.involvement
            invo.sort(customSortInvolvement)
            invo.forEach(involvment => {
                let propstring = ''

                if (involvment.invbegin !== undefined) {
                    propstring += makeLocalDate(involvment.invbegin)
                }

                if (involvment.invbegin !== undefined && involvment.invend !== undefined) {
                    propstring += ' '
                }

                if (involvment.invend !== undefined) {
                    propstring += languageTranslations._until + ' ' + makeLocalDate(involvment.invend)
                }

                propstring += ' '

                if (involvment.qualifier !== undefined) {
                    propstring += languageTranslations._as + ' ' + getTypeTranslation(involvment.qualifier)
                }
                returnHtml += '<br><span class="ms-5">' + propstring + '</span>'

            })
        }
        returnHtml += '</div></div><div class="col-auto mt-3">' + img + '</div></div>'

    }
    returnHtml += `
        </div>
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

