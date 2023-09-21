function fadeIn(elem, time, selector) {
    if (selector == "id") {
        var el = [];
        el.push(document.getElementById(elem));
    }
    if (selector == "class") var el = document.getElementsByClassName(elem);

    Array.from(el).forEach(function (element) {
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


//scroll to top button
let scrollbutton = document.getElementById("btn-back-to-top");

window.onscroll = function () {
    scrollFunction();
};

function scrollFunction() {
    if (
        document.body.scrollTop > 300 ||
        document.documentElement.scrollTop > 300
    ) {
        scrollbutton.style.display = "block";
    } else {
        scrollbutton.style.display = "none";
    }
}

scrollbutton.addEventListener("click", backToTop);

function backToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

function getLanguage(data) {
    if (data) {
        let text = data.description;
        if (text.includes('_##')) {
            const mySubString = text.substring(
                text.indexOf(`##${language}_##`) + 7,
                text.lastIndexOf(`##_${language}##`)
            );
            text = mySubString;
        }
        return text;
    } else {
        return '';
    }
}

function getLabelTranslation(data) {
    let label = data._label.name;
    const languageLabel = data._label[language.toUpperCase()];
    if (typeof languageLabel !== "undefined") {
        label = languageLabel;
    }
    return label;
}


function getTypeTranslation(data) {
    let typeName = data.name;
    const languageType = data[language.toUpperCase()];

    if (typeof languageType !== "undefined") {
        typeName = languageType;
    }
    return typeName;
}

function customSortInvolvement(a, b) {
    const dateA = new Date(a.invbegin);
    const dateB = new Date(b.invbegin);

    if (dateA < dateB) {
        return -1;
    } else if (dateA > dateB) {
        return 1;
    } else {
        const endDateA = new Date(a.invend);
        const endDateB = new Date(b.invend);

        if (endDateA < endDateB) {
            return -1;
        } else if (endDateA > endDateB) {
            return 1;
        } else {
            return 0;
        }
    }
}

function makeLocalDate(dateString) {
    const date = new Date(dateString);

// Format the date based on the user's locale

    if (isValidDate(date)) {
        const formattedDate = new Intl.DateTimeFormat(language).format(date);
        return formattedDate;
    } else {
        return '?'
    }
}

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}