var grid = new Muuri('.grid', {
    dragEnabled: true,
    dragPlaceholder: {
        enabled: true
    },
    layout: {
        fillGaps: true,
    }
});

window.addEventListener('load', function () {
    grid.refreshItems().layout();
    document.body.classList.add('images-loaded');
});

var map = L.map('map', {scrollWheelZoom: false, dragging: false}).setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


var nodes = new vis.DataSet([
    {id: 1, label: "Node 1", fixed: true},
    {id: 2, label: "Node 2"},
    {id: 3, label: "Node 3"},
    {id: 4, label: "Node 4"},
    {id: 5, label: "Node 5"},
]);


var edges = new vis.DataSet([
    {from: 1, to: 3},
    {from: 1, to: 2},
    {from: 2, to: 4},
    {from: 2, to: 5},
    {from: 3, to: 4},
]);


var container = document.getElementById("mynetwork");
var data = {
    nodes: nodes,
    edges: edges,
};
var options = {
    interaction: {
        dragNodes: false,
        dragView: false,
        zoomView: false
    }
}
var network = new vis.Network(container, data, options);

timeline(document.querySelectorAll('.timeline'), {
    forceVerticalMode: 768,
    mode: 'horizontal',
    visibleItems: 4,
    moveItems: 3
});