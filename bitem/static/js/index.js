    fadeIn("modelcont", 2500, "id");

var beyontheitem = {
    strings: ['Bey^40ond the It^40em'],
    typeSpeed: 40,
    showCursor: true,
    onComplete: (self) => {
        var d = document.getElementsByClassName("typed-cursor")[0];
        d.className += " d-none";
        fadeIn("learnmore", 500, "id");
    },
};

var beyond = new Typed('#typetext', beyontheitem);

