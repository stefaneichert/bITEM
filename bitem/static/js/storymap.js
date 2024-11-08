window.addEventListener('load', function () {
  timeline.redraw();
});


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

const map = L.map("map").setView([45.644, 13.756], 2.5); // Adjust the zoom level here

var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
osm.addTo(map);


// Function to transform date strings into Date objects
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




// Ensure startDate and endDate are defined
let startDate, endDate;

// Validate and transform timeline data
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

    const start = transformDate(item.begin);
    const end = transformDate(item.end);

    // Validate the transformed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Invalid date for item:", item);
      return null;
    }

    // Set startDate and endDate if not already set
    if (!startDate || start < startDate) {
      startDate = start;
    }
    if (!endDate || end > endDate) {
      endDate = end;
    }

    return {
      oid: item.origin_id,
      content: getTypeTranslation(item.origin),
      start: start,
      end: end,
      place: place,
    };
  })
  .filter((item) => item !== null);

console.log("startDate:", startDate);
console.log("endDate:", endDate);

if (!startDate || !endDate) {
  console.error("startDate or endDate is not defined");
  // Handle the error appropriately, e.g., set default values or exit
  startDate = new Date(); // Default to current date
  endDate = new Date(); // Default to current date
}

const items = new vis.DataSet(
  timelineData.map((item) => {
    const start = new Date(item.start);
    const end = new Date(item.end);
    const duration = (end - start) / (1000 * 60 * 60 * 24); // Convert duration to days

    item.title = `${item.content} (${start.toDateString()} - ${end.toDateString()})`;

    item.id = item.oid;

    if (duration < 1) {
      item.type = "point";
    } else {
      item.type = "range";
    }
    return item;
  })
);

// Define adjustedMinDate and adjustedMaxDate
const adjustedMinDate = new Date(startDate.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days before startDate
const adjustedMaxDate = new Date(endDate.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days after endDate

const options = {
  height: "25vh",
  stack: true,
  showCurrentTime: true,
  horizontalScroll: true,
  zoomKey: "ctrlKey",
  min: adjustedMinDate,
  max: adjustedMaxDate,
  start: startDate,
  end: endDate,
  width: "100%",
  margin: {
    item: 20,
    axis: 5,
  },
  orientation: "bottom",
  template: function (item, element, data) {
    if (item.type === "range") {
      // Create a div to hold the content with a tooltip
      const contentDiv = document.createElement('div');
      contentDiv.className = 'vis-item-content';
      contentDiv.title = item.content; // Set the tooltip text
      contentDiv.innerText = item.content; // Set the visible text
      return contentDiv.outerHTML;
    }
    return item.content;
  },
};

const timelineElement = document.getElementById("timeline");
const timeline = new vis.Timeline(timelineElement, items, options);

// Set the initial zoom level
const initialStart = startDate;
const initialEnd = new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days after startDate
timeline.setWindow(initialStart, initialEnd);

window.addEventListener('load', () => {
  timeline.redraw();
});



var oldMarkers = [];

const mapMarkers = {};
const sortedTimeline = timelineData.reverse();
console.log(sortedTimeline);

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

            marker.bindPopup(popupContent);
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
const spinner = document.getElementById("spinner");

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

  // Reset the position of the details container
  detailsContainer.style.top = '56px'; // Aligns it to the map's top
  detailsContainer.style.left = 'auto'; // Reset left position
  detailsContainer.style.right = '0'; // Dock it to the right side of the viewport
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

  // Show spinner and hide content
  spinner.classList.remove("hidden");
  detailsContent.classList.add("hidden");

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

      // Hide spinner and show content
      spinner.classList.add("hidden");
      detailsContent.classList.remove("hidden");
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      // Hide spinner even if there's an error
      spinner.classList.add("hidden");
      detailsContent.classList.remove("hidden");
      detailsContent.innerHTML = "<div>Error loading data</div>";
    });
}

// Function to show the popover
function showPopover(event, item) {
  const popover = document.getElementById("timelinePopover");
  const flyToLocationBtn = document.getElementById("flyToLocationBtn");
  const showDetailsBtn = document.getElementById("showDetailsBtn");

  // Position the popover near the clicked timeline item
  const rect = event.target.getBoundingClientRect();
  popover.style.top = `${rect.top + window.scrollY + rect.height}px`;
  popover.style.left = `${rect.left + window.scrollX}px`;
  popover.style.display = "block";

  // Add event listeners to the buttons
  flyToLocationBtn.onclick = () => {
    flyToLocation(item);
    hidePopover();
  };

  showDetailsBtn.onclick = () => {
    showDetails(item);
    hidePopover();
  };
}

// Function to hide the popover
function hidePopover() {
  const popover = document.getElementById("timelinePopover");
  popover.style.display = "none";
}

// Function to fly to the location on the map
function flyToLocation(item) {
  resetMarkers();

  const view = [];

  item.place.forEach(function (place) {
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
}

// Function to show the details container
function showDetails(item) {
  const content = `<h3>${item.content}</h3>`;
  showDetailsContainer(content);
  populateContainer(item.oid);
}

// Timeline single-click event listener for showing the popover
document.getElementById("timeline").onclick = function (event) {
  var props = timeline.getEventProperties(event); // Get properties of the clicked event
  console.log("Clicked item:", props.item);
  if (props.item) {
    var clickedItem = timelineData.find((item) => item.oid === props.item);
    if (clickedItem) {
      showPopover(event, clickedItem);
    } else {
      console.error("Item not found in timelineData.");
    }
  } else {
    console.error("No item clicked.");
  }
};

// Hide the popover when clicking outside of it
document.addEventListener("click", function (event) {
  const popover = document.getElementById("timelinePopover");
  if (!popover.contains(event.target) && !event.target.closest(".vis-item")) {
    hidePopover();
  }
});

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
      //document.getElementById("map").style.height = `calc(100vh - ${newHeight}px - 56px)`;
      
      // Adjust the timeline size to fit the new container height
      timeline.setOptions({ height: `${newHeight}px` }); // Update timeline height
      timeline.redraw();  // Redraw or refresh the timeline
    }
  }

  function mouseUpHandler() {
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
  }

  resizer.addEventListener("mousedown", mouseDownHandler);
}

initResizerFn(document.querySelector(".resizer"), timelineContainer);

window.addEventListener('load', function () {
  timeline.redraw();
});

document.getElementById("toggleTimelineBtn").addEventListener("click", function() {
  const timelineContainer = document.getElementById("timeline-container");

  if (timelineContainer.style.display === "none" || !timelineContainer.style.display) {
    timelineContainer.style.display = "block";
  } else {
    timelineContainer.style.display = "none";
  }

  // Redraw the timeline after being shown
  if (timelineContainer.style.display === "block") {
    setTimeout(() => {
      timeline.redraw();
    }, 100); // Delay to ensure the container is fully visible
  }
});


function mobileTimeline() {
  const timelineContainer = document.getElementById("timeline-container");

  if (window.innerWidth <= 500) {
    // On mobile, make the timeline take up the full height
    timelineContainer.style.height = '100vh';
    timeline.setOptions({ height: '100vh' });
  } else {
    // Restore the timeline to its normal height
    timelineContainer.style.height = '25vh';
    timeline.setOptions({ height: '25vh' });
  }

  timeline.redraw(); // Redraw the timeline to fit the new dimensions
}

// Call resizeTimeline on page load and whenever the window is resized
window.addEventListener('resize', mobileTimeline);
mobileTimeline();