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

  // Entrada de las secciones con [data-enter]: el CSS anima el título y el
  // contenido cuando la sección recibe .is-in (una sola vez).
  var enter = document.querySelectorAll("[data-enter]");

  if (!("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(enter, function (el) {
      el.classList.add("is-in");
    });
  } else {
    var enterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            enterObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -25% 0px" }
    );
    Array.prototype.forEach.call(enter, function (el) {
      enterObserver.observe(el);
    });
  }

  // Juegos: carrusel de destacados. Cambia solo cada 4,5 s. Espera con el
  // puntero sobre el texto o el foco del teclado adentro, y no corre si se pidió
  // reducir movimiento. Las imágenes de cada juego se piden cuando hacen falta.
  var feat = document.querySelector("[data-feat]");

  if (feat) {
    var INTERVAL = 4500;
    var slides = feat.querySelectorAll("[data-feat-slide]");
    var dots = feat.querySelectorAll("[data-feat-dot]");
    var featStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = 0;
    var timer = null;
    var held = false;

    var load = function (i) {
      // El <source> antes que el <img>, para no bajar las dos versiones
      Array.prototype.forEach.call(slides[i].querySelectorAll("[data-src], [data-srcset]"), function (el) {
        if (el.hasAttribute("data-srcset")) {
          el.srcset = el.getAttribute("data-srcset");
          el.removeAttribute("data-srcset");
        }
        if (el.hasAttribute("data-src")) {
          el.src = el.getAttribute("data-src");
          el.removeAttribute("data-src");
        }
      });
    };
    var paint = function () {
      // La rayita activa toma el color del juego y su barra arranca de cero
      feat.style.setProperty("--dot", getComputedStyle(slides[current]).getPropertyValue("--g-accent"));
      feat.classList.remove("is-playing");
      void feat.offsetWidth;
      if (timer) feat.classList.add("is-playing");
    };
    var show = function (i) {
      i = (i + slides.length) % slides.length;
      if (i === current) return;
      load(i);
      slides[current].classList.remove("is-active");
      dots[current].removeAttribute("aria-current");
      current = i;
      slides[current].classList.add("is-active");
      dots[current].setAttribute("aria-current", "true");
      load((current + 1) % slides.length);
      paint();
    };
    var play = function () {
      if (featStill || held || timer || document.hidden) return;
      timer = setInterval(function () {
        show(current + 1);
      }, INTERVAL);
      paint();
    };
    var stop = function () {
      clearInterval(timer);
      timer = null;
      feat.classList.remove("is-playing");
    };
    var restart = function () {
      stop();
      play();
    };

    feat.style.setProperty("--feat-interval", INTERVAL + "ms");
    Array.prototype.forEach.call(slides, function (slide) {
      slide.hidden = false;
    });
    load(1 % slides.length);

    feat.querySelector("[data-feat-prev]").addEventListener("click", function () {
      show(current - 1);
      restart();
    });
    feat.querySelector("[data-feat-next]").addEventListener("click", function () {
      show(current + 1);
      restart();
    });
    Array.prototype.forEach.call(dots, function (dot, i) {
      dot.addEventListener("click", function () {
        show(i);
        restart();
      });
    });

    Array.prototype.forEach.call(feat.querySelectorAll(".g-content"), function (content) {
      content.addEventListener("mouseenter", function () {
        held = true;
        stop();
      });
      content.addEventListener("mouseleave", function () {
        held = false;
        play();
      });
    });
    feat.addEventListener("focusin", function (event) {
      if (event.target.matches(":focus-visible")) {
        held = true;
        stop();
      }
    });
    feat.addEventListener("focusout", function (event) {
      if (!feat.contains(event.relatedTarget)) {
        held = false;
        play();
      }
    });

    // Deslizar con el dedo pasa al juego de al lado
    var touchX = null;
    feat.addEventListener(
      "touchstart",
      function (event) {
        touchX = event.touches[0].clientX;
      },
      { passive: true }
    );
    feat.addEventListener("touchend", function (event) {
      if (touchX === null) return;
      var dx = event.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 45) {
        show(current + (dx < 0 ? 1 : -1));
        restart();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else play();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) play();
        else stop();
      }).observe(feat);
    } else {
      play();
    }
    paint();
  }

  // Juegos: la fila de todos los juegos se mueve a mano, con el dedo, el
  // trackpad o las flechas. Las flechas avanzan de a una pantalla de tarjetas y
  // se apagan en los extremos; si entran todas a la vista, no aparecen.
  var lib = document.querySelector("[data-lib]");

  if (lib) {
    var row = lib.querySelector("[data-lib-row]");
    var libStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var prevBtn = document.querySelector("[data-lib-prev]");
    var nextBtn = document.querySelector("[data-lib-next]");

    var update = function () {
      var max = lib.scrollWidth - lib.clientWidth;
      lib.classList.toggle("is-still", max <= 1);
      if (prevBtn) prevBtn.disabled = lib.scrollLeft <= 1;
      if (nextBtn) nextBtn.disabled = lib.scrollLeft >= max - 1;
    };
    var stepBy = function (dir) {
      var card = row.querySelector(".lib-card:not([hidden])");
      if (!card) return;
      var step = card.offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0);
      var perPage = Math.max(1, Math.floor((lib.clientWidth - 2 * parseFloat(getComputedStyle(lib).paddingLeft)) / step));
      lib.scrollBy({ left: dir * step * perPage, behavior: libStill ? "auto" : "smooth" });
    };
    if (prevBtn) prevBtn.addEventListener("click", function () { stepBy(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { stepBy(1); });
    lib.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    // Filtros por cantidad de jugadores
    var filters = document.querySelectorAll("[data-filter]");
    var empty = document.querySelector("[data-lib-empty]");
    Array.prototype.forEach.call(filters, function (btn) {
      btn.addEventListener("click", function () {
        var group = btn.getAttribute("data-filter");
        var shown = 0;
        Array.prototype.forEach.call(filters, function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        Array.prototype.forEach.call(row.querySelectorAll("[data-groups]"), function (card) {
          var match = group === "todos" || card.getAttribute("data-groups").split(" ").indexOf(group) > -1;
          card.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
        lib.scrollLeft = 0;
        update();
      });
    });

    update();
  }

  // Carruseles con [data-autoplay] (la caja en el celular): avanzan solos cada
  // 2,5 s mientras están a la vista. Se frenan mientras se tocan y unos segundos
  // después, y no se mueven si se pidió reducir movimiento.
  var rails = document.querySelectorAll("[data-autoplay]");
  var phone = window.matchMedia("(max-width: 760px)");

  if (rails.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    Array.prototype.forEach.call(rails, function (rail) {
      var inView = false;
      var heldUntil = 0;
      var hold = function () {
        heldUntil = Date.now() + 5000;
      };
      rail.addEventListener("pointerdown", hold, { passive: true });
      rail.addEventListener("touchstart", hold, { passive: true });
      rail.addEventListener("wheel", hold, { passive: true });

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          function (entries) {
            inView = entries[0].isIntersecting;
          },
          { threshold: 0.5 }
        ).observe(rail);
      } else {
        inView = true;
      }

      setInterval(function () {
        if (!phone.matches || !inView || Date.now() < heldUntil) return;
        var first = rail.firstElementChild;
        if (!first) return;
        var step = first.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 0);
        var atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
        rail.scrollTo({ left: atEnd ? 0 : rail.scrollLeft + step, behavior: "smooth" });
      }, 2500);
    });
  }

  // Medición: los clics que importan van a GA4 y Clarity (analytics.js define
  // window.atlasTrack; si no cargó o no tiene IDs, esto no hace nada).
  var track = function (name, params) {
    if (window.atlasTrack) window.atlasTrack(name, params);
  };

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    var where = { link_text: link.textContent.trim().slice(0, 60), page: location.pathname };

    if (href.indexOf("aquihaydragones.com.ar") !== -1) {
      track("click_comprar", where);
    } else if (href.indexOf("AtlasPiecesBase.stl") !== -1) {
      track("descargar_stl", where);
    } else if (/instagram\.com|youtube\.com|tiktok\.com|discord\.|linkedin\.com|x\.com/.test(href)) {
      track("click_social", { network: link.hostname.replace(/^www\./, ""), page: location.pathname });
    } else if (/play\.google\.com|testflight\.apple\.com|apps\.apple\.com/.test(href)) {
      track("click_app", { store: link.hostname, page: location.pathname });
    } else if (link.closest(".lib-card")) {
      track("click_juego", { game: href.split("/").filter(Boolean).pop() });
    }
  });

  // «toggle» no burbujea: se escucha en captura para abarcar todos los <details>
  document.addEventListener(
    "toggle",
    function (event) {
      var details = event.target;
      if (!details.open || !details.closest || !details.closest(".faq")) return;
      var summary = details.querySelector("summary");
      track("faq_open", { question: summary ? summary.textContent.trim() : "" });
    },
    true
  );

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
