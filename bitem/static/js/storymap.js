storyMapContainer = document.getElementById("map");

const mapData = data.connections.filter((connection) =>
  ["place"].includes(connection.class)
);

storyMapContainer.innerHTML = mapData;

let myTimeEntity = [];

for (const place in mapData[0].nodes) {
  let dateThere = false;
  let placeThere = false;
  if (
    typeof mapData[0].nodes[place].spatialinfo.geometry.geometries[0]
      .coordinates !== "undefined"
  ) {
    placeThere = true;

    mapData[0].nodes[place].involvement.forEach((node) => {
      //console.log(node);
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
sortedDates = myTimeEntity.sort((a, b) => {
    if (a.beginDBP) {
        aBeginSort = a.beginDBP;
    }
    else (aBeginSort = a.endDBP)

    if (b.beginDBP) {
        bBeginSort = b.beginDBP;
    }
    else (bBeginSort = b.endDBP)

    if (bBeginSort !== aBeginSort) {
    

    return bBeginSort - aBeginSort;
  }
    else {
            if (a.endDBP) {
        aEndSort = a.endDBP;
    } 
    else (aEndSort = a.beginDBP)

    if (b.endDBP) {
        bEndSort = b.endDBP;

    }
    else (bEndSort = b.beginDBP)

    }
    return bEndSort - aEndSort;



});

let = currentID = 0;

function groupByIdenticalKeys(array) {
    // Using a map to group by the identical keys (id and name in this case)
    const map = new Map();
    
    array.forEach(item => {
        const { origin_id, begin, beginDBP, duration, end, endDBP, origin, ...diffProps } = item;
        const key = JSON.stringify({ origin_id, begin, beginDBP, duration, end, endDBP, origin });
        
        if (!map.has(key)) {
            map.set(key, { origin_id, begin, beginDBP, duration, end, endDBP, origin, places: [] });
        }
        
        map.get(key).places.push(diffProps);
    });

    // Convert map values to an array
    return Array.from(map.values());
}

const groupedArray = groupByIdenticalKeys(sortedDates);
console.log(groupedArray, null, 2);


// console.log(mapData);
/*
liste daten aller places

mapData sortieren anch datumswert -> beginn, ende, dauer

preceeding, succeeding continiuierlich andere nicht

welche ereignisse setzen einander fort?

welche ereignisse überschneiden einander? -> unterschiediche zeilen !

erignisse-> involvement

calculate

Absteigend zuerst sortieren!!!

*/
