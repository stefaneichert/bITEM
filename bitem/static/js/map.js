window.addEventListener('resize', function() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(function () {
        setMarkers();
        grid.refreshItems().layout();
    }, 800);
});

//set initial layout based on viewport
window.onload = function () {
    let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
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
    if (selection !== 'places') {
        setTimeout(function () {
            toggleSidebar('right');
        }, 800);
    }

    mapThere = true


};

function setMarkers() {
    let items = getActiveItems().length > 0
    if (typeof (PlaceMarker) !== 'undefined') PlaceMarker.removeFrom(map);
    PlaceMarker = updateGeojson()
    PlaceMarker.addTo(map)
    let bounds = PlaceMarker.getBounds()
    if (JSON.stringify(bounds) === '{}') items = false
    let sidebarnow = document.getElementById("sidebar")
    let sbw = sidebarnow.clientWidth
    if (sbw === 0) {
        map.setActiveArea('activemap-100');
        items ? map.fitBounds(bounds, {
            padding: [50, 50]
        }) : console.log('no places');
    } else {
        map.setActiveArea('activemap-50');
        items ? map.fitBounds(bounds, {
            padding: [50, 50]
        }) : console.log('no places');
    }
}

//check for currently shown Muuri items
function getActiveItems() {
    let activeIds = [];
    var activeItems = grid.getItems().filter(function (item) {
        return item.isActive();
    })
    activeItems.forEach((item) => activeIds.push(parseInt(item._sortData.id)))
    return activeIds
}

///////////////////////
// Map functionality //
///////////////////////

const map = L.map('map', {minZoom: 2, maxZoom: 17, worldCopyJump: false}).setView([1.505, -0.09], 5);

L.control.layers(baseMaps).addTo(map);

let sidebar = L.control.sidebar('sidebar', {
    closeButton: false,
    position: 'left'
});

map.addControl(sidebar);

const backToTopButton = document.createElement('button');
backToTopButton.type = 'button';
backToTopButton.className = 'btn btn-secondary btn-floating btn-lg btn-back-to-top';
backToTopButton.id = 'map-btn-back-to-top';
backToTopButton.innerHTML = '<i class="bi bi-arrow-up"></i>';



// Find the 'sidebar' element by its ID
const sidebarElement = document.getElementById('sidebar');

// Insert the new button as a sibling immediately after the 'sidebar' element
sidebarElement.insertAdjacentElement('afterend', backToTopButton);

function sidebarBackToTop() {
    // Set the scroll position of the 'sidebar' element to the top
    sidebarElement.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function scrollFunction() {
    // Check the scroll position of the 'sidebar' element
    if (sidebarElement.scrollTop > 300) {
        backToTopButton.style.opacity = '0.9';
    } else {
        backToTopButton.style.opacity = '0';
    }
}

// Listen for the 'scroll' event on the 'sidebar' element
sidebarElement.addEventListener('scroll', scrollFunction);

// Listen for the button click to scroll back to the top
backToTopButton.addEventListener('click', sidebarBackToTop);

setTimeout(() => {
    sidebar.show();
    setTimeout(() => {
        grid.refreshItems().layout();
    }, 800);
}, 800);

//initiate sidebar/map to 50/50
shave('.card-text', 200)
changeClasses('add', 'leaflet-sidebar', 'sb-both')
changeClasses('add', 'leaflet-left', 'map-both')


//create/update Geojson


let hovermarkers = L.layerGroup().addTo(map)

//functionality to highlight marker on hover over muuri
const allMuuris = document.getElementsByClassName('muuri-item');
Array.from(allMuuris).forEach((element) => {
    element.addEventListener("mouseover", () => {
        hovermarker(parseInt(element.dataset.id))
    }, false);
    element.addEventListener("mouseout", () => {
        hovermarkers.clearLayers()
    }, false);
});

function hovermarker(id) {
    let coords;
    hovermarkers.clearLayers()
    data.forEach((elem) => {
            if (elem.id === id && elem.geometry) {
                elem.geometry.forEach((elem) => {
                    if (elem) {
                        coords = elem.geometry.geometries.find(singleGeom => singleGeom.type === 'Point')
                        let hoverpoint = L.circleMarker([coords.coordinates[1], coords.coordinates[0]], CircleStyleHover)
                        hovermarkers.addLayer(hoverpoint)
                    }
                })


            }
        }
    )
}

///////////////////////////////////////
// functionality to switch map/items //
///////////////////////////////////////

//hide buttons on resize
function hideButtons() {
    changeClasses('add', 'mapbuttons', 'd-none')
    setTimeout(function () {
        changeClasses('remove', 'mapbuttons', 'd-none')
    }, 500);
}

//change on resize
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
        //if (list) changeClasses('change', 'card', 'list-item-50', 'list-item-100')
    }

    grid.refreshItems().layout();
    setMarkers()
};

window.addEventListener('resize', resizeHandler);

//functionality for sidebar toggle
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
            //if (list) changeClasses('change', 'card', 'list-item-100', 'list-item-50')
        }

        if (direction === 'right' && sbw > 0) {
            changeClasses('change', 'barswitch-middle', 'barswitch-middle', 'barswitch-right', removeClasses)
            changeClasses('change', 'mapswitch-middle', 'mapswitch-middle', 'mapswitch-right', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-both', 'sb-only', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-both', 'map-no', removeClasses)
            //if (list) changeClasses('change', 'card', 'list-item-50', 'list-item-100')
        }

        if (direction === 'left' && ((sbw + 100) > vpw)) {
            changeClasses('change', 'barswitch-right', 'barswitch-right', 'barswitch-middle', removeClasses)
            changeClasses('change', 'mapswitch-right', 'mapswitch-right', 'mapswitch-middle', removeClasses)
            changeClasses('change', 'leaflet-sidebar', 'sb-only', 'sb-both', removeClasses)
            changeClasses('change', 'leaflet-left', 'map-no', 'map-both', removeClasses)
            //if (list) changeClasses('change', 'card', 'list-item-100', 'list-item-50')
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
            //if (list) changeClasses('change', 'card', 'list-item-50', 'list-item-100')
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
    }, 800);

}

//change classes by classname
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

//switch from list to grid
function setListWitdh() {
    let sidebarnow = document.getElementById("sidebar")
    let sbw = sidebarnow.clientWidth
    let vpw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
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

