function changeStyleOnEvents(el, events) {
  for (var i = 0; i < events.length; i++) {
    window.addEventListener(
      events[i],
      function () {
        if (window.matchMedia("(orientation: portrait)").matches) {
          // you're in PORTRAIT mode

          if (el != null) {
            el.classList.remove("style2");
            el.classList.add("style1");
          }
        }

        if (window.matchMedia("(orientation: landscape)").matches) {
          // you're in LANDSCAPE mode
          if (el != null) {
            el.classList.remove("style1");
            el.classList.add("style2");
          }
        }
      },
      false
    );
  }
}
let el = document.querySelector(".banner");
let events = ["load", "resize"];
changeStyleOnEvents(el, events);

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
