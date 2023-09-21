

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

const baseMaps = {
    "OpenStreetMap": OpenStreetMap,
    "OSM Humanitarian": OpenStreetMap_HOT,
    "Stamen Watercolor": Stamen_Watercolor
};

//circle marker style
const CircleStyle = {
    "color": "#324c6b",
    "weight": 1.5,
    "fillOpacity": 0.8,
    "fillColor": "#0088ce"
};
const CircleStyleHover = {
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
        const geom = element.geometry;
        if (!geom) return;

        if (getActiveItems().includes(element.id)) {

            geom.forEach((elem) => {
                if (elem) {
                    const label = getLabelTranslation(elem.properties);
                    const type = getTypeTranslation(elem.properties.type);


                    coords = elem.geometry.geometries.find(singleGeom => singleGeom.type === 'Point')
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
                        geometry: coords,
                    };
                    placeLayer.addData(geojsonFeature);
                }
            })

        }
    });

    return placeLayer
}

function getCoordinates(geom) {
    let coords
    geom.forEach((elem) => {
        if (elem) {
            coords = elem.geometry.geometries.find(singleGeom => singleGeom.type === 'Point')
        }
    })
    return coords

}