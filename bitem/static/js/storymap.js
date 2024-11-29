let mobile

if (window.matchMedia('(max-width: 770px)').matches) {
    mobile = true
} else {
    mobile = false
}


// Function to create details div
const detailsContainer = document.getElementById("detailsContainer");
const detailsContent = document.getElementById("detailsContent");
const spinner = document.getElementById("spinner");

let currentOid
let previousItem
let nextItem

function moveToAdjacentItems(forward) {
    let items = timeline.itemsData.get();
    items.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Get all items sorted by start time
    const index = items.findIndex(item => item.oid === currentOid);


    // Determine the previous and next items
    previousItem = index > 0 ? items[index - 1] : null;
    nextItem = index < items.length - 1 ? items[index + 1] : null;

    if (previousItem && !forward) {
        flyToLocation(previousItem)
        showDetails(previousItem)
        timeline.setSelection(previousItem.oid);
        timeline.moveTo(previousItem.start)
    }

    if (nextItem && forward) {

        flyToLocation(nextItem)
        showDetails(nextItem)
        timeline.setSelection(nextItem.oid);
        timeline.moveTo(nextItem.start);
    }


}

if (!mobile) {
    window.addEventListener('load', function () {
        timeline.redraw();
        //timeline.fit()

        const ModalContent = document.getElementById('startModalContent')

        const url = "/view/" + data.id + "/JSON";
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                let html = `<div><h4>${getLabelTranslation(data)}</h4></div>`;
                const element = document.getElementById('image-cont');
                if (data.image) {
                    element.style.backgroundImage = `url('${data.image.path.split('/full/')[0]}/full/max/0/default.jpg')`;
                }
                if (!data.image && data.images) {
                    element.style.backgroundImage = `url('${data.images[0].path.split('/full/')[0]}/full/max/0/default.jpg')`;
                }
                //${!data.image && data.images ? `<img src="${(data.images[0].path).split('/full/')[0] + '/full/max/0/default.jpg'}" alt="...">` : ''}

                if (data.start) {
                    html += `<div style="display: flex; justify-content: center">`
                    const startDate = makeLocalDate(data.start).localdate;

                    if (data.end) {
                        const endDate = makeLocalDate(data.end).localdate;

                        if (startDate === endDate) {
                            html += `<div>${startDate}</div>`;
                        } else {
                            html += `<div>${startDate} - ${endDate}</div>`;
                        }
                    } else {
                        html += `<div>${startDate}</div>`;
                    }
                    html += '</div>'
                }

                if (data.content) {
                    html += `<br><br><div>${getLanguage(data.content)}</div>`;
                }

                html += `<div class="mod-spacer"></div>
                        <a href="#" data-bs-toggle="modal" data-bs-target="#startModal"
                        class="line-fade line-fade-m">Start</a>
                        <div class="mod-spacer"></div>
                    `
                ModalContent.innerHTML = html;
            })
            .catch((error) => {
                console.error("Error fetching data:", error);
            });

        const startModal = new bootstrap.Modal('#startModal', {
            keyboard: false
        })
        startModal.show()
        const myModalEl = document.getElementById('startModal')
        myModalEl.addEventListener('shown.bs.modal', event => {
            const modHeight = (document.getElementById('startModalContent').clientHeight)
            document.getElementById('image-cont').style.height = modHeight + 'px'
        })

        const modalEl = document.getElementById('startModal')
        modalEl.addEventListener('hidden.bs.modal', event => {
            presentTimeline()
        })

        const links = document.querySelectorAll('.vis-item-content a');

        links.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const clickedItem = timelineData.find((item) => item.oid === parseInt((link.href).split('#')[1]));
                showDetails(clickedItem)

                setTimeout(() => {
                    detailsContainer.classList.remove("hidden");
                }, 100);
            });
        });
    });
} else {
    window.addEventListener('load', function () {
        let items = timeline.itemsData.get();
        items.sort((a, b) => new Date(a.start) - new Date(b.start));
        timeline.setSelection(items[0].id);
        let clickedItem = timelineData.find((item) => item.oid === items[0].id);
        flyToLocation(clickedItem)
        showDetails(clickedItem)
        currentOid = clickedItem.oid
    })
}


function makeHeader() {
    let html = `<div> ${getLabelTranslation(data)} </div>`
    if (data.start) {
        let startDate = makeLocalDate(data.start).localdate;
        if (data.end) {
            let endDate = makeLocalDate(data.end).localdate;
            if (startDate === endDate) {
                html += `<div>${startDate}</div>`;
            } else {
                html += `<div>${startDate} - ${endDate}</div>`;
            }
        } else {
            html += `<div>${startDate}</div>`;
        }
    }
    return html
}

function presentTimeline() {
    let short = true
    let items = timeline.itemsData.get();
    items.sort((a, b) => new Date(a.start) - new Date(b.start));
    let totalduration = (items[(items.length-1)].start - items[0].start)
    if ((totalduration / (1000 * 60 * 60 * 24 * 365.25)) > 8000) short = false
    if (short) timeline.fit()

    if (items.length >= 20) {
        var start = new Date(items[0].start);
        var end = new Date(items[10].start);
        timeline.setWindow(start, end, {animation: {duration: 3000, easingFunction: 'easeInOutQuad'}});
        setTimeout(() => {
            timeline.setSelection(items[0].id);
            let clickedItem = timelineData.find((item) => item.oid === items[0].id);
            flyToLocation(clickedItem)
            showDetails(clickedItem)
        }, 2000);
    } else {
        timeline.setSelection(items[0].id);
        if (!short) timeline.moveTo(items[0].start);
        let clickedItem = timelineData.find((item) => item.oid === items[0].id);
        flyToLocation(clickedItem)
        showDetails(clickedItem)
    }


}


const map = L.map("map", {'zoomControl': false}).setView([45.644, 13.756], 2.5); // Adjust the zoom level here

var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    minZoom: 3,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
osm.addTo(map);

const storymapdata = makeMapData(data, id)
const timelineData = storymapdata.timelineData
const startDate = storymapdata.startDate
const endDate = storymapdata.endDate
const mapData = storymapdata.mapData

const items = new vis.DataSet(
    timelineData.map((item) => {
        const start = new Date(item.start);
        const end = new Date(item.end);
        const duration = (end - start) / (1000 * 60 * 60 * 24); // Convert duration to days

        item.title = `${item.startstring} - ${item.endstring}`;
        item.id = item.oid;

        if (duration < 1) {
            delete item.end;
            item.type = "point"
        }
        return item;
    })
);

const options = {
    stack: true,
    cluster: false,
    showCurrentTime: false,
    horizontalScroll: true,
    zoomKey: "ctrlKey",
    start: startDate,
    end: endDate,
    min: new Date(-8640000000000000), // Smallest date allowed
    max: new Date(8640000000000000),  // Largest date allowed
    width: "100%",
    margin: {
        item: 20,
        axis: 50,
    },
    orientation: "bottom",
};

const timelineElement = document.getElementById("timeline");
const timeline = new vis.Timeline(timelineElement, items, options);

function updateHighlight(item) {
    const range = timeline.getWindow();
    const timelineRect = timelineElement.getBoundingClientRect();
    const itemStart = new Date(item.start).getTime();
    const itemEnd = item.end ? new Date(item.end).getTime() : itemStart;
    const rangeStart = new Date(range.start).getTime();
    const rangeEnd = new Date(range.end).getTime();
    const left = ((itemStart - rangeStart) / (rangeEnd - rangeStart)) * timelineRect.width;
    const right = ((itemEnd - rangeStart) / (rangeEnd - rangeStart)) * timelineRect.width;

    if (item.end && item.start) {
        // Pixel-Positionen berechnen
        highlight.style.left = `${left}px`;
        highlight.style.width = `${right - left}px`;
    } else {
        highlight.style.left = `${left}px`;
        highlight.style.width = `20px`;
    }
}

window.addEventListener('load', () => {
    timeline.redraw();
});

const highlight = document.createElement('div');
highlight.className = 'highlight';
timelineElement.appendChild(highlight);


var oldMarkers = [];

const mapMarkers = {};
const sortedTimeline = timelineData.reverse();

function getEventsForPlace(placeId) {
    return sortedTimeline.filter((item) =>
        item.place.some((place) => place.spatialinfo.properties.id === placeId)
    );
}

// Store the highlighted markers' coordinates and the polyline
let highlightedMarkers = [];
let polyline = null;

// Function to reset markers and remove polyline
function resetMarkers() {
    oldMarkers.forEach(function (placeId) {
        var marker = mapMarkers[placeId];
        if (marker) {
            marker.setIcon(
                L.icon({
                    iconUrl:
                        "/static/icons/marker-icon.png",
                    shadowUrl:
                        "/static/icons/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                })
            );
            marker.closePopup();
            marker.setZIndexOffset(1000);
        }
    });

    oldMarkers = [];
    highlightedMarkers = [];

    // Remove existing polyline from the map
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
}

// Function to highlight a marker
function highlightMarker(placeId) {
    var marker = mapMarkers[placeId];
    if (marker) {
        marker.setIcon(
            L.icon({
                iconUrl:
                    "/static/icons/marker-icon-red.png",
                shadowUrl:
                    "/static/icons/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            })
        );
        oldMarkers.push(placeId);
        marker.setZIndexOffset(2000)

        // Add marker's coordinates to highlightedMarkers array
        highlightedMarkers.push(marker.getLatLng());

        // If two markers are highlighted, draw a polyline between them
        if (highlightedMarkers.length === 2) {
            drawCurvedLineBetweenMarkers();
        }
    } else {
        console.error("Marker not found for placeId:", placeId);
    }
}

// Function to draw a curved line between two highlighted markers
function drawCurvedLineBetweenMarkers() {
    if (polyline) {
        map.removeLayer(polyline); // Remove the existing polyline, if any
    }

    const latlng1 = highlightedMarkers[0];
    const latlng2 = highlightedMarkers[1];

    // Calculate the midpoint between the two markers
    const midLat = (latlng1.lat + latlng2.lat) / 2;
    const midLng = (latlng1.lng + latlng2.lng) / 2;

    // Offset the midpoint to create a control point for the Bezier curve
    const offsetLat = (latlng2.lng - latlng1.lng) * 0.1; // Adjust this value to change the curvature
    const offsetLng = (latlng1.lat - latlng2.lat) * 0.1; // Adjust this value to change the curvature
    const controlLat = midLat + offsetLat;
    const controlLng = midLng + offsetLng;

    // Generate points along the Bezier curve
    const points = [];
    const numPoints = 100; // Number of points to approximate the curve
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const lat = (1 - t) * (1 - t) * latlng1.lat + 2 * (1 - t) * t * controlLat + t * t * latlng2.lat;
        const lng = (1 - t) * (1 - t) * latlng1.lng + 2 * (1 - t) * t * controlLng + t * t * latlng2.lng;
        points.push([lat, lng]);
    }

    // Draw the curved line using a polyline
    polyline = L.polyline(points, {
        color: "red",
        weight: 2,
        dashArray: "8, 8",
        dashOffset: "5",
    }).addTo(map);
}

const bounds = L.latLngBounds();
let placeCollection = new Set();
mapData[0].nodes.forEach(function (place) {
    if (place.spatialinfo) {
        if (
            typeof place.spatialinfo.geometry.geometries[0].coordinates !==
            "undefined"
        ) {
            place.spatialinfo.geometry.geometries.forEach(function (geometry) {
                const coordinates = geometry.coordinates;
                console.log(place.spatialinfo)
                console.log(place.id)

                if (!placeCollection.has(place.id)) {
                    if (geometry.type === "Point") {
                        const marker = L.marker([coordinates[1], coordinates[0]]).addTo(map);
                        placeCollection.add(place.id);
                        bounds.extend([coordinates[1], coordinates[0]]);

                        // Get the label and related events
                        const label = getLabelTranslation(place.spatialinfo.properties);
                        const events = getEventsForPlace(place.spatialinfo.properties.id);

                        // Format the events into HTML
                        let eventsHtml = "";
                        events.forEach((event) => {
                            eventsHtml += `<li>${event.involvement + ': <br> ' + event.title}</li>`;
                        });

                        const popupContent = `
                          <b>${label}</b>
                          <ul>${eventsHtml}</ul>
                        `;

                        // Store marker in mapMarkers object
                        mapMarkers[place.spatialinfo.properties.id] = marker;

                    }
                }
            });
        }
    }
});


map.fitBounds(bounds);
const mainBounds = bounds

function showDetailsContainer(content) {
    detailsContent.innerHTML = content;
    detailsContainer.classList.remove("hidden");
}

// Function to hide details container
function hideDetailsContainer() {
    detailsContainer.classList.add("hidden");
}

function populateContainer(id) {
    const url = "/view/" + id + "/JSON";

    // Show spinner and hide content
    spinner.classList.remove("hidden");
    detailsContent.classList.add("hidden");
    const navContainer = document.getElementById('close-container')
    const navButtons = document.querySelectorAll('a.move-btn');
    const nextButtons = document.querySelectorAll('a.next-btn');
    const prevButtons = document.querySelectorAll('a.prev-btn');

    navButtons.forEach(button => {
        button.classList.remove('d-none')
    });


    currentOid = id
    let items = timeline.itemsData.get();
    items.sort((a, b) => new Date(a.start) - new Date(b.start));
    // Get all items sorted by start time
    const index = items.findIndex(item => item.oid === currentOid);
    let last = false
    let first = false
    if (index === 0) first = true
    if (index === items.length - 1) last = true


    if (first) {
        prevButtons.forEach(button => {
            button.classList.add('d-none')
        });
    }

    if (last) {
        nextButtons.forEach(button => {
            button.classList.add('d-none')
        });
    }


    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            let html = `<div><h4>${getLabelTranslation(data)}</h4></div>`;

            if (data.start) {
                html += `<div style="display: flex; justify-content: space-between">`
                const startDate = makeLocalDate(data.start).localdate;

                if (data.end) {
                    const endDate = makeLocalDate(data.end).localdate;

                    if (startDate === endDate) {
                        html += `<div>${startDate}</div>`;
                    } else {
                        html += `<div>${startDate} - ${endDate}</div>`;
                    }
                } else {
                    html += `<div>${startDate}</div>`;
                }
                html += `<div>${index + 1}/${items.length}</div></div>`
            }
            if (data.image) {
                html += `<div><img src="${data.image.path}" alt="${data.label}" style="max-width: 100%;"></div>`;
            }
            if (data.content) {
                html += `<div>${getLanguage(data.content)}</div>`;
            }
            detailsContent.innerHTML = html;

            // Hide spinner and show content
            spinner.classList.add("hidden");
            detailsContent.classList.remove("hidden");
            navContainer.innerHTML = `<a style="color: black!important;" class="line-fade line-fade-m" onclick="hideDetailsContainer()"><i style="color: black;" class="bi bi-x-lg"></i></a>`

        })
        .catch((error) => {
            console.error("Error fetching data:", error);
            // Hide spinner even if there's an error
            spinner.classList.add("hidden");
            detailsContent.classList.remove("hidden");
            detailsContent.innerHTML = "<div>Error loading data</div>";
        });
}

// Function to fly to the location on the map
function flyToLocation(item) {
    resetMarkers();

    const view = [];
    let currentZoom = map.getBoundsZoom(mainBounds)
    console.log(currentZoom)
    if (currentZoom < 12) currentZoom = 12

    item.place.forEach(function (place) {
        highlightMarker(place.spatialinfo.properties.id);
        const marker = mapMarkers[place.spatialinfo.properties.id];
        if (marker) {
            view.push(marker.getLatLng());
        }
    });

    if (view.length > 0) {
        const bounds = L.latLngBounds(view);
        if (view.length > 1 && view[0] != view[1]) {
            map.flyToBounds(bounds, {
                animate: true,
                duration: 1,
            });

        } else {
            map.flyTo(view[0], currentZoom, {
                animate: true,
                duration: 1,
            });
        }
    }
}

// Function to show the details container
function showDetails(item) {
    const content = `<h3>${item.content}</h3>`;
    showDetailsContainer(content);
    populateContainer(item.oid);
}

document.getElementById("timeline").onclick = function (event) {
    var props = timeline.getEventProperties(event); // Get properties of the clicked event
    if (props.item) {
        let clickedItem = timelineData.find((item) => item.oid === props.item);
        if (clickedItem) {
            flyToLocation(clickedItem);
            const screenWidth = window.innerWidth
            if (screenWidth > 771) {
                showDetails(clickedItem);
            } else {
                hideDetailsContainer()
            }

        } else {
            console.error("Item not found in timelineData.");
        }
    } else {
        console.error("No item clicked.");
        hideDetailsContainer()
    }
};


window.addEventListener('load', function () {
    timeline.redraw();
});

function mobileTimeline() {
    const timelineContainer = document.getElementById("timeline-container");
    timelineContainer.style.height = '100vh';
    timeline.setOptions({height: '100vh'});
    timeline.redraw(); // Redraw the timeline to fit the new dimensions
}

// Call resizeTimeline on page load and whenever the window is resized

mobileTimeline();

timeline.on('select', (props) => {
    if (props.items.length > 0) {
        const selectedItem = items.get(props.items[0]);
        updateHighlight(selectedItem);
    } else {
        highlight.style.width = '0'; // Highlight entfernen
    }
});

timeline.on('rangechange', () => {
    const selectedItemId = timeline.getSelection()[0];
    if (selectedItemId) {
        const selectedItem = items.get(selectedItemId);
        updateHighlight(selectedItem);
    }
});

