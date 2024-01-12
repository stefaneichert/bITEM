let nextslide = 1

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

let noTouchDevice

if (isTouchDevice()) {
    noTouchDevice = false
    console.log('This is a touch device.');
} else {
    noTouchDevice = true
    console.log('This is not a touch device.');
}

//create elements
//add first slide
const startSlide = document.getElementById('startSlide');
const mainWrapper = document.getElementById('mainWrapper');
const touchNavs = document.getElementById('touchNavs');
let mainImage = ''
//set 3d Model as background if available
let model = data.models
if (model) {
    model = model[0]
    let poster = ''
    let currentmodel = ''
    for (const file of model.files) {
        if (file.includes('glb')) currentmodel = file
        if (file.includes('webp')) poster = file
    }
    const itemTemplate = document.createElement('div');
    itemTemplate.innerHTML = `
    <div class="item-3d">
            <model-viewer
            class="title-object"
                alt="${model.name}"
                src="${uploadPath}/${currentmodel}"
                shadow-intensity="1"
                poster="${uploadPath}/${poster}"
                loading="lazy"
                auto-rotate
                auto-rotate-delay="0"
        ></model-viewer>
      </div>
`
    if (poster !== '') mainImage = uploadPath + '/' + poster;
    startSlide.appendChild(itemTemplate);
}

//set image as background if no model
let image = data.image
if (image) mainImage = iiifUrl + data.image.id + '/full/max/0/default.jpg'
if (image && !model) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = "image-container"
    itemTemplate.innerHTML = `
        <img loading="lazy"  class="title-image" src="${iiifUrl + data.image.id}/full/max/0/default.jpg">
    `
    startSlide.appendChild(itemTemplate);
}
let label = getLabelTranslation(data)
let mainImageSide
if (mainImage !== '') {
    let path = mainImage
    mainImage = '<img loading="lazy"  class="main-image" src=' + path + '>'
    mainImageSide = '<img loading="lazy"  class="main-image" src=' + path + '>'
} else {
    mainImageSide = `
        <div class="main-image ent-card">
            ${label}
        </div>`
}

function setTouchNavButton(index, label) {
    let touchNavItemTemplate = document.createElement('div')
    touchNavItemTemplate.className = 'swiper-button-touch'
    touchNavItemTemplate.innerHTML = label
    touchNavItemTemplate.onclick = function () {
        mainSwiper.slideTo(index, 100, false);
    };
    if (!noTouchDevice) touchNavs.appendChild(touchNavItemTemplate)
}

//set label and description

let description = ''
if (data.content) {
    description = getLanguage(data.content)
}

const itemTemplate = document.createElement('div');
itemTemplate.className = "bitem-text text-objects";
itemTemplate.innerHTML = `<div class="title-text" id="entLabel">${label}</div>${mainImage}<div class="desc-text">${description}</div>`
startSlide.appendChild(itemTemplate);

if (data.start || data.end) {
    const itemTlTemplate = document.createElement('div');
    itemTlTemplate.className = "tl-container"
    let begin = ''
    let end = ''
    let styleToUse = ' style="width: 100%"'
    if (data.start && data.end) styleToUse = ' style="width: 50%"'
    if (data.start) begin = `<li ${styleToUse}>${makeLocalDate(data.start).localdate}</li>`
    if (data.end) end = `<li ${styleToUse}>${makeLocalDate(data.end).localdate}</li>`
    itemTlTemplate.innerHTML = `
            <ul class="timeline">
            ${begin}                   
            ${end}                   
            </ul>`
    startSlide.appendChild(itemTlTemplate)

    if (!noTouchDevice) {
        let slideIndicator = document.createElement('div')
        slideIndicator.id = 'slideIndicator'
        slideIndicator.innerHTML = `
        <div>
          <span class="x-swipe-indicator">
          <i class="x-hand bi bi-hand-index-fill"></i>
          </span>
        </div>
        <div class="x-swipe-msg"></div>
        `
        startSlide.appendChild(slideIndicator)
        setTouchNavButton(0, languageTranslations._startPage)
        document.getElementById('touchBackbutton').classList.remove('d-none')
        document.getElementById('backbutton').classList.add('d-none')

        var styleElement = document.createElement('style');
        var cssRules = '.timeline li:first-child:after { content: ""; width: 100vw!important; left: -40px!important; }';
        styleElement.appendChild(document.createTextNode(cssRules));
        document.head.appendChild(styleElement);

    }
}

if (noTouchDevice) {
    let slideIndicator = document.createElement('div')
    slideIndicator.id = 'slideIndicator'
    slideIndicator.innerHTML = `
        <div>
          <span class="y-swipe-indicator">
          <i class="y-hand bi bi-hand-index-fill"></i>
          </span>
        </div>
        <div class="y-swipe-msg">${languageTranslations._swipeMessage}</div>
        `
    startSlide.appendChild(slideIndicator)
}

window.onload = function () {
    document.getElementById('entLabel').classList.add('fade-in')

    setTimeout(function () {
        document.getElementById('slideIndicator').classList = 'zero-op';
        setTimeout(function () {
            document.getElementById('slideIndicator').classList = 'zero-op d-none';
        }, 500)
    }, 2000)
};


function getallConnections(data, array) {
    const connections = data.connections;

    const allEnts = [];

    for (const connection of connections) {
        if (array.includes(connection.class)) {
            const nodes = connection.nodes;
            for (const node of nodes) {
                node.class = connection.class
                allEnts.push(node);

            }
        }
    }

    for (const ent of allEnts) {
        ent.involvement.sort((a, b) => {
            const dateA = (calculateTimeBP(a.begin));
            const dateB = (calculateTimeBP(b.begin));
            return dateB - dateA;
        });
    }

    allEnts.sort((a, b) => {
        const dateA = (calculateTimeBP(a.begin));
        const dateB = (calculateTimeBP(b.begin));
        return dateB - dateA;
    });


    return allEnts

}

const events = getallConnections(data, ['acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'])
if (events.length > 0) {
    createSlides(events, 'events')
}

function getTimelineDate(currentDatum) {
    if (currentDatum.begin && currentDatum.end) {
        return `${makeLocalDate(currentDatum.begin).localdate} - ${makeLocalDate(currentDatum.end).localdate}`
    }
    if (currentDatum.begin) return `${makeLocalDate(currentDatum.begin).localdate}`
    if (currentDatum.end) return `${makeLocalDate(currentDatum.end).localdate}`
    return getLabelTranslation(currentDatum)
}

function createSlides(dataToUse, class_) {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = "swiper-slide"
    itemTemplate.lazy = "true"
    itemTemplate.dataset.hash = class_
    itemTemplate.dataset.label = eval('languageTranslations._' + class_)
    itemTemplate.id = class_
    itemTemplate.innerHTML = `
    <div class="swiper ${class_}-swiper swiper-v">
          <div class="swiper-wrapper" id="${class_}Wrapper"></div>
          <div class="swiper-pagination"></div>
          <div class="swiper-button swiper-button-up"><i class="bi bi-arrow-up"></i></div>
          <div class="swiper-button swiper-button-down"><i class="bi bi-arrow-down"></i></div>          
    </div>
    `
    let subWrapper
    if (noTouchDevice) {
        mainWrapper.appendChild(itemTemplate);
        subWrapper = document.getElementById(class_ + 'Wrapper')
    } else {
        subWrapper = mainWrapper
        setTouchNavButton(nextslide, eval('languageTranslations._' + class_))
    }

    let i = 0;
    for (const node of dataToUse) {
        let timelineHTML = ''
        const invo = node.involvement
        let connection = ''
        for (const part of invo) {
            if (part.origin_id === data.id) {
                connection = getTypeTranslation(part.property)
            }
        }
        const label = getTypeTranslation(node._label)
        const itemTemplate = document.createElement('div');
        itemTemplate.className = "swiper-slide"
        itemTemplate.lazy = "true"
        itemTemplate.dataset.hash = class_ + '-' + node.id
        itemTemplate.dataset.date = makeLocalDate(node.begin).localdate
        let sideImage = `
            <div class="main-image ent-card">
                ${label}
            </div>`
        let imageToAdd = ''
        if (node.images) {
            imageToAdd = `
        <div class="image-container">
        <img loading="lazy" class="title-image" src="${iiifUrl + node.images[Math.floor(Math.random() * node.images.length)]}/full/max/0/default.jpg">
        </div>
        `;
            sideImage = '<img loading="lazy"  class="main-image" src="' + iiifUrl + node.images[Math.floor(Math.random() * node.images.length)] + '/full/max/0/default.jpg">'
        }

        let previous = ''
        let next = ''
        let firstLast = ''
        let width_
        if (i === 0 || i === dataToUse.length - 1) firstLast = ' style ="width: 50%;" '
        if (!noTouchDevice) {
            firstLast = 'style = "float: unset; width: unset;"'
        }
        let thisEvent = `<li ${firstLast} class="active">${getTimelineDate(dataToUse[i])}</li>`
        if (i > 0 && noTouchDevice) {
            previous = `<li ${firstLast}>${getTimelineDate(dataToUse[i - 1])}</li>`
        }
        if (i + 1 < dataToUse.length && noTouchDevice) {
            next = `<li ${firstLast}>${getTimelineDate(dataToUse[i + 1])}</li>`
        }

        i += 1;
        timelineHTML = `
        <div class="tl-container">
            <ul class="timeline">
                ${previous + thisEvent + next}        
            </ul>
        </div>
        `

        itemTemplate.innerHTML = `
        ${timelineHTML}
        <div class="bitem-text text-objects sub-swiper-elem">
        <div class="title-text opacity-100">${label}</div>
        <div class="container connection-container">
        <div class="row connection-row justify-content-center">
            <div class="col-md-4" title="${label}">${sideImage}</div>
            <div class="col-md-4 connector"">${connection}: ${getLabelTranslation(data)}</div>
            <div class="col-md-4" title="${getLabelTranslation(data)}">${mainImageSide}</div>
        </div>
        </div>
        <div class="desc-text">${getLanguage(node.content)}</div>
        </div>
        ${imageToAdd}       
        `

        subWrapper.appendChild(itemTemplate)
        nextslide += 1

    }

    let subSwiper

    if (noTouchDevice) {
        subSwiper = new Swiper(`.${class_}-swiper`, {
            direction: "vertical",
            keyboard: {
                enabled: true,
            },
            spaceBetween: 0,
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
                renderBullet: function (index, className) {
                    return '<span class="' + className + '"><span class="hover-bullettext">' + this.slides[index].attributes['data-date'].value + "</span></span>";
                }
            },
            navigation: {
                prevEl: ".swiper-button-up",
                nextEl: ".swiper-button-down",
            },
            grabCursor: true,
            allowTouchMove: true,
            hashNavigation: {
                watchState: true,
            },
        });
    }

    if (noTouchDevice) {
        subSwiper.on('slideNextTransitionStart', function () {
            let tlArray = document.getElementsByClassName('tl-container')
            for (var i = 0; i < tlArray.length; i++) {
                tlArray[i].classList = 'move-left tl-container';
                tlArray[i].classList.add('move-right');
                tlArray[i].classList.remove('move-left');
            }
        })

        subSwiper.on('slideNextTransitionEnd', function () {
            let tlArray = document.getElementsByClassName('tl-container')
            for (var i = 0; i < tlArray.length; i++) {
                tlArray[i].classList = 'tl-container moved-right';
            }
        })

        subSwiper.on('slidePrevTransitionStart', function () {
            let tlArray = document.getElementsByClassName('tl-container')
            for (var i = 0; i < tlArray.length; i++) {
                tlArray[i].classList = 'move-right tl-container';
                tlArray[i].classList.add('move-left');
                tlArray[i].classList.remove('move-right');
            }
        })

        subSwiper.on('slidePrevTransitionEnd', function () {
            let tlArray = document.getElementsByClassName('tl-container')
            for (var i = 0; i < tlArray.length; i++) {
                tlArray[i].classList = 'tl-container moved-left';
            }
        })
    }
}

makeStoryMap()

let mainSwiper = new Swiper(".main-swiper", {
    direction: "horizontal",
    keyboard: {
        enabled: true,
    },
    spaceBetween: 0,
    pagination: {
        el: ".swiper-pagination",
        clickable: noTouchDevice,
        renderBullet: function (index, className) {
            if (noTouchDevice) {
                return '<span class="' + className + '"><span class="hover-bullettext">' + this.slides[index].attributes['data-label'].value + "</span></span>";
            } else {
                return ''
            }
        }
    },
    navigation: {
        prevEl: ".swiper-button-left",
        nextEl: ".swiper-button-right",
    },
    grabCursor: true,
    hashNavigation: {
        watchState: true,
    }
});


function makeStoryMap() {
    const itemTemplate = document.createElement('div');
    itemTemplate.className = "swiper-slide"
    itemTemplate.lazy = "true"
    itemTemplate.dataset.hash = "storymap"
    itemTemplate.dataset.label = "Storymap"
    itemTemplate.id = "storyMap"
    itemTemplate.innerHTML = `<div id="map"></div>
        
    `
    mainWrapper.appendChild(itemTemplate)
    setTouchNavButton(nextslide, "Storymap")
    nextslide += 1
}
