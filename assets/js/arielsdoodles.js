function changeStyleOnEvents(els, events, portrait="style1", landscape="style2") {
  for (var i = 0; i < events.length; i++) {
    window.addEventListener(
      events[i],
      function () {
        if (window.matchMedia("(orientation: portrait)").matches || window.innerWidth <= 980) {
          // you're in PORTRAIT mode

          if (els != null) {
            els.forEach(element => {
              element.classList.remove(landscape);
              element.classList.add(portrait);
            });
          }
        }

        if (window.matchMedia("(orientation: landscape)").matches|| window.innerWidth > 980) {
          // you're in LANDSCAPE mode
          if (els != null) {
            els.forEach(element => {
              element.classList.remove(portrait);
              element.classList.add(landscape);
            });
          }
        }
      },
      false
    );
  }
}
let banner = document.querySelectorAll(".banner");
let events = ["load", "resize"];
changeStyleOnEvents(banner, events);

let galleries = document.querySelectorAll(".gallery");
changeStyleOnEvents(galleries, events, "style2", "style1");

const targetElements = document.querySelectorAll(".modal");

// Create a new MutationObserver
/*const observer = new MutationObserver((mutationsList) => {
  for (let mutation of mutationsList) {
    if (mutation.type === "attributes" && mutation.attributeName === "class") {
      let target = mutation.target;
      if (
        target.classList.contains("visible") &&
        target.classList.contains("loaded")
      ) {
        let cat = document.createElement("div");
        cat.classList.add("cat-title");
        cat.append("Hello Kitty");
        target.querySelector(".inner").append(cat);
      }
      // Perform any desired actions here
    }
  }
});

// Start observing the target element for changes in attributes
for (let i = 0; i < targetElements.length; i++)
  observer.observe(targetElements[i], { attributes: true });*/
