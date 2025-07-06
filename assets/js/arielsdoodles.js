function changeStyleOnEvents(els, events, portrait = "style1", landscape = "style2", callback = null) {
  function applyStyles(event) {
    if (window.matchMedia("(orientation: portrait)").matches || window.innerWidth <= 980) {
      if (els) {
        els.forEach(element => {
          element.classList.remove(landscape);
          element.classList.add(portrait);
        });
      }
    } else {
      if (els) {
        els.forEach(element => {
          element.classList.remove(portrait);
          element.classList.add(landscape);
        });
      }
    }

    // Run callback (if provided) — only once on "load"
    if (typeof callback === "function" && event.type === "load" && window.location.hash) {
      callback();
    }
  }

  events.forEach(evt => {
    window.addEventListener(evt, applyStyles, false);
  });

  // Apply once right away
  if (events.includes("load")) {
    applyStyles(new Event("load"));
  }
}

function scrollToHashAfterStylesSettle() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
      }
    });
  });
}

let banner = document.querySelectorAll(".banner");
let galleries = document.querySelectorAll(".gallery");

changeStyleOnEvents(banner, ["load"], "style1", "style2", scrollToHashAfterStylesSettle);
changeStyleOnEvents(galleries, ["load"], "style2", "style1");

// On resize, just apply styles (no scroll)
changeStyleOnEvents(banner, ["resize"], "style1", "style2");
changeStyleOnEvents(galleries, ["resize"], "style2", "style1");

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
