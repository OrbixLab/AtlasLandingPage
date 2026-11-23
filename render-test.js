/* PRUEBA: los renders (1000 × 1000, 30 fps) en lugar de las escenas 3D de atlas3d.js.
   Por defecto van los MP4 con el fondo ya pintado del color de la banda (amarillo, tinta
   o papel), que se ven igual en todos los navegadores. Con ?alfa en la dirección van
   los WebM VP9 con fondo transparente (Safari y los iPhone no muestran ese alfa). Cada bloque [data-render] reproduce sus
   videos en ciclo y sincroniza con el cuadro del video los epígrafes y la burbuja
   de Atlas Core (datos de los *_epigrafes.json y *_burbuja.json del render).
   Para volver a las escenas 3D: sacar este script y devolver data-atlas3d a cada bloque. */
(function () {
  "use strict";

  var stages = document.querySelectorAll("[data-render]");
  if (!stages.length) return;

  var FPS = 30;
  var ES = document.documentElement.lang === "es";
  var ALFA = /[?&]alfa(?:[=&]|$)/.test(location.search);

  // Video de cada render: el MP4 con el color de su banda, o el WebM con alfa.
  function src(name, fondo) {
    return "/assets/renders/" + (ALFA ? name + ".webm" : name + "_" + fondo + ".mp4");
  }

  // Epígrafes: [cuadro desde el que se ve (1 = primero), inglés, español]
  var R = {
    maze: {
      src: src("maze", "amarillo"),
      caps: [
        [1, "Maze: two pieces, one treasure in the center.", "Maze: dos fichas, un tesoro en el centro."],
        [22, "The labyrinth is hidden: you can't see the walls.", "El laberinto está escondido: no se ven las paredes."],
        [40, "Every step you take lights up.", "Cada paso que das se enciende."],
        [59, "Wall! The piece goes back to the start.", "¡Pared! La ficha vuelve al inicio."],
        [84, "The other piece's turn.", "Turno de la otra ficha."],
        [133, "It reached the treasure and won!", "¡Llegó al tesoro y ganó!"],
      ],
    },
    ajedrez: {
      src: src("ajedrez", "amarillo"),
      caps: [
        [1, "Chess: Atlas shows you the possible moves.", "Ajedrez: Atlas indica las posiciones."],
        [61, "Atlas helps you through every game.", "Atlas te ayuda con tus partidas."],
        [94, "Play solo against the AI or against a friend.", "Jugá solo con la IA o contra un amigo."],
      ],
    },
    role_mapper: {
      src: src("role_mapper", "papel"),
      caps: [
        [1, "Put several boards together: one big table.", "Juntá varios tableros: una sola mesa."],
        [58, "Role Mapper: your RPG map, on the table.", "Role Mapper: tu mapa de rol, en la mesa."],
        [109, "Place your pieces and the adventure begins.", "Poné tus fichas y arranca la aventura."],
        [151, "Live effects: the river flows, the campfire burns.", "Efectos en vivo: el río corre y la fogata arde."],
        [305, "A hidden trigger clears the fog…", "Una trampa escondida despeja la niebla…"],
        [361, "The game master runs the session live.", "El máster controla la partida en vivo."],
        [546, "Your RPG map, made of light.", "Tu mapa de rol, hecho de luz."],
      ],
    },
    atlas_core: {
      src: src("atlas_core", "tinta"),
      // Burbuja: punto del video donde apunta la colita y [desde, hasta, texto, fondo, letra]
      bubble: {
        x: 0.5427,
        y: 0.4351,
        tramos: [
          [65, 104, "Red Piece!", "#d63a2b", "#ffffff"],
          [149, 188, "Blue Piece!", "#2f6fdb", "#ffffff"],
          [233, 272, "Yellow Piece!", "#f2c230", "#1d1d1d"],
          [317, 356, "Green Piece!", "#2e9e5b", "#ffffff"],
        ],
      },
    },
    ficha: { src: src("ficha", "papel") },
  };

  // Qué videos pasa cada bloque, en orden
  var PLAYLISTS = {
    juegos: ["maze", "ajedrez"],
    mesa: ["role_mapper"],
    modulo: ["atlas_core"],
    ficha: ["ficha"],
  };

  var VIDEO_CSS = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;";

  function setup(host) {
    var list = (PLAYLISTS[host.getAttribute("data-render")] || []).map(function (k) {
      return R[k];
    });
    if (!list.length) return;
    var cap = host.parentNode.querySelector("[data-atlas3d-cap]");

    // Un video por render, apilados: sólo el activo se ve (sin parpadeo al cambiar).
    var videos = list.map(function (r, i) {
      var v = document.createElement("video");
      v.src = r.src;
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.loop = list.length === 1;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("aria-hidden", "true");
      v.style.cssText = VIDEO_CSS + "opacity:" + (i ? 0 : 1) + ";";
      host.appendChild(v);
      return v;
    });

    var bubble = null;
    if (list.some(function (r) { return r.bubble; })) {
      bubble = document.createElement("div");
      bubble.className = "stage3d__bubble";
      bubble.setAttribute("aria-hidden", "true");
      host.appendChild(bubble);
    }

    var cur = 0, seen = false;
    function active() {
      return videos[cur];
    }
    function play(v) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }

    // Al terminar uno, arranca el siguiente desde el principio.
    videos.forEach(function (v, i) {
      v.addEventListener("ended", function () {
        if (list.length === 1) return;
        cur = (i + 1) % videos.length;
        var next = active();
        next.currentTime = 0;
        next.style.opacity = 1;
        v.style.opacity = 0;
        if (seen) play(next);
      });
    });

    // Epígrafe y burbuja según el cuadro que se está viendo.
    var lastCap = "";
    function tick() {
      requestAnimationFrame(tick);
      if (!seen) return;
      var r = list[cur], v = active();
      var f = Math.floor(v.currentTime * FPS) + 1;
      if (cap && r.caps) {
        var txt = "";
        r.caps.forEach(function (c) {
          if (f >= c[0]) txt = ES ? c[2] : c[1];
        });
        if (txt !== lastCap) cap.textContent = lastCap = txt;
      }
      if (bubble) {
        var on = null;
        if (r.bubble) {
          r.bubble.tramos.forEach(function (t) {
            if (f >= t[0] && f < t[1]) on = t;
          });
        }
        if (on) {
          bubble.textContent = on[2];
          bubble.style.setProperty("--bubble", on[3]);
          bubble.style.setProperty("--bubble-ink", on[4]);
          // El video es cuadrado y va centrado con object-fit: contain.
          var W = host.clientWidth, H = host.clientHeight, S = Math.min(W, H);
          bubble.style.left = (W - S) / 2 + r.bubble.x * S + "px";
          bubble.style.top = (H - S) / 2 + r.bubble.y * S + "px";
        }
        bubble.classList.toggle("is-on", !!on);
      }
    }
    requestAnimationFrame(tick);

    // Sólo corre mientras se ve.
    function show(yes) {
      seen = yes;
      if (yes) play(active());
      else active().pause();
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        show(es[es.length - 1].isIntersecting);
      }, { threshold: 0.2 }).observe(host);
    } else {
      show(true);
    }
  }

  Array.prototype.forEach.call(stages, setup);
})();
