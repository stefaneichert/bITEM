function fadeIn(elem, time, selector) {
    if (selector == "id") {
        var el = [];
        el.push(document.getElementById(elem));
    }
    if (selector == "class") var el = document.getElementsByClassName(elem);

    Array.from(el).forEach(function(element) {
        makeFade(element, time)
    });
}

function makeFade(el, time) {
    el.style.opacity = 0;
    var last = +new Date();
    var tick = function () {
        el.style.opacity = +el.style.opacity + (new Date() - last) / time;
        last = +new Date();

        if (+el.style.opacity < 1) {
            (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
        }
    };
    tick();
}