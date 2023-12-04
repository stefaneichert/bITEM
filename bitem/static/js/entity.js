const Clmarkers = L.markerClusterGroup({singleMarkerMode: true, maxClusterRadius: 1})
let mapindex = 0;
let network
let networkData
let nodesDataset
let edgesDataset
let allNodes
let allEdges


const filterClasses = document.getElementById('filterClasses')
const headlineBox = document.getElementById('headlineBox')

const classFilterOptions = {
    'main': {
        'icon': '<i class="bi  bi-info-lg"></i>',
        'title': 'Info',
    },
    'source': {
        'icon': '<i class="bi  bi-book"></i>',
        'title': languageTranslations._sources,
    },
    'imgs': {
        'icon': '<i class="bi  bi-images"></i>',
        'title': languageTranslations._img,
    },
    'threed': {
        'icon': '<i class="bi  bi-badge-3d"></i>',
        'title': languageTranslations._threedModel,
    },
    'map': {
        'icon': '<i class="bi  bi-map"></i>',
        'title': languageTranslations._map,
    },
    'actors': {
        'icon': '<i class="bi  bi-people"></i>',
        'title': languageTranslations._actors,
    },
    'items': {
        'icon': '<i class="bi  bi-box-seam"></i>',
        'title': languageTranslations._items,
    },
    'events': {
        'icon': '<i class="bi  bi-calendar4-week"></i>',
        'title': languageTranslations._events,
    },
    'network': {
        'icon': '<i class="bi bi-diagram-3"></i>',
        'title': languageTranslations._network,
    },
}

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

function moveToFirst(itemId) {
    // Find the item by data-id
    const itemToMove = grid.getItems().find(item => item.getElement().dataset.id === itemId);
    if (itemToMove) {
        // Get the first item in the grid
        if (mapindex === 0) {
            grid.move(itemToMove, 0);
            mapindex = itemToMove._id - 2;
        } else {
            grid.move(itemToMove, mapindex);
            mapindex = 0;
        }
        if (itemId === 'map') {
            toggleDragging();
            toggleMouseWheelZoom();
        }
    }
}

function toggleDragging() {
    map.dragging.enabled() ? map.dragging.disable() : map.dragging.enable();
}

// Function to enable or disable mouse wheel zoom
function toggleMouseWheelZoom() {
    map.scrollWheelZoom.enabled() ? map.scrollWheelZoom.disable() : map.scrollWheelZoom.enable();
}

createMuuriElems(data)

function createMuuriElems(obj) {
    const elem = addMuuri(obj);
    grid.add(elem);

    let models = (obj.models)
    if (models) {
        make3d(models)
        addFilter('threed', models.length)
    }


    let sourceConnections = data.connections.filter(
        (connection) => ['external_reference', 'bibliography'].includes(connection.class)
    );
    if (sourceConnections.length > 0) {
        grid.add(getSources(sourceConnections));
        addFilter('source', sourceConnections.length)
    }

    let actors = makeEnts(obj, ['group', 'person'])
    if (actors.length > 0) {
        grid.add(setEnts(actors, '_actor'))
        addFilter('actors', actors.length)
    }

    makeNetwork()
    addFilter('network', 0)

    const placeInfo = extractPlaceInfo(data)
    if (placeInfo.length > 0) {
        grid.add(setmap())
        setMarkers(placeInfo)
        const enlargeBtn = document.getElementById('map-large')
        const currentMapCont = document.getElementById('map-large-cont')
        const currentMap = document.getElementById('map')
        enlargeBtn.addEventListener('click', event => {
            setTimeout(() => {
                currentMap.classList.toggle('large-map')
                currentMapCont.classList.toggle('large-map')
                map.invalidateSize()
                moveToFirst('map')
                grid.refreshItems().layout();
            }, 400);
        })
        addFilter('map')

    }


    let items = makeEnts(obj, ['artifact'])
    if (items.length > 0) {
        grid.add(setEnts(items, '_item'))
        addFilter('items', items.length)
    }


    let images = (obj.images)
    if (images) {
        extractImages(images);
        addFilter('imgs', images.length)
    }

    let events = makeEnts(obj, ['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'])
    if (events.length > 0) {
        grid.add(setEvents(events))
        timeline(document.querySelectorAll('.timeline'));
        addFilter('events', events.length)
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
        itemTemplate.dataset.class = 'threed';
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
        <div class="btn-panel">
            <span onclick="enlarge3d(${'\'' + currentmodel + '\''},${'\'' + poster + '\''},${'\'' + model.name + '\''})" class="img-btn"><i class="fullscreen-btn bi bi-arrows-fullscreen"></i></a>
        </div>              
      </div>
      </div>

    </div>
  `;
        grid.add(itemTemplate)
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
    //grid.add(itemTemplate)
    setGallery(images)
}

function setGallery(images) {

    /*grid2 = new Muuri('.gallery', {
        layout: {
            fillGaps: true
        }
    });*/

    for (const img of images) {
        const itemTemplate = document.createElement('div');
        itemTemplate.dataset.class = 'imgs'
        let currentStyle = 'max-width: 350px; max-height: 350px';

        itemTemplate.className = 'gal-item';
        let returnHtml = ''
        returnHtml += `
    <div className="gal-item-content">
        <img class="img-fluid hover-img" style="${currentStyle}" src="${img.path}">
        <div class="btn-panel">
            <a href="/iiif/${img.id.split('.')[0]}" title="${languageTranslations._openInViewer}" class="img-btn"><img src="/static/icons/iiif.png"></a>
        </div>
    </div>
  `
        itemTemplate.innerHTML = returnHtml
        //grid2.add(itemTemplate);
        grid.add(itemTemplate);
    }

}

function setmap() {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.dataset.id = 'map'
    itemTemplate.dataset.class = 'map'
    itemTemplate.innerHTML = `
    <div class="item-content">
      <div class="card" id="map-large-cont">
        <div class="card-body map-body">
            <div id="map">
            <div class="btn-panel">
            <a href="#"  id="map-large" class="img-btn"><i class="bi bi-arrows-fullscreen"></i></a>
            </div>
        </div>
        </div>
      </div>
    </div>
  `;
    return itemTemplate
}


function extractPlaceInfo(data) {
    const connections = data.connections;

    let placeInfo = [];

    for (const connection of connections) {
        if (connection.class === 'place') {
            const nodes = connection.nodes;
            nodes.forEach((node) => {
                if (typeof (node.spatialinfo) !== 'undefined') {
                    const spatialEnts = node.spatialinfo.geometry.geometries
                    for (const geom of spatialEnts) {
                        let current_geom = {
                            'id': node.spatialinfo.properties.place_id,
                            '_label': node.spatialinfo.properties._label,
                            'type': node.spatialinfo.properties.type,
                            'link': node.involvement,
                            'coordinates': geom.coordinates,
                            'geometryType': geom.type,
                            'name': geom.name,
                            'description': geom.description,
                            'geometryClass': geom.geomtype
                        }
                        placeInfo.push(current_geom)
                    }
                }
            })
        }
    }

    const uniqueObjectsMap = new Map();

    placeInfo.forEach(obj => {
        // Exclude the "link" property for comparison
        const {link, ...objectWithoutLink} = obj;

        // Convert the remaining properties to a string for use as a Map key
        const key = JSON.stringify(objectWithoutLink);

        // If the key doesn't exist in the Map, add it with the original object
        if (!uniqueObjectsMap.has(key)) {
            uniqueObjectsMap.set(key, obj);
        } else {
            // If the key already exists, merge the "link" properties
            uniqueObjectsMap.get(key).link.push(...obj.link);
        }
    });

// Convert the Map values back to an array
    const mergedData = Array.from(uniqueObjectsMap.values());

    return mergedData

}

function setMarkers(data) {
    map = L.map('map', {minZoom: 2, maxZoom: 17, worldCopyJump: false, dragging: false, scrollWheelZoom: false});
    let Markers = []
    L.control.layers(baseMaps).addTo(map);
    for (const place of data) {
        let links = '';
        if (typeof (place) !== 'undefined' && place.geometryType === 'Point') {
            const [latitude, longitude] = place.coordinates;
            const label = languageTranslations._locationof + ' ' + getLabelTranslation(place);
            const type = getTypeTranslation(place.type);
            for (const invo of place.link) {
                let propname = ''
                if (invo.property.name === 'is composed of') {
                    propname = languageTranslations._iscomposedof
                } else {
                    propname = getTypeTranslation(invo.property)
                }
                const currentlink = getTypeTranslation(invo.origin);
                let link = '<i>' + propname + ':     </i>' + currentlink + '<br>'
                if (!links.includes(link)) links += link
            }

            let desc = ''
            let center = ''
            if (place.geometryClass === 'derived_point') center = languageTranslations._centerpointof
            if (place.name || place.description) {
                desc = '<br>'
                if (place.name) desc += place.name
                if (place.name && place.description) desc += ': ' + place.description
                if (!place.name && place.description) desc += place.description
                desc += '<br>'
            }
            const popupContent = `${center} <a href="/view/${place.id}">${label}</a> (${type})<br>
                                            ${desc}
                                           <br>${links}`;
            const circleMarker = L.circleMarker([longitude, latitude], CircleStyle)
                .bindPopup(popupContent);
            Markers.push(circleMarker)
            let ClMarker = L.marker([longitude, latitude]).bindPopup(popupContent);
            Clmarkers.addLayer(ClMarker)
        }
        if (typeof (place) !== 'undefined' && place.geometryType === 'Polygon') {
            const label = languageTranslations._locationof + ' ' + getLabelTranslation(place);
            const type = getTypeTranslation(place.type);
            for (const invo of place.link) {
                let propname = ''
                if (invo.property.name === 'is composed of') {
                    propname = languageTranslations._iscomposedof
                } else {
                    propname = getTypeTranslation(invo.property)
                }
                const currentlink = getTypeTranslation(invo.origin);
                let link = '<i>' + propname + ':     </i>' + currentlink + '<br>'
                if (!links.includes(link)) links += link
            }

            let desc = ''
            if (place.name || place.description) {
                desc = '<br>'
                if (place.name) desc += place.name
                if (place.name && place.description) desc += ': ' + place.description
                if (!place.name && place.description) desc += place.description
                desc += '<br>'
            }
            const popupContent = `${languageTranslations._areaof} <a href="/view/${place.id}">${label}</a> (${type})<br>
                                            ${desc}
                                           <br>${links}`;
            const polygon = {
                "type": "Feature",
                "geometry": {
                    "type": place.geometryType,
                    "coordinates": place.coordinates
                }
            };

            const drawpolygon = L.geoJSON(polygon).bindPopup(popupContent);
            Markers.push(drawpolygon)
            drawpolygon.addTo(map)
        }
    }
    OpenStreetMap.addTo(map)
    const Features = new L.FeatureGroup(Markers)
    let bounds = Features.getBounds()
    map.addLayer(Clmarkers);

    map.fitBounds(bounds, {
        padding: [50, 50]
    })
    const currentZoom = map.getZoom()
    if (currentZoom > 11) map.setZoom(11)


}


function addMuuri(data) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.dataset.class = 'main'

    let first = false;
    let last = false;
    let both = false;
    const startDate = makeLocalDate(data.start).localdate;
    const endDate = makeLocalDate(data.end).localdate;
    const year = startDate !== '?' && endDate !== '?' && startDate === endDate;

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

    if (year) {
        first = true;
        last = false;
        both = false;
    }

    headlineBox.innerHTML += '<h4>' + getLabelTranslation(data) + '</h4>'

    itemTemplate.innerHTML = `
    <div class="item-content item-content-main">
      <div class="card">
        <div class="card-body">
            <h3 class="card-title">${getLabelTranslation(data)}</h3>
            ${getAliases(data)}
            ${data.type ? `<p class="card-title">${getTypeTranslation(data.type)}</p>` : ''}
            ${both ? `<p class="card-title">${makeLocalDate(data.start).localdate} - ${makeLocalDate(data.end).localdate}</p>` : ''}
            ${first ? `<p class="card-title">${makeLocalDate(data.start).localdate}</p>` : ''}
            ${last ? `<p class="card-title">${makeLocalDate(data.end).localdate}</p>` : ''}
            <p class="card-text mt-2">${getLanguage(data.content)}</p>
            ${getTypes(data)}
            ${getMatchingNodes(refSys, data)}
        </div>
      </div>
    </div>
  `;

    return itemTemplate;
}


function makeNetwork() {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.dataset.class = 'network'
    itemTemplate.dataset.id = 'network'
    itemTemplate.innerHTML = `
    <div class="item-content item-content-network" id="network-cont">
    <div id="network" ></div>
    <a href="#"  id="ntw-large" class="img-btn"><i class="bi bi-arrows-fullscreen"></i></a>
    <span class="bitem-text" id="loadingspinner">
        <div class="spinner-border" role="status"></div>
    </span>
    </div>
  `;

    let group = ''
    const nodes = [];
    const edges = [];
    const excludeArray = Object.values(translationIDs)

    const mainNode = {
        'id': data.id,
        'label': getLabelTranslation(data),
        'hiddenLabel': getLabelTranslation(data),
        'group': data._class,
        'size': 20,
        'borderWidth': 5,
        'color': returnGroupColor(data._class),
        'font': {
            size: 12,
            color: 'rgb(245, 245, 245)'
        },
    }
    nodes.push(mainNode)
    let i = 0
    for (const connection of data.connections) {
        group = connection.class

        connection.nodes.forEach(node => {
            let newnode = {
                'id': node.id,
                'label': getTypeTranslation(node._label),
                'hiddenLabel': getTypeTranslation(node._label),
                'group': group,
                'size': 10,
                'color': returnGroupColor(group)
            }
            if (!nodes.includes(newnode) && !excludeArray.includes(newnode.id)) nodes.push(newnode);
            node.involvement.forEach(invo => {
                let newedge = {
                    to: invo.origin_id,
                    from: node.id,
                    label: undefined,
                    property_code: invo.property.property_code,
                    hiddenLabel: getTypeTranslation(invo.property),
                }
                if (!edges.includes(newedge) && !excludeArray.includes(newedge.to)) edges.push(newedge);

            })
        })
    }

    grid.add(itemTemplate);

    const enlargeNtBtn = document.getElementById('ntw-large')
    const currentNtCont = document.getElementById('network-cont')
    enlargeNtBtn.addEventListener('click', event => {
        setTimeout(() => {
            currentNtCont.classList.toggle('large-map')
            currentNtCont.classList.toggle('item-content-network')
            moveToFirst('network')
            grid.refreshItems().layout();
        }, 400);
    })

    nodesDataset = new vis.DataSet(nodes);
    edgesDataset = new vis.DataSet(edges);
    networkData = {nodes: nodesDataset, edges: edgesDataset};
    let curveStyle = {type: 'dynamic'}

    let physics = {}
    let layoutdetail = true

    if (edges.length > 150) {
        physics = {
            "repulsion": {
                "nodeDistance": 20 + parseInt((edges.length) / 3)
            },
            "minVelocity": 0.75,
            "solver": "repulsion"

        }
    }


    if (edges.length > 400) {
        curveStyle = false
        physics = {
            "repulsion": {
                "nodeDistance": parseInt(145 + (edges.length) / 3)
            },
            "minVelocity": 0.75,
            "solver": "repulsion"
        }
        layoutdetail = false;

    }


    const options = {
        interaction: {
            selectable: true,
            selectConnectedEdges: false,
            hover: true,
            hoverConnectedEdges: true,
        },
        nodes: {
            shape: 'dot',
            borderWidth: 0,
            font: {
                size: 10,
                color: 'rgba(245, 245, 245, 0.5)',
                strokeWidth: 0,
            },
        },
        edges: {
            font: {
                size: 10,
                color: 'white',
                strokeWidth: 0,
            },
            arrows: {
                to: {
                    scaleFactor: 0.25,
                },
            },
            smooth: curveStyle
        },
        physics: physics,
        layout: {improvedLayout: layoutdetail}
    };


    const networkContainer = document.getElementById('network');
    network = new vis.Network(networkContainer, networkData, options);
    network.once("stabilizationIterationsDone", function () {
        setTimeout(function () {
            document.getElementById('loadingspinner').classList.add('d-none')

            //options.physics = false
            //network.setOptions(options)

        }, 200);
    });

    allNodes = nodesDataset.get({returnType: "Object"});
    allEdges = edgesDataset.get({returnType: "Object"});

    network.on("select", neighbourhoodHighlight);
}

function neighbourhoodHighlight(params) {
    let connectedEdges = []
    let connectedNodes = []

    let currentnodes = []
    if (params.node) currentnodes.push(params.node)
    if (params.nodes) currentnodes = params.nodes
    //reset all
    for (const edgeId in allEdges) {
        allEdges[edgeId].color = {opacity: 1};
        allEdges[edgeId].label = ' '

    }

    for (const nodeId in allNodes) {
        allNodes[nodeId].opacity = 1;
        allNodes[nodeId].font = undefined;
        allNodes[nodeId].label = allNodes[nodeId].hiddenLabel;
    }


    if (currentnodes.length > 0) {
        for (const edgeId in allEdges) {
            allEdges[edgeId].color = {opacity: 0.15};
            allEdges[edgeId].label = ' '
        }

        for (const nodeId in allNodes) {
            allNodes[nodeId].opacity = 0.15;
            allNodes[nodeId].label = undefined;

        }

        let i;
        let selectedNode = currentnodes[0];

        connectedNodes = network.getConnectedNodes(selectedNode);
        connectedEdges = network.getConnectedEdges(selectedNode);

        // all first degree nodes get their opacity and their label back
        for (i = 0; i < connectedNodes.length; i++) {
            allNodes[connectedNodes[i]].opacity = 1;
            allNodes[connectedNodes[i]].label = allNodes[connectedNodes[i]].hiddenLabel;
            allNodes[connectedNodes[i]].font = {color: 'white'}

        }

        // all first degree edges get their opacity and their label back
        for (i = 0; i < connectedEdges.length; i++) {
            allEdges[connectedEdges[i]].color = {opacity: 1};
            const from = allEdges[connectedEdges[i]].from
            const property_code = allEdges[connectedEdges[i]].property_code
            if (from === selectedNode) {
                allEdges[connectedEdges[i]].label = allEdges[connectedEdges[i]].hiddenLabel
            } else {
                allEdges[connectedEdges[i]].label = returnDirectedProperty(property_code, allEdges[connectedEdges[i]].hiddenLabel);
            }
        }

        // the main node gets its own color and its label back.
        allNodes[selectedNode].opacity = 1;
        allNodes[selectedNode].font = {color: 'white'};
        allNodes[selectedNode].label = allNodes[selectedNode].hiddenLabel;

    }

    // transform the node object into an array
    var updateNodeArray = [];
    for (nodeId in allNodes) {
        if (allNodes.hasOwnProperty(nodeId)) {
            updateNodeArray.push(allNodes[nodeId]);
        }
    }
    nodesDataset.update(updateNodeArray);

    // transform the edge object into an array
    var updateEdgeArray = [];
    for (edgeId in allEdges) {
        if (allEdges.hasOwnProperty(edgeId)) {
            updateEdgeArray.push(allEdges[edgeId]);
        }
    }
    edgesDataset.update(updateEdgeArray);
}

function returnGroupColor(group) {
    const style = {
        '#324c6b': ['person'], // Salmon Pink for 'person'
        'rgb(255, 178, 102)': ['file'], // Light Orange for 'file'
        '#0088ce': ['group'], // Sky Blue for 'group'
        '#a1c3e8': ['artifact'], // Mint Green for 'artifact'
        '#3aada1': ['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'], // Orchid Pink for various activities
        'rgb(178, 102, 255)': ['place'], // Lavender Purple for 'place'
        'rgb(255, 204, 102)': ['reference_system', 'external_reference'], // Peach for 'reference_system' and 'external_reference'
        'rgb(255, 102, 255)': ['bibliography'], // Pink for 'bibliography'
        'rgb(102, 255, 255)': ['source'], // Turquoise for 'source'
        'rgb(153, 204, 255)': ['type'], // Baby Blue for 'type'
        'rgb(102, 255, 204)': ['appellation'], // Mint Turquoise for 'appellation'
    };

    for (const color in style) {
        if (style[color].includes(group)) {
            return color;
        }
    }
    // Return a default color or handle the case when group is not found
    return 'rgb(133,50,50)';
}

function returnDirectedProperty(property_code, current_text) {
    let returntext = current_text
    for (const property of propTranslations) {
        if (property.property_code === property_code && current_text === property.text && property.locale === language) {
            returntext = property.text_inverse
        } else {
            if (property.property_code === property_code && current_text === property.text_inverse && property.locale === language) {
                returntext = property.text
            }
        }
    }
    if (returntext !== null) return returntext
    return current_text
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
    itemTemplate.dataset.class = 'source'

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

    current_data.forEach((node) => {
        if (node.begin) node.sortField = node.begin
        if (!node.begin && node.end) node.sortField = node.end
    })


    current_data.sort((a, b) => {
        const dateA = (a.sortField);
        const dateB = (b.sortField);

        if (dateA < dateB) {
            return -1;
        } else if (dateA > dateB) {
            return 1;
        } else {
            return 0;
        }
    });


    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    itemTemplate.dataset.class = 'events'

    eventdates = []
    for (const node of current_data) {
        if (node.begin) eventdates.push(node.begin)
        if (node.end) eventdates.push(node.end)
    }
    let visItems = current_data.length
    if (visItems > 5) visItems = 5

    returnHtml = `
    <div class="item-content tl-cont">
      <div class="card">
        <div class="card-body">
        <h5 id="timeline-header" class="card-title">${current_data.length + ' ' + languageTranslations._event + ' (' + makeLocalDate(eventdates[0]).localdate + ' ' + languageTranslations._until + ' ' + makeLocalDate(eventdates[eventdates.length - 1]).localdate + ')'}</h5>
            <div class="timeline" data-visible-items="${visItems}" data-mode="horizontal" data-move-items="3" data-force-vertical-mode="900">
                <div class="timeline__wrap">
                    <div class="timeline__items">
                
            `

    for (const event of current_data) {

        const label = getLabelTranslation(event);
        let type = ''
        if (event.type) type = getTypeTranslation(event.type);
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

        const startDate = makeLocalDate(data.start).localdate;
        const endDate = makeLocalDate(data.end).localdate;
        const year = startDate !== '?' && endDate !== '?' && startDate === endDate;

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

        if (year) {
            first = true;
            last = false;
            both = false;
        }

        let links = '';

        returnHtml += `
        
         <div class="timeline__item">
                <div class="timeline__content ${htmlClass}" title="${titleString}">
                    ${both ? `<span class="h6">${makeLocalDate(event.begin).localdate} - ${makeLocalDate(event.end).localdate}</span>` : ''}
                    ${first ? `<span class="h6">${makeLocalDate(event.begin).localdate}</span>` : ''}
                    ${last ? `<span class="h6">${makeLocalDate(event.end).localdate}</span>` : ''}    <br>
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
            const dateA = (a.begin);
            const dateB = (b.begin);
            return dateA - dateB;
        });
    }

    allEnts.sort((a, b) => {
        const dateA = (a.begin);
        const dateB = (b.begin);
        return dateA - dateB;
    });


    return allEnts
}


function setEnts(current_data, class_) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = 'item';
    if (class_ === '_actor') itemTemplate.dataset.class = 'actors'
    if (class_ === '_item') itemTemplate.dataset.class = 'items'

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
        if (currentDatum.class === 'artifact') icon = ''
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
                ${icon}<div class="h5 ent-box">${label}<a class="info-buttons line-fade line-fade" href="/view/${currentDatum.id}"><i class="bi bi-arrow-up-right-square"></i></a></div> ${img}
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
                                    propstring += makeLocalDate(spec.invbegin).localdate
                                }

                                if (spec.invbegin !== undefined && spec.invend !== undefined) {
                                    propstring += ' '
                                }

                                if (spec.invend !== undefined) {
                                    propstring += languageTranslations._until + ' ' + makeLocalDate(spec.invend).localdate
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
                                    current_spec += makeLocalDate(spec.invbegin).localdate
                                }

                                if (spec.invbegin !== undefined && spec.invend !== undefined) {
                                    current_spec += ' '
                                }

                                if (spec.invend !== undefined) {
                                    current_spec += languageTranslations._until + ' ' + makeLocalDate(spec.invend).localdate + ' '
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
                    '        ' + subevents + ' ' + languageTranslations._indirect + '' +
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
    let filetype = '.' + id.split('.')[1]
    if (imageExtensions.includes(filetype)) {
        let path = iiifUrl + id + '/full/,' + height + '/0/default.jpg'
        let img = `<img src="${path}" loading="eager">`
        return img
    }
    return ''
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

document.querySelectorAll('.btn-check').forEach(checkbox => {
    checkbox.addEventListener('change', updateGrid);
});

function updateGrid() {
    // Get the checked classes from the checkboxes
    const checkedClasses = Array.from(document.querySelectorAll('.btn-check:checked'))
        .map(checkbox => checkbox.id.replace('classSwitch', ''));
    checkedClasses.push('main')

    // Filter the grid items based on the checked classes
    grid.filter((item) => {
        const itemClass = item.getElement().getAttribute('data-class');
        return checkedClasses.includes(itemClass);
    });
}

let lastScrollTop = 0;

window.addEventListener("scroll", function () {
    var st = window.pageYOffset || document.documentElement.scrollTop;
    if (st > lastScrollTop) {
        // Scroll down
        document.querySelector('.nav-second').style.top = '-100px';
    } else {
        // Scroll up
        document.querySelector('.nav-second').style.top = '56px';
    }
    lastScrollTop = st;
});

// Optional: Hide navbar when the mouse is not at the top
window.addEventListener("mousemove", function (event) {
    if (event.clientY < 300) {
        // Mouse near the top
        document.querySelector('.nav-second').style.top = '56px';
    }
});
