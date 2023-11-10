let timethere = false
let dateless = true

datecheck = document.getElementById('timeinc')

datecheck.addEventListener('change', function () {
        dateless = datecheck.checked;
        applycheckFilters(checkedValues, andOr)
    });

function prepareTimeData() {

    eventdates = []
    for (const node of data) {
        if (node.start) eventdates.push(node.start)
        if (node.end) eventdates.push(node.end)
    }
    console.log(eventdates)
    const properdates = eventdates.map(dateString => new Date(dateString));
    properdates.sort((a, b) => a - b);
    console.log(properdates)

     const dates = properdates.map(dateString => new Date(dateString).toISOString().substring(0, 10),);
    const finaldates = new Set(dates);
    let begin = finaldates[0]
    let end = finaldates[dates.length - 1]
    console.log(begin + ' - ' + end)
    let i = 0
    times = []
    for (const date of finaldates) {
        times[i] = date
        i += 1
    }

    console.log(times)
    console.log(times.length)
    if (times.length > 2) {timethere = true; document.getElementById('timeslider').classList.remove('d-none')}
    document.getElementById('fromInput').value = makeLocalDate(times[0])
    document.getElementById('fromSlider').min = 0
    document.getElementById('fromSlider').max = (times.length - 1)
    document.getElementById('fromSlider').value = 0
    document.getElementById('toSlider').min = 0
    document.getElementById('toSlider').max = times.length - 1
    document.getElementById('toSlider').value = times.length - 1
    document.getElementById('toInput').value = makeLocalDate(times[times.length - 1])

}

prepareTimeData()

function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
    const [from, to] = getParsed(fromInput, toInput);
    fillSlider(fromInput, toInput, '#C6C6C6', '#0d6efd', controlSlider);
    if (from > to) {
        fromSlider.value = to;
        fromInput.value = makeLocalDate(to);
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
        toInput.value = makeLocalDate(to);
    } else {
        toInput.value = makeLocalDate(from);
    }
}

function controlFromSlider(fromSlider, toSlider, fromInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#0d6efd', toSlider);
    if (from > to) {
        fromSlider.value = to;
        fromInput.value = makeLocalDate(times[to]);
    } else {
        fromInput.value = makeLocalDate(times[from]);
    }
    applycheckFilters(checkedValues, andOr)

}

function controlToSlider(fromSlider, toSlider, toInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#0d6efd', toSlider);
    setToggleAccessible(toSlider);
    if (from <= to) {
        toSlider.value = to;
        toInput.value = makeLocalDate(times[to]);
    } else {
        toInput.value = makeLocalDate(times[from]);
        toSlider.value = from;
    }
    applycheckFilters(checkedValues, andOr)
}

function getDateArray() {
    console.log(fromSlider.value + ' - ' + toSlider.value)
    const firstDate = new Date(times[fromSlider.value]);
    const lastDate = new Date(times[toSlider.value])

    console.log(firstDate)
    console.log(lastDate)

    const allItems = grid.getItems()
    const filteredItems = allItems.filter(item => {
        const element = item.getElement();
        let start = element.getAttribute('data-begin')
        let end = element.getAttribute('data-end')
        if (start === "null") start = end
        if (end === "null") end = start
        if (start === "null" && end === "null" && dateless) return true
        start = new Date(start)
        end = new Date(end)
        const beginIsLaterOrSame = start >= firstDate;
        const endIsEarlierOrSame = end <= lastDate;
        if (beginIsLaterOrSame && endIsEarlierOrSame) {
            return true
            console.log('data-begin is later or the same as the first entry in the array, and data-end is earlier or the same as the last entry in the array.');
            console.log(start)
            console.log(end)
            console.log(element.getAttribute('data-name'))
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