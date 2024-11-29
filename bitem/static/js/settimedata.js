function transformDate(dateString) {
    if (!dateString) {
        console.error("Invalid date string:", dateString);
        return null;
    }
    let prefix = ''
    let year, month = 0, day = 1; // Default values for month and day
    if (dateString[0] === '-') {
        dateString = dateString.slice(1)
        prefix = '-'
    }

    if (dateString.includes("-")) {
        // Handle dates with full year-month-day format
        const parts = dateString.split("-");
        year = parseInt(prefix + parts[0], 10);
        if (parts.length > 1) {
            month = parseInt(parts[1], 10) - 1; // Convert to 0-indexed month
        }
        if (parts.length > 2) {
            day = parseInt(parts[2], 10);
        }
    } else {
        // Handle dates like "-00027150" (BCE year only)
        year = parseInt(prefix + dateString, 10);
    }
    // Return the constructed date
    const date = new Date(year, month, day);

    // Handle edge cases where parsing failed
    if (isNaN(date.getTime())) {
        console.error("Unable to parse date string:", dateString);
        return null;
    }

    return date;
}

// Filter the connections to include only "place" class connections
function makeMapData(data, id) {
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
                    let dateThere = false;

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

    const groupedArray = groupByIdenticalKeys(sortedDates);

// Remove entry with undefined begin/end
    const cleanedGroupedArray = groupedArray.filter(
        (item) => item.begin !== undefined || item.end !== undefined
    );

    // Ensure startDate and endDate are defined
let startDate, endDate;

// Validate and transform timeline data
const timelineData = cleanedGroupedArray
    .map((item) => {
        if (!item.begin && !item.end) {
            console.error("Missing begin or end date for item:", item);
            return null;
        }

        if (item.begin && !item.end) {
            item.end = item.begin
        }

        if (item.end && !item.begin) {
            item.begin = item.end
        }

        if (typeof item.places[0] === "undefined") {
            console.error("No Origin", item);
            return null;
        }
        const place = item.places;

        const start = transformDate(item.begin);
        const end = transformDate(item.end);

        const startstring = makeLocalDate(item.begin).localdate;
        const endstring = makeLocalDate(item.end).localdate;
        // Validate the transformed dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.error("Invalid date for item:", item);
            return null;
        }

        if (item.origin_id === id) return null

        // Set startDate and endDate if not already set
        if (!startDate || start < startDate) {
            startDate = start;
        }
        if (!endDate || end > endDate) {
            endDate = end;
        }

        let invo = ''
        let connector = ', '
        let i = 1
        for (const place of item.places) {
            if (i === item.places.length) connector = ''
            invo += getTypeTranslation(place.property) + connector
            i += 1
        }

        return {
            oid: item.origin_id,
            content: getTypeTranslation(item.origin),
            start: start,
            end: end,
            involvement: invo,
            startstring: startstring,
            endstring: endstring,
            place: place,
        };
    })
    .filter((item) => item !== null);

if (!startDate || !endDate) {
    console.error("startDate or endDate is not defined");
    // Handle the error appropriately, e.g., set default values or exit
    startDate = new Date(); // Default to current date
    endDate = new Date(); // Default to current date
}

    returnData = {'timelineData': timelineData, 'startDate': startDate, 'endDate': endDate, 'mapData':mapData}

    return returnData

}


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

