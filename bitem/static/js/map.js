var map = L.map('map').setView([48.205049898, 16.359949114], 18);

L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var marker = L.marker([48.205049898, 16.359949114]).addTo(map);
marker.bindPopup("<b>Hier wohnt das bITEM Projekt</b>");

