// Filter the connections to include only "place" class connections
const mapData = data.connections.filter((connection) =>
  ["place"].includes(connection.class)
);
console.log(mapData);

let myTimeEntity = [];

// Process each node in the filtered connections
for (const place in mapData[0].nodes) {
  let dateThere = false;
  let placeThere = false;
  if (mapData[0].nodes[place].spatialinfo) {
    if (
      typeof mapData[0].nodes[place].spatialinfo.geometry.geometries[0]
        .coordinates !== "undefined"
    ) {
      placeThere = true;

      mapData[0].nodes[place].involvement.forEach((node) => {
        if (node.begin) {
          dateThere = true;
          node.beginDBP = calculateTimeBP(node.begin);
        }
        if (node.end) {
          dateThere = true;
          node.endDBP = calculateTimeBP(node.end);
        }
        if (node.endDBP && node.beginDBP) {
          node.duration = node.beginDBP - node.endDBP;
        }
        if (dateThere) {
          node.spatialinfo = mapData[0].nodes[place].spatialinfo;
        }
        if (dateThere && placeThere) {
          myTimeEntity.push(node);
        }
      });
    }
  }
}

sortedDates = myTimeEntity.sort((a, b) => {
  const aBeginSort = a.beginDBP || a.endDBP;
  const bBeginSort = b.beginDBP || b.endDBP;
  if (aBeginSort !== bBeginSort) {
    return aBeginSort - bBeginSort;
  } else {
    const aEndSort = a.endDBP || a.beginDBP;
    const bEndSort = b.endDBP || b.beginDBP;
    return aEndSort - bEndSort;
  }
});

function groupByIdenticalKeys(array) {
  const map = new Map();
  array.forEach((item) => {
    const {
      origin_id,
      begin,
      beginDBP,
      duration,
      end,
      endDBP,
      origin,
      ...diffProps
    } = item;
    const key = JSON.stringify({
      origin_id,
      begin,
      beginDBP,
      duration,
      end,
      endDBP,
      origin,
    });
    if (!map.has(key)) {
      map.set(key, {
        origin_id,
        begin,
        beginDBP,
        duration,
        end,
        endDBP,
        origin,
        places: [],
      });
    }
    map.get(key).places.push(diffProps);
  });
  return Array.from(map.values());
}

const groupedArray = groupByIdenticalKeys(sortedDates);
console.log(groupedArray);

// Remove entry with undefined begin/end
const cleanedGroupedArray = groupedArray.filter(
  (item) => item.begin !== undefined && item.end !== undefined
);
console.log(cleanedGroupedArray);

const map = L.map("map").setView([45.644, 13.756], 13);

var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
osm.addTo(map);

var baseMaps = {
  "Open Street Map": osm,
};
L.control.layers(baseMaps).addTo(map);

function transformDate(dateString) {
  if (!dateString) {
    console.error("Invalid date string:", dateString);
    return null;
  }
  const parts = dateString.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  return new Date(year, month, day);
}

console.log(cleanedGroupedArray);

const timelineData = cleanedGroupedArray
  .map((item) => {
    if (!item.begin || !item.end) {
      console.error("Missing begin or end date for item:", item);
      return null;
    }
    if (typeof item.places[0] === "undefined") {
      console.error("No Origin", item);
      return null;
    }
    const place = item.places;
    // const placeDestination = typeof item.places[1] !== "undefined" ? item.places[1].spatialinfo.properties.id : null;

    return {
      oid: item.origin_id,
      content: item.origin.name || "No Origin", // Not name give translation !
      start: transformDate(item.begin),
      end: transformDate(item.end),
      place: place,
    };
  })
  .filter((item) => item !== null);
console.log(timelineData);

const items = new vis.DataSet(
  timelineData.map((item) => {
    const start = new Date(item.start);
    const end = new Date(item.end);
    const duration = (end - start) / (1000 * 60 * 60 * 24); // Convert duration to days

    item.title = `${
      item.content
    } (${start.toDateString()} - ${end.toDateString()})`;

    item.id = item.oid;

    if (duration < 7) {
      item.type = "point";
    } else {
      item.type = "range";
    }
    return item;
  })
);

const options = {
  height: "25vh",
  stack: true,
  showCurrentTime: true,
  horizontalScroll: true,
  zoomKey: "ctrlKey",
  min: new Date(1857, 0, 1),
  max: new Date(1862, 11, 31),
  start: new Date(1857, 3, 10),
  end: new Date(1858, 1, 31),
  width: "100%",
  margin: {
    item: 20,
    axis: 5,
  },
  orientation: "bottom",
  template: function (item, element, data) {
    if (item.type === "point") {
      return item.content;
    }
    return "";
  },
};

// Function to add markers to the map
const timelineElement = document.getElementById("timeline");
const timeline = new vis.Timeline(timelineElement, items, options);
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
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })
      );
      marker.closePopup();
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
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
    );
    oldMarkers.push(placeId);

    // Add marker's coordinates to highlightedMarkers array
    highlightedMarkers.push(marker.getLatLng());

    // If two markers are highlighted, draw a polyline between them
    if (highlightedMarkers.length === 2) {
      drawPolylineBetweenMarkers();
    }
  } else {
    console.error("Marker not found for placeId:", placeId);
  }
}

// Function to draw a polyline between two highlighted markers
function drawPolylineBetweenMarkers() {
  if (polyline) {
    map.removeLayer(polyline); // Remove the existing polyline, if any
  }

  // Draw the polyline using the highlighted markers' coordinates
  polyline = L.polyline(highlightedMarkers, {
    color: "red",
    weight: 2,
    dashArray: "8, 8",
    dashOffset: "5",
  }).addTo(map);
}

// Add markers to the map
mapData[0].nodes.forEach(function (place) {
  let pointnotyetfound = true;
  if (place.spatialinfo) {
    if (
      typeof place.spatialinfo.geometry.geometries[0].coordinates !==
      "undefined"
    ) {
      place.spatialinfo.geometry.geometries.forEach(function (geometry) {
        if (pointnotyetfound) {
          if (geometry.type === "Point") {
            const coordinates = geometry.coordinates;
            const marker = L.marker([coordinates[1], coordinates[0]]).addTo(
              map
            );
            console.log(place);

            // Get the label and related events
            const label = getLabelTranslation(place.spatialinfo.properties);
            const events = getEventsForPlace(place.spatialinfo.properties.id);

            // Format the events into HTML
            let eventsHtml = "";
            events.forEach((event) => {
              eventsHtml += `<li>${event.title}</li>`;
            });

            const popupContent = `
              <b>${label}</b>
              <ul>${eventsHtml}</ul>
            `;

            marker.bindPopup(popupContent).openPopup();
            pointnotyetfound = false;

            // Store marker in mapMarkers object
            mapMarkers[place.spatialinfo.properties.id] = marker;

            // Add click event listener to the marker
            marker.on("click", function () {
              resetMarkers();
              highlightMarker(place.spatialinfo.properties.id);
              marker.openPopup(); // Open the popup when highlighting
            });
          }
        }
      });
    }
  }
});

// Function to create details div

const detailsContainer = document.getElementById("detailsContainer");
const detailsContent = document.getElementById("detailsContent");
const closeBtn = document.getElementById("closeBtn");

// Function to make the container draggable
function makeDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  if (element.querySelector(".header")) {
    // if present, the header is where you move the DIV from:
    element.querySelector(".header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    element.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Function to show details container
function showDetailsContainer(content) {
  detailsContent.innerHTML = content;
  detailsContainer.classList.remove("hidden");
}

// Function to hide details container
function hideDetailsContainer() {
  detailsContainer.classList.add("hidden");
}

closeBtn.onclick = function () {
  hideDetailsContainer();
};

// Initialize draggable functionality
makeDraggable(detailsContainer);

function populateContainer(id) {
  const url = "/view/" + id + "/JSON";
  console.log(url);
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      let html = `<div><h3>${getLabelTranslation(data)}</h3></div>`;

      if (data.start) {
        const startDate = makeLocalDate(data.start).localdate;


        if (data.end) {
          const endDate = makeLocalDate(data.end).localdate;


          if (startDate === endDate) {
            html += `<div><b>Date:</b> ${startDate}</div>`;
          } else {

            html += `<div><b>Start:</b> ${startDate}</div>`;
            html += `<div><b>End:</b> ${endDate}</div>`;
          }
        } else {

          html += `<div><b>Date:</b> ${startDate}</div>`;
        }
      }
      if (data.image) {
        html += `<div><img src="${data.image.path}" alt="${data.label}" style="max-width: 100%;"></div>`;
      }
      if (data.content) {
        html += `<div>${getLanguage(data.content)}</div>`;
      }

      detailsContent.innerHTML = html;
    });
}

// Timeline click event listener
document.getElementById("timeline").onclick = function (event) {
  var props = timeline.getEventProperties(event); //Not only 2 places (origin/destination), there could be many more places that are connected to the event.
  console.log("Clicked item:", props.item);
  if (props.item) {
    var clickedItem = timelineData.find((item) => item.oid === props.item);
    if (clickedItem) {
      resetMarkers();

      const view = [];

      clickedItem.place.forEach(function (place) {
        highlightMarker(place.spatialinfo.properties.id);
        const marker = mapMarkers[place.spatialinfo.properties.id];
        if (marker) {
          view.push(marker.getLatLng());
        }
      });

      if (view.length > 0) {
        const bounds = L.latLngBounds(view);
        if (view.length > 1) {
          map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
          const singleMarker = 8;
          map.flyTo(view[0], singleMarker, {
            animate: true,
            duration: 5,
          });
        }
      }

      const content = `
        <h3>${clickedItem.content}</h3>
      `;
      showDetailsContainer(content);
      populateContainer(clickedItem.oid);
    } else {
      console.error("Item not found in timelineData.");
    }
  } else {
    console.error("No item clicked.");
  }
};

const resizer = document.querySelector(".resizer");
const timelineContainer = document.getElementById("timeline-container");

function initResizerFn(resizer, timelineContainer) {
  let startY, startHeight;

  function mouseDownHandler(e) {
    startY = e.clientY;
    startHeight = parseInt(
      window.getComputedStyle(timelineContainer).height,
      10
    );

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  }

  function mouseMoveHandler(e) {
    const dy = e.clientY - startY;
    const newHeight = startHeight - dy;

    if (newHeight >= 50 && newHeight <= window.innerHeight) {
      timelineContainer.style.height = `${newHeight}px`;
      const mapHeight = window.innerHeight - newHeight;
      document.getElementById("map").style.height = `${mapHeight}px`;
    }
  }

  function mouseUpHandler() {
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
  }

  resizer.addEventListener("mousedown", mouseDownHandler);
}

initResizerFn(resizer, timelineContainer);
