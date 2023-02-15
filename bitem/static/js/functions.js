function fadeIn(elem, time, selector) {
    if (selector == "id") var el = document.getElementById(elem);
    if (selector == "class") var el = document.getElementsByClassName(elem);
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

function initiateFrameLoop(elem, string) {
    array = string.split("");
    var timer
    frameLooper(elem, timer)

}

function frameLooper(elem, timer) {
    divname = elem
    if (array.length > 0) {
        document.getElementById(elem).innerHTML += array.shift();
    } else {
        clearTimeout(timer);
    }
    loopTimer = setTimeout('frameLooper(divname)', 120);
}