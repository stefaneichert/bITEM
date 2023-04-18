searchField.addEventListener('search', setMarkers);
searchField.addEventListener('keyup', setMarkers);
selectField.addEventListener('change', setMarkers);

let list = false
switchList.addEventListener('click', setListWitdh);

function getActiveItems() {
    let activeIds = [];
    var activeItems = grid.getItems().filter(function (item) {
        return item.isActive();
    })
    activeItems.forEach((item) => activeIds.push(parseInt(item._sortData.id)))
    return activeIds
}

function setMarkers() {
    if (typeof (PlaceMarker) !== 'undefined') PlaceMarker.removeFrom(map);
    PlaceMarker = updateGeojson()
    PlaceMarker.addTo(map)
    let bounds = PlaceMarker.getBounds()
    let sidebarnow = document.getElementById("sidebar")
    let sbw = sidebarnow.clientWidth
    if (sbw === 0) {
        map.setActiveArea('activemap-100');
        map.fitBounds(bounds, {
            padding: [50, 50]
        });
        console.log(100)
    } else {
        map.setActiveArea('activemap-50');
        map.fitBounds(bounds, {
            padding: [50, 50]
        });
        console.log(50)
    }

}

//circle marker style

let CircleStyle = {
    "color": "#324c6b",
    "weight": 1.5,
    "fillOpacity": 0.8,
    "fillColor": "#0088ce"
};

let CircleStyleHover = {
    "color": "#324c6b",
    "weight": 1.5,
    "fillOpacity": 0.8,
    "fillColor": "#ff001f"
};

function updateGeojson() {
    let placeLayer = new L.geoJSON('', {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, CircleStyle);
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup(feature.properties.popupContent);
        },
    });

    data.forEach((element) => {
        const label = getLabelTranslation(element);
        const type = getTypeTranslation(element.types);
        const geom = element.geom;

        if (!geom) return;

        if (getActiveItems().includes(element.id)) {

            const popupContent = `<a href="/view/${element.id}"><b>${label}</b></a><br>${type}`;
            const geojsonFeature = {
                type: "Feature",
                id: element.id,
                properties: {
                    name: label,
                    type: type,
                    popupContent: popupContent,
                    casestudies: element.casestudies,
                },
                geometry: getCoordinates(geom),
            };
            placeLayer.addData(geojsonFeature);
        }
    });
    return placeLayer
}

function hideButtons() {
    changeClasses('add', 'mapbuttons', 'd-none')
    setTimeout(function () {
        changeClasses('remove', 'mapbuttons', 'd-none')
    }, 500);
}

const map = L.map('map', {minZoom: 2, worldCopyJump: false}).setView([51.505, -0.09], 5);

const OpenStreetMap_HOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
});

const OpenStreetMap = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const Stamen_Watercolor = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abcd',
    minZoom: 1,
    maxZoom: 16,
    ext: 'jpg'
});

let baseMaps = {
    "OpenStreetMap": OpenStreetMap,
    "OSM Humanitarian": OpenStreetMap_HOT,
    "Stamen Watercolor": Stamen_Watercolor
};

L.control.layers(baseMaps).addTo(map);

var sidebar = L.control.sidebar('sidebar', {
    closeButton: false,
    position: 'left'
});

map.addControl(sidebar);
map.on('click', function (e) {
    console.log("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng)
});

setTimeout(() => {
    sidebar.show();
    setTimeout(() => {
        grid.refreshItems().layout();
    }, 500);
}, 500);

function getCoordinates(geom) {
    if (geom.type === 'feature' && geom.geometry.type === 'GeometryCollection') {
        return geom.geometry.geometries.find(singleGeom => singleGeom.type === 'Point');
    }
    return null;
}

shave('.card-text', 200)

changeClasses('add', 'leaflet-sidebar', 'sb-both')
changeClasses('add', 'leaflet-left', 'map-both')

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

window.onload = function () {
    if (vw < 768) {
        changeClasses('change', 'barswitch-middle', 'barswitch-middle', 'barswitch-right', removeClasses)
        changeClasses('change', 'mapswitch-middle', 'mapswitch-middle', 'mapswitch-right', removeClasses)
        changeClasses('change', 'leaflet-sidebar', 'sb-both', 'sb-only', removeClasses)
        changeClasses('change', 'leaflet-left', 'map-both', 'map-no', removeClasses)
    }


    grid.refreshItems().layout();
    countField.innerText = data.length;
    setTimeout(function () {
        setMarkers()
        document.body.classList.add('images-loaded');
    }, 500);

    OpenStreetMap.addTo(map)


};

const resizeHandler = () => {
    hideButtons();
    let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    let sidebarnow = document.getElementById("sidebar")
    let sbw = sidebarnow.clientWidth

    if (vw < 768 && sbw > 0) {
        changeClasses('change', 'leaflet-sidebar', 'sb-both', 'sb-only', removeClasses)
        changeClasses('change', 'leaflet-left', 'map-both', 'map-no', removeClasses)
        changeClasses('change', 'barswitch-middle', 'barswitch-middle', 'barswitch-right', removeClasses)
        changeClasses('change', 'mapswitch-middle', 'mapswitch-middle', 'mapswitch-right', removeClasses)
        if (list) changeClasses('change', 'card', 'list-item-50', 'list-item-100')
    }

    grid.refreshItems().layout();
    setMarkers()
};


window.addEventListener('resize', resizeHandler);

let removeClasses = ["sb-no", "sb-both", "sb-only", "map-no", "map-both", "map-only"]

function toggleSidebar(direction) {
    let sidebarnow = document.getElementById("sidebar")
    let vpw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    let sbw = sidebarnow.clientWidth


    if (vpw > 768) {

        if (direction === 'right' && sbw === 0) {
            changeClasses('change', 'barswitch-left', 'barswitch-left', 'barswitch-middle', removeClasses)
            changeClasses('change', 'mapswitch-left', 'mapswitch-left', 'mapswitch-middle', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-no', 'sb-both', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-only', 'map-both', removeClasses)
            if (list) changeClasses('change', 'card', 'list-item-100', 'list-item-50')
        }

        if (direction === 'right' && sbw > 0) {
            changeClasses('change', 'barswitch-middle', 'barswitch-middle', 'barswitch-right', removeClasses)
            changeClasses('change', 'mapswitch-middle', 'mapswitch-middle', 'mapswitch-right', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-both', 'sb-only', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-both', 'map-no', removeClasses)
            if (list) changeClasses('change', 'card', 'list-item-50', 'list-item-100')
        }

        if (direction === 'left' && ((sbw + 100) > vpw)) {
            changeClasses('change', 'barswitch-right', 'barswitch-right', 'barswitch-middle', removeClasses)
            changeClasses('change', 'mapswitch-right', 'mapswitch-right', 'mapswitch-middle', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-only', 'sb-both', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-no', 'map-both', removeClasses)
            if (list) changeClasses('change', 'card', 'list-item-100', 'list-item-50')
        }

        if (direction === 'left' && ((sbw + 100) < vpw)) {
            changeClasses('change', 'barswitch-middle', 'barswitch-middle', 'barswitch-left', removeClasses)
            changeClasses('change', 'mapswitch-middle', 'mapswitch-middle', 'mapswitch-left', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-both', 'sb-no', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-both', 'map-only', removeClasses)
        }
    } else {
        if (direction === 'right') {
            changeClasses('change', 'barswitch-left', 'barswitch-left', 'barswitch-right', removeClasses)
            changeClasses('change', 'mapswitch-left', 'mapswitch-left', 'mapswitch-right', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-no', 'sb-only', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-only', 'map-no', removeClasses)
            if (list) changeClasses('change', 'card', 'list-item-50', 'list-item-100')
        }
        if (direction === 'left') {
            changeClasses('change', 'barswitch-right', 'barswitch-right', 'barswitch-left', removeClasses)
            changeClasses('change', 'mapswitch-right', 'mapswitch-right', 'mapswitch-left', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-only', 'sb-no', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-no', 'map-only', removeClasses)
        }
    }


    setTimeout(function () {
        setMarkers()
        grid.refreshItems().layout();
    }, 500);

}

function changeClasses(direction, className, classToChange, classToReplace, removeAllBut) {
    const elements = document.getElementsByClassName(className);

    Array.from(elements).forEach((element) => {
        if (typeof removeAllBut !== 'undefined') {
            removeAllBut.forEach((toremove) => {
                if (toremove !== classToReplace) {
                    changeClasses('remove', className, toremove);
                }
            });
        }

        switch (direction) {
            case 'add':
                element.classList.add(classToChange);
                break;
            case 'remove':
                element.classList.remove(classToChange);
                break;
            case 'change':
                element.classList.remove(classToChange);
                element.classList.add(classToReplace);
                break;
            default:
                console.error(`Invalid direction: ${direction}`);
        }
    });
}


function setListWitdh() {
    let sidebarnow = document.getElementById("sidebar")
    let sbw = sidebarnow.clientWidth
    let vpw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    console.log(sbw)
    console.log(vpw)
    console.log(list)
    if (!list) {
        if ((sbw + 100) < vpw) {
            changeClasses('add', 'card', 'list-item-50', 'list-item-100')
        } else {
            changeClasses('add', 'card', 'list-item-100', 'list-item-50')
        }
        list = true
    } else {
        changeClasses('remove', 'card', 'list-item-50')
        changeClasses('remove', 'card', 'list-item-100')
        list = false
    }
    grid.refreshItems().layout()
}

const allMuuris = document.getElementsByClassName('muuri-item');
Array.from(allMuuris).forEach((element) => {
    element.addEventListener("mouseover", () => {
        hovermarker(parseInt(element.dataset.id))
    }, false);
    element.addEventListener("mouseout", () => {
        hovermarkers.clearLayers()
    }, false);
});

let hovermarkers = L.layerGroup().addTo(map)

function hovermarker(id) {
    let coords;
    data.forEach((elem) => {
            if (elem.id === id && elem.geom) {


                coords = getCoordinates(elem.geom);
                hovermarkers.clearLayers()
                let hoverpoint = L.circleMarker([coords.coordinates[1], coords.coordinates[0]], CircleStyleHover)
                hovermarkers.addLayer(hoverpoint)
            }
        }
    )

}





