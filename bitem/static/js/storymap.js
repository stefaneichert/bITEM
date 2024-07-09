// Filter the connections to include only "place" class connections
const mapData = data.connections.filter((connection) =>
    ["place"].includes(connection.class)
);

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
        const {origin_id, begin, beginDBP, duration, end, endDBP, origin, ...diffProps} = item;
        const key = JSON.stringify({origin_id, begin, beginDBP, duration, end, endDBP, origin});
        if (!map.has(key)) {
            map.set(key, {origin_id, begin, beginDBP, duration, end, endDBP, origin, places: []});
        }
        map.get(key).places.push(diffProps);
    });
    return Array.from(map.values());
}

const groupedArray = groupByIdenticalKeys(sortedDates);

// Remove entry with undefined begin/end
const cleanedGroupedArray = groupedArray.filter(item => item.begin !== undefined && item.end !== undefined);

const map = L.map("map").setView([45.644, 13.756], 13);

var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});
osm.addTo(map);

var baseMaps = {
    "Open Street Map": osm
};
L.control.layers(baseMaps).addTo(map);

// Function to add markers to the map
function addMarker(data) {
    data.places.forEach(function (place) {
        let pointnotyetfound = true
        place.spatialinfo.geometry.geometries.forEach(function (geometry) {
            if (pointnotyetfound) {
                if (geometry.type === 'Point') {
                    var coordinates = geometry.coordinates;
                    var marker = L.marker([coordinates[1], coordinates[0]]).addTo(map);
                    marker.bindPopup("<b>" + data.origin.name + "</b><br>" + data.EN).openPopup();
                    pointnotyetfound = false
                }
            }
        })
    });
}

cleanedGroupedArray.forEach(addMarker);

function transformDate(dateString) {
    if (!dateString) {
        console.error('Invalid date string:', dateString);
        return null;
    }
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return new Date(year, month, day);
}

const timelineData = cleanedGroupedArray.map((item) => {
    if (!item.begin || !item.end) {
        console.error('Missing begin or end date for item:', item);
        return null;
    }
    return {
        oid: item.origin_id,
        content: item.origin.name || 'No Origin',
        start: transformDate(item.begin),
        end: transformDate(item.end)
    };
}).filter(item => item !== null);
console.log(timelineData);

const items = new vis.DataSet(timelineData.map(item => {
  console.log(item);
  const start = new Date(item.start);
  const end = new Date(item.end);
  const duration = (end - start) / (1000 * 60 * 60 * 24); // Convert duration to days
  item.title = `${item.content} (${start.toDateString()} - ${end.toDateString()})`;
  item.id = item.oid; 
  if (duration < 7) {
      item.type = 'point';
  } else {
      item.type = 'range';
  }
  return item;
}));

const options = {
    height: '25vh',
    stack: true,
    showCurrentTime: true,
    horizontalScroll: true,
    zoomKey: 'ctrlKey',
    min: new Date(1857, 0, 1),
    max: new Date(1862, 11, 31),
    width: '100%',
    margin: {
        item: 20,
        axis: 5
    },
    orientation: 'bottom',

};

const timelineElement = document.getElementById('timeline');
const timeline = new vis.Timeline(timelineElement, items, options);

document.getElementById('timeline').onclick = function (event) {
  var props = timeline.getEventProperties(event)
  console.log(props.item);
}