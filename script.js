/* Atlas — comportamiento compartido: menú móvil y animación de entrada. */
(function () {
  "use strict";

  // Menú móvil
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Cerrar" : "Menú";
    });

    nav.addEventListener("click", function (event) {
      if (event.target.tagName === "A" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menú";
      }
    });
  }

  // Video del hero: control de pausa y respeto por "reducir movimiento"
  var video = document.querySelector("[class~='hero__video']");
  var videoToggle = document.querySelector("[data-video-toggle]");

  if (video && videoToggle) {
    var label = videoToggle.querySelector("span");

    var sync = function (playing) {
      videoToggle.setAttribute("aria-pressed", String(!playing));
      label.textContent = playing ? "Pausar el video" : "Reproducir el video";
      // El icono lo decide el CSS a partir de esta clase: <g> es SVGElement y
      // no expone la propiedad .hidden, así que no sirve alternarla.
      videoToggle.classList.toggle("is-paused", !playing);
    };

    video.addEventListener("play", function () {
      sync(true);
    });
    video.addEventListener("pause", function () {
      sync(false);
    });

    videoToggle.addEventListener("click", function () {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });

    // Quien pide menos movimiento ve el póster hasta que decida reproducirlo.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.removeAttribute("autoplay");
      video.pause();
      sync(false);
    }
  }

  // Animación de entrada
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".reveal");

  if (reduce || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(items, function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
  );

  Array.prototype.forEach.call(items, function (el) {
    observer.observe(el);
  });
})();
