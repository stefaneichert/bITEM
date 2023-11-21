let timethere = false
let dateless = true

datecheck = document.getElementById('timeinc')

datecheck.addEventListener('change', function () {
    dateless = datecheck.checked;
    applycheckFilters(checkedValues, andOr)
});

function prepareTimeData() {
    //primary stringarray
    const eventdates = []
    for (const node of data) {
        if (node.start) eventdates.push(node.start)
        if (node.end) eventdates.push(node.end)
    }

// Define a custom function to extract the date part for sorting
    const extractDate = (dateStr) => {
        // Assuming the format is 'YYYY-MM-DD'
        return dateStr.slice(-10);
    };

// Use a Set to keep track of unique dates while sorting
    const uniqueDates = new Set();

// Sort and filter for unique dates
    const finaldates = eventdates
        .sort((a, b) => {
            const dateA = extractDate(a);
            const dateB = extractDate(b);

            if (dateA < dateB) {
                return -1;
            } else if (dateA > dateB) {
                return 1;
            } else {
                return 0;
            }
        })
        .filter((dateStr) => {
            const date = extractDate(dateStr);
            if (!uniqueDates.has(date)) {
                uniqueDates.add(date);
                return true;
            }
            return false;
        });

    let begin = finaldates[0]
    let end = finaldates[finaldates.length - 1]
    let i = 0
    times = []
    for (const date of finaldates) {
        times[i] = date
        i += 1
    }

    if (times.length > 2) {
        timethere = true;
        document.getElementById('timeslider').classList.remove('d-none')
    }
    document.getElementById('fromInput').value = makeLocalDate(times[0]).localdate
    document.getElementById('fromSlider').min = 0
    document.getElementById('fromSlider').max = (times.length - 1)
    document.getElementById('fromSlider').value = 0
    document.getElementById('toSlider').min = 0
    document.getElementById('toSlider').max = times.length - 1
    document.getElementById('toSlider').value = times.length - 1
    document.getElementById('toInput').value = makeLocalDate(times[times.length - 1]).localdate
}

prepareTimeData()

function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
    const [from, to] = getParsed(fromInput, toInput);
    fillSlider(fromInput, toInput, '#C6C6C6', '#0d6efd', controlSlider);
    if (from > to) {
        fromSlider.value = to;
        fromInput.value = makeLocalDate(to).localdate;
    } else {
        fromSlider.value = from;
    }
}

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
    const [from, to] = getParsed(fromInput, toInput);
    fillSlider(fromInput, toInput, '#C6C6C6', '#0d6efd', controlSlider);
    setToggleAccessible(toInput);
    if (from <= to) {
        toSlider.value = to;
        toInput.value = makeLocalDate(to).localdate;
    } else {
        toInput.value = makeLocalDate(from).localdate;
    }
}

function controlFromSlider(fromSlider, toSlider, fromInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#0d6efd', toSlider);
    if (from > to) {
        fromSlider.value = to;
        fromInput.value = makeLocalDate(times[to]).localdate;
    } else {
        fromInput.value = makeLocalDate(times[from]).localdate;
    }
    applycheckFilters(checkedValues, andOr)

}

function controlToSlider(fromSlider, toSlider, toInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#0d6efd', toSlider);
    setToggleAccessible(toSlider);
    if (from <= to) {
        toSlider.value = to;
        toInput.value = makeLocalDate(times[to]).localdate;
    } else {
        toInput.value = makeLocalDate(times[from]).localdate;
        toSlider.value = from;
    }
    applycheckFilters(checkedValues, andOr)
}

function getDateArray() {
    const firstDate = (times[fromSlider.value]);
    const lastDate = (times[toSlider.value])
    const allItems = grid.getItems()
    const filteredItems = allItems.filter(item => {
        const element = item.getElement();
        let start = element.getAttribute('data-begin')
        let end = element.getAttribute('data-end')
        if (start === "null") start = end
        if (end === "null") end = start
        if (start === "null" && end === "null" && dateless) return true
        const beginIsLaterOrSame = start >= firstDate;
        const endIsEarlierOrSame = end <= lastDate;
        if (beginIsLaterOrSame && endIsEarlierOrSame) {
            return true
        }


    });
    return filteredItems
}

function getParsed(currentFrom, currentTo) {
    const from = parseInt(currentFrom.value, 10);
    const to = parseInt(currentTo.value, 10);
    return [from, to];
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
    const rangeDistance = to.max - to.min;
    const fromPosition = from.value - to.min;
    const toPosition = to.value - to.min;
    controlSlider.style.background = `linear-gradient(
      to right,
      ${sliderColor} 0%,
      ${sliderColor} ${(fromPosition) / (rangeDistance) * 100}%,
      ${rangeColor} ${((fromPosition) / (rangeDistance)) * 100}%,
      ${rangeColor} ${(toPosition) / (rangeDistance) * 100}%, 
      ${sliderColor} ${(toPosition) / (rangeDistance) * 100}%, 
      ${sliderColor} 100%)`;
}

function setToggleAccessible(currentTarget) {
    const toSlider = document.querySelector('#toSlider');
    if (Number(currentTarget.value) <= 0) {
        toSlider.style.zIndex = 2;
    } else {
        toSlider.style.zIndex = 0;
    }
}

const fromSlider = document.querySelector('#fromSlider');
const toSlider = document.querySelector('#toSlider');
const fromInput = document.querySelector('#fromInput');
const toInput = document.querySelector('#toInput');
fillSlider(fromSlider, toSlider, '#C6C6C6', '#0d6efd', toSlider);
setToggleAccessible(toSlider);

fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);