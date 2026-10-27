/* Atlas — escenas 3D del tablero (Three.js).
   Cada bloque con [data-atlas3d] arma su escena cuando se acerca a la pantalla:
     juegos → tres juegos en ciclo: el Maze (dos fichas buscan el tesoro), una partida de
              ajedrez y una arena contra un jefe
     mesa   → de 1 a 6 módulos que arman un mapa de rol (botones + y −)
     modulo → un módulo con Atlas Core acoplado: una ficha se apoya, se lee y el tablero responde
     ficha  → la ficha se enrosca en la base, se desenrosca, sale y entra otra de otro color
   Mientras carga, cada bloque muestra un loader de su mismo tamaño con el progreso
   de los modelos; la escena aparece recién cuando tiene todo. Three.js y los modelos
   se descargan una sola vez, apenas termina de cargar la página.
   Todas usan la misma vista isométrica fija. */
(function () {
  "use strict";

  var stages = document.querySelectorAll("[data-atlas3d]");
  if (!stages.length) return;

  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
  var GLTF_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
  var MESHOPT_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js";
  // Huella de cada archivo del CDN: si el contenido cambia, el navegador no lo
  // ejecuta. Al subir de versión de three hay que recalcularlas:
  //   curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A
  var SRI = {};
  SRI[THREE_URL] = "sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu";
  SRI[GLTF_URL] = "sha384-fljlqkjWlmSFjkESkQvm77heIZpoWmXEOzlCA7kOpGUH+95Zk0yGfQieWM2q136E";
  SRI[MESHOPT_URL] = "sha384-Ua4+miEfAhtQpWvzgEohUG5UfbDPgyuYVVT+sgb2QvRC3fjACMsy7LV3Zoxnv2xf";
  var MODEL_URL = "/assets/Models3D/atlas64_modulo.glb";
  var FICHA_URL = "/assets/Models3D/ficha_roja.glb"; // comprimido con meshopt
  var BASE_URL = "/assets/Models3D/base_con_rosca.glb";
  var NFC_URL = "/assets/Models3D/modulo_nfc.glb"; // Atlas Core, mismo origen que el módulo
  var CHESS_URL = "/assets/Models3D/ajedrez.glb"; // piezas Peon, Torre, Caballero, Alfil, Reina y Rey (meshopt)

  // Modelos que necesita cada escena antes de mostrarse.
  var NEEDS = {
    juegos: [MODEL_URL, FICHA_URL, CHESS_URL],
    mesa: [MODEL_URL],
    ficha: [FICHA_URL, BASE_URL],
    modulo: [MODEL_URL, NFC_URL, FICHA_URL, BASE_URL],
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPEED = 1.5; // las escenas corren 1,5 veces más rápido que sus guiones
  // En el celular la cámara se acerca más: la escena ocupa todo el ancho.
  var narrow = window.matchMedia("(max-width: 760px)");
  var MOBILE_ZOOM = 0.84;

  // Textos de las escenas (epígrafes y loader), en el idioma de la página
  var TXT = document.documentElement.lang === "es" ? {
    cargando: "Cargando…", cargandoPct: "Cargando {} %", listo: "Listo",
    maze: ["Maze: dos fichas, un tesoro en el centro.", "El laberinto está escondido: no se ven las paredes.",
      "Cada paso que das se enciende.", "¡Pared! La ficha vuelve al inicio.", "Turno de la otra ficha.",
      "¡Llegó al tesoro y ganó!"],
    ajedrez: ["Ajedrez: Atlas indica las posiciones.", "Atlas te ayuda con tus partidas.",
      "Jugá solo con la IA o contra un amigo."],
    arena: "¡Batallas épicas y mucho más en el universo Atlas!",
    mesa: ["El claro del bosque.", "Aparece el río.", "El sendero llega a la villa.", "Un puente cruza el río.",
      "El bosque sigue.", "El mapa completo."],
  } : {
    cargando: "Loading…", cargandoPct: "Loading {}%", listo: "Ready",
    maze: ["Maze: two pieces, one treasure in the center.", "The labyrinth is hidden: you can't see the walls.",
      "Every step you take lights up.", "Wall! The piece goes back to the start.", "The other piece's turn.",
      "It reached the treasure and won!"],
    ajedrez: ["Chess: Atlas shows you the possible moves.", "Atlas helps you through every game.",
      "Play solo against the AI or against a friend."],
    arena: "Epic battles and much more in the Atlas universe!",
    mesa: ["The forest clearing.", "The river appears.", "The trail reaches the village.", "A bridge crosses the river.",
      "The forest goes on.", "The full map."],
  };

  // Colores de las casillas (definidos por Gonzalo, 2026-10-20) y del modelo.
  var CELL_OFF = 0xa9cbf9;
  var CELL_ON = 0xff4fa3;
  var CELL_WRONG = 0xcd3f21;
  var RECOLOR = {
    conector: [0x111111, 0, 0.55], // carcasa del pogo pin
    metal: [0x8a6a24, 1, 0.4], // contactos, en dorado oscuro
    boton: [0x3b3b3b, 0, 0.5],
  };

  // ---------- Carga ----------

  // Cada descarga se hace una vez y la comparten todas las escenas. Si falla
  // (un corte de red durante la precarga, por ejemplo) se olvida, para que la
  // escena que la pida después lo intente de nuevo en vez de heredar el error.
  var pending = {};
  function once(key, make) {
    if (!pending[key]) {
      var p = (pending[key] = make());
      p.catch(function () {
        if (pending[key] === p) delete pending[key];
      });
    }
    return pending[key];
  }

  function loadScript(src) {
    return once("js " + src, function () {
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        if (SRI[src]) {
          s.integrity = SRI[src];
          s.crossOrigin = "anonymous";
        }
        s.onload = resolve;
        s.onerror = function () {
          s.remove();
          reject(new Error("No se pudo cargar " + src));
        };
        document.head.appendChild(s);
      });
    });
  }

  function lib() {
    return once("lib", function () {
      return loadScript(THREE_URL)
        .then(function () {
          return loadScript(GLTF_URL);
        })
        .then(function () {
          return loadScript(MESHOPT_URL);
        });
    });
  }

  // Bytes descargados de cada modelo: url → [cargado, total].
  var progress = {};
  var listeners = [];
  function report(url, loaded, total) {
    progress[url] = [loaded, total];
    listeners.forEach(function (fn) {
      fn();
    });
  }

  // Carga un .glb en centímetros (los modelos vienen en metros) con sombras.
  // Cada archivo se descarga una vez; quien lo usa en una escena lo clona.
  function glb(url) {
    return once("glb " + url, function () {
      return lib().then(function () {
        return new Promise(function (resolve, reject) {
          var loader = new THREE.GLTFLoader();
          if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
          loader.load(
            url,
            function (g) {
              var root = g.scene;
              root.scale.setScalar(100);
              root.traverse(function (o) {
                if (o.isMesh) {
                  o.castShadow = true;
                  o.receiveShadow = true;
                }
              });
              var p = progress[url];
              var size = (p && (p[1] || p[0])) || 1;
              report(url, size, size);
              resolve(root);
            },
            function (e) {
              report(url, e.loaded, e.lengthComputable ? e.total : 0);
            },
            reject
          );
        });
      });
    });
  }

  function ficha() {
    return glb(FICHA_URL);
  }

  function recolor(root) {
    root.traverse(function (o) {
      var r = o.isMesh && o.material && RECOLOR[o.material.name];
      if (r) {
        o.material.color.setHex(r[0]);
        o.material.metalness = r[1];
        o.material.roughness = r[2];
      }
    });
  }

  function model() {
    return once("model", function () {
      return glb(MODEL_URL).then(function (root) {
        root.rotation.y = Math.PI; // el borde del botón y el USB-C, hacia la cámara
        recolor(root);
        root.updateMatrixWorld(true);
        return root;
      });
    });
  }

  // ---------- Loader ----------

  // Ocupa el lugar exacto de la escena: una grilla de casillas que se encienden,
  // una barra con los bytes descargados y el porcentaje.
  function addLoader(host) {
    var urls = NEEDS[host.getAttribute("data-atlas3d")] || [];
    var el = document.createElement("div");
    el.className = "stage3d__loader";
    el.setAttribute("aria-hidden", "true");
    var cells = "";
    for (var i = 0; i < 16; i++) {
      cells += '<i style="animation-delay:' + (((i % 4) + Math.floor(i / 4)) * 0.12).toFixed(2) + 's"></i>';
    }
    el.innerHTML =
      '<div class="stage3d__loader-grid">' + cells + "</div>" +
      '<div class="stage3d__loader-bar"><span></span></div>' +
      '<p class="stage3d__loader-text">' + TXT.cargando + "</p>";
    host.appendChild(el);
    host.classList.add("is-loading");
    host.setAttribute("aria-busy", "true");
    var bar = el.querySelector("span");
    var text = el.querySelector("p");

    function update() {
      var got = 0, total = 0, known = 0;
      urls.forEach(function (u) {
        var p = progress[u];
        if (p && p[1]) {
          got += p[0];
          total += p[1];
          known++;
        }
      });
      if (!total) return;
      // Si algún archivo todavía no informó su tamaño, cuenta como pendiente.
      var pct = Math.max(0, Math.min(99, Math.floor((got / total) * (known / urls.length) * 100)));
      bar.style.width = pct + "%";
      text.textContent = TXT.cargandoPct.replace("{}", pct);
    }
    listeners.push(update);
    update();

    return function done(ok) {
      listeners.splice(listeners.indexOf(update), 1);
      host.classList.remove("is-loading");
      host.removeAttribute("aria-busy");
      if (!ok) return;
      bar.style.width = "100%";
      text.textContent = TXT.listo;
      // Dos cuadros: el primero dibuja la escena, el segundo la muestra.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          host.classList.add("is-ready");
        });
      });
    };
  }

  // ---------- Utilidades de escena ----------

  var ISO_YAW = Math.PI / 4;
  var ISO_EL = Math.atan(1 / Math.SQRT2);

  function color(hex) {
    return new THREE.Color(hex).convertSRGBToLinear();
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }

  // Una escena con renderer transparente, luces, sombra y cámara isométrica.
  function makeView(host) {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a19, 0.6));
    var key = new THREE.DirectionalLight(0xfff4e0, 0.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 });
    scene.add(key);
    scene.add(key.target);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ opacity: 0.35 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    var view = {
      renderer: renderer,
      scene: scene,
      cam: cam,
      ground: ground,
      aspect: 16 / 10,
      center: new THREE.Vector3(),
      half: 20,
      zoom: 1, // < 1 acerca la cámara sobre el encuadre de fit()
      mobileZoom: MOBILE_ZOOM, // acercamiento extra en el celular
      visible: true,
      frame: null,
    };

    // Encuadre isométrico de un rectángulo de ancho wx (eje x) y fondo dz (eje z).
    view.fit = function (wx, dz, extraTop) {
      var pw = (wx + dz) * Math.SQRT1_2;
      var ph = pw * Math.sin(ISO_EL) + (extraTop || 4);
      return Math.max(ph / 2, pw / 2 / view.aspect) * 1.1;
    };

    function size() {
      var w = host.clientWidth || 600;
      var h = host.clientHeight || Math.round((w * 10) / 16);
      renderer.setSize(w, h, false);
      view.aspect = w / h;
    }
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(host);
    else window.addEventListener("resize", size);

    // visible: algo del lienzo está en pantalla (sólo entonces se dibuja).
    // seen: se ve al menos el 60 %; onHide avisa cuando sale del todo.
    view.seen = !("IntersectionObserver" in window);
    view.onHide = null;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (es) {
          var e = es[es.length - 1];
          view.visible = e.isIntersecting;
          view.seen = e.intersectionRatio >= 0.6;
          if (!e.isIntersecting && view.onHide) view.onHide();
        },
        { threshold: [0, 0.6] }
      ).observe(host);
    }

    var last = null;
    function loop(ts) {
      requestAnimationFrame(loop);
      var dt = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!view.visible) return;
      if (view.frame) view.frame(dt * SPEED);
      var c = view.center,
        D = 400;
      cam.position.set(
        c.x + Math.sin(ISO_YAW) * Math.cos(ISO_EL) * D,
        c.y + Math.sin(ISO_EL) * D,
        c.z + Math.cos(ISO_YAW) * Math.cos(ISO_EL) * D
      );
      cam.lookAt(c);
      var half = view.half * view.zoom * (narrow.matches ? view.mobileZoom : 1);
      cam.left = -half * view.aspect;
      cam.right = half * view.aspect;
      cam.top = half;
      cam.bottom = -half;
      cam.updateProjectionMatrix();
      key.position.set(c.x + 30, 90, c.z + 45);
      key.target.position.copy(c);
      renderer.render(scene, cam);
    }
    requestAnimationFrame(loop);
    return view;
  }

  // Clona el módulo y le da a cada casilla su propio material.
  // Devuelve { root, cells[64], top } con las casillas en orden y*8+x.
  function placeModule(src, scene) {
    var root = src.clone(true);
    var cells = new Array(64);
    root.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
      var m = /^celda_(\d)_(\d)$/.exec(o.name || "");
      if (!m) return;
      var mesh = o.isMesh ? o : null;
      if (!mesh)
        o.traverse(function (c) {
          if (c.isMesh && !mesh) mesh = c;
        });
      if (!mesh) return;
      var mat = mesh.material.clone();
      mat.emissive = new THREE.Color(0);
      mat.emissiveIntensity = 1;
      mesh.material = mat;
      cells[+m[2] * 8 + +m[1]] = { obj: o, mat: mat };
    });
    scene.add(root);
    root.updateMatrixWorld(true);
    var grid = root.getObjectByName("Grilla");
    var top = new THREE.Box3().setFromObject(grid || root).max.y;
    return { root: root, cells: cells, top: top };
  }

  // Halo aditivo sobre una casilla encendida.
  var glowTexture = null;
  function glowMesh(size) {
    if (!glowTexture) {
      var gc = document.createElement("canvas");
      gc.width = gc.height = 64;
      var g = gc.getContext("2d");
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.35, "rgba(255,255,255,.45)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      glowTexture = new THREE.CanvasTexture(gc);
    }
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  // Ficha genérica, por si no carga el modelo real (base de 23 mm, hasta 60 mm de alto).
  function makePiece() {
    var piece = new THREE.Group();
    var base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.2, 0.5, 40),
      new THREE.MeshStandardMaterial({ color: 0x3a3936, roughness: 0.5 })
    );
    base.position.y = 0.25;
    var prof = [[0, 0], [0.85, 0], [0.85, 0.15], [0.62, 0.45], [0.42, 2.3], [0.68, 2.55], [0.55, 2.75], [0, 2.75]].map(
      function (p) {
        return new THREE.Vector2(p[0], p[1]);
      }
    );
    var mini = new THREE.MeshStandardMaterial({ color: 0xe5e5e5, roughness: 0.45 });
    var body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), mini);
    body.position.y = 0.5;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), mini);
    head.position.y = 3.85;
    [base, body, head].forEach(function (m) {
      m.castShadow = true;
      piece.add(m);
    });
    return piece;
  }

  // ---------- Escena: juegos (Maze → ajedrez → arena, en ciclo) ----------

  function sceneJuegos(host) {
    // La ficha roja real; si no carga, queda la genérica.
    var real = ficha().catch(function () {
      return null;
    });
    return Promise.all([model(), real, glb(CHESS_URL)]).then(function (r) {
      buildJuegos(host, r[0], r[1], r[2]);
    });
  }

  function buildJuegos(host, src, fichaSrc, chessSrc) {
    var view = makeView(host);
    var mod = placeModule(src, view.scene);
    var TOP = mod.top;
    var OFF = color(CELL_OFF),
      ON = color(CELL_ON),
      WRONG = color(CELL_WRONG);
    view.ground.position.y = new THREE.Box3().setFromObject(mod.root).min.y - 0.01;
    view.half = view.fit(21.6, 21.6, 14);
    view.zoom = 0.86;
    view.center.set(0, 3, 0);

    var xz = [];
    var v = new THREE.Vector3();
    mod.cells.forEach(function (c, i) {
      c.obj.getWorldPosition(v);
      xz[i] = [v.x, v.z];
      c.glow = glowMesh(4.6);
      c.glow.position.set(v.x, TOP + 0.02, v.z);
      view.scene.add(c.glow);
    });
    function pos(c) {
      return xz[c[1] * 8 + c[0]];
    }

    var cap = host.parentNode.querySelector("[data-atlas3d-cap]");
    var lastCap = "";
    function say(s) {
      if (cap && s !== lastCap) {
        cap.textContent = s;
        lastCap = s;
      }
    }

    // Luz de cada casilla en este cuadro: nivel 0–1 y color.
    var level = new Array(64), tint = new Array(64);
    function lightI(i, col, a) {
      if (a > level[i]) {
        level[i] = a;
        tint[i] = col;
      }
    }
    function light(c, col, a) {
      lightI(c[1] * 8 + c[0], col, a);
    }

    // Color de fondo de las casillas en cada juego; al cambiar de juego se funde.
    var DARK_SQ = OFF.clone().multiplyScalar(0.55);
    var stone = mod.cells.map(function (c, i) {
      return color(0x8e8e8e).multiplyScalar(0.8 + 0.3 * hash(i % 8, i >> 3));
    });
    var BASES = {
      maze: function () {
        return OFF;
      },
      chess: function (i) {
        return ((i % 8) + (i >> 3)) % 2 ? DARK_SQ : OFF;
      },
      arena: function (i) {
        return stone[i];
      },
    };
    var base = mod.cells.map(function () {
      return new THREE.Color();
    });

    // ----- Maze: dos fichas buscan el tesoro del centro; las paredes están escondidas -----

    var TREASURE = [3, 3];
    var GOLD = color(0xf9b606), BLUE_ON = color(0x2f6fdb);
    var maze = new THREE.Group();
    view.scene.add(maze);
    function mazeMan(hex) {
      var g = new THREE.Group();
      g.add(fichaSrc ? tinted(fichaSrc, hex) : makePiece());
      maze.add(g);
      return g;
    }
    // La roja avanza tres pasos y choca con una pared; la azul llega al tesoro.
    var RED = { g: mazeMan(null), path: [[0, 7], [1, 7], [1, 6], [2, 6]], wall: [2, 5], col: ON };
    var BLUE = { g: mazeMan(0x2f6fdb), path: [[7, 0], [6, 0], [6, 1], [5, 1], [5, 2], [4, 2], [4, 3], [3, 3]], col: BLUE_ON };
    var treasureGlow = glowMesh(9);
    var TP = pos(TREASURE);
    treasureGlow.position.set(TP[0], TOP + 0.03, TP[1]);
    treasureGlow.material.color.copy(GOLD);
    maze.add(treasureGlow);

    var STEP_T = 0.4;
    var RED0 = 2.6, HIT = RED0 + (RED.path.length - 1) * STEP_T, BACK0 = HIT + 0.5, BACK1 = BACK0 + 0.9;
    var BLUE0 = BACK1 + 0.5, WIN = BLUE0 + (BLUE.path.length - 1) * STEP_T, PARTY = WIN + 2.4;
    var MAZE_DUR = PARTY + 0.9;

    // Posición sobre el camino a u pasos del inicio: [x, z, salto, paso]
    function walk(path, u) {
      var last = path.length - 1;
      if (u >= last) {
        var e = pos(path[last]);
        return [e[0], e[1], 0, last];
      }
      var j = Math.floor(u), f = u - j, A = pos(path[j]), B = pos(path[j + 1]), k = ease(f);
      return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, Math.sin(f * Math.PI) * 1.6, j];
    }
    // Las casillas pisadas quedan encendidas; la de la ficha, más fuerte.
    function trail(m, j, a) {
      for (var n = 0; n <= j; n++) light(m.path[n], m.col, (n === j ? 0.9 : 0.45) * a);
    }

    function mazeFrame(t) {
      maze.visible = true;
      var fall = (1 - ease(clamp01((t - 0.2) / 0.8))) * 20;
      var rise = ease(clamp01((t - PARTY) / 0.7)) * 20;

      // El tesoro brilla desde el principio
      var shine = clamp01((t - 0.5) / 0.6) * (1 - clamp01((t - PARTY) / 0.7));
      var pulse = 0.8 + 0.2 * Math.sin(t * 4);
      light(TREASURE, GOLD, shine * pulse);
      treasureGlow.material.opacity = shine * (0.45 + 0.25 * Math.sin(t * 4));

      // Roja: avanza, choca con la pared y vuelve al inicio
      var r = walk(RED.path, 0), ry = 0;
      if (t >= RED0 && t < HIT) {
        r = walk(RED.path, (t - RED0) / STEP_T);
        ry = r[2];
        trail(RED, r[3], 1);
      } else if (t >= HIT && t < BACK0) {
        var b = (t - HIT) / (BACK0 - HIT), end = pos(RED.path[RED.path.length - 1]), w = pos(RED.wall);
        var push = Math.sin(b * Math.PI) * 0.45;
        r = [end[0] + (w[0] - end[0]) * push, end[1] + (w[1] - end[1]) * push];
        trail(RED, RED.path.length - 2, 1);
        light(RED.wall, WRONG, 1);
      } else if (t >= BACK0 && t < BACK1) {
        var k = ease((t - BACK0) / (BACK1 - BACK0)), e0 = pos(RED.path[RED.path.length - 1]), s0 = pos(RED.path[0]);
        r = [e0[0] + (s0[0] - e0[0]) * k, e0[1] + (s0[1] - e0[1]) * k];
        ry = Math.sin(k * Math.PI) * 5;
        trail(RED, RED.path.length - 1, 1 - k);
        light(RED.wall, WRONG, 1 - k);
      }
      RED.g.position.set(r[0], TOP + ry + fall + rise, r[1]);

      // Azul: encuentra el camino y llega al tesoro
      var bl = walk(BLUE.path, 0), by = 0;
      if (t >= BLUE0 && t < WIN) {
        bl = walk(BLUE.path, (t - BLUE0) / STEP_T);
        by = bl[2];
        trail(BLUE, bl[3], 1);
      } else if (t >= WIN) {
        bl = walk(BLUE.path, BLUE.path.length);
        var party = t - WIN;
        by = party < 1.5 ? Math.abs(Math.sin(party * 6)) * 1.2 : 0;
        // Festejo: una ola dorada sale del tesoro
        var radius = party * 6;
        mod.cells.forEach(function (c, i) {
          var d = Math.hypot((i % 8) - TREASURE[0], (i >> 3) - TREASURE[1]);
          lightI(i, GOLD, Math.max(0, 1 - Math.abs(d - radius) / 1.2) * 0.8 * (1 - clamp01((t - PARTY) / 0.7)));
        });
        trail(BLUE, BLUE.path.length - 1, 1 - clamp01(party / 2));
      }
      BLUE.g.position.set(bl[0], TOP + by + fall + rise, bl[1]);
      RED.g.visible = BLUE.g.visible = fall + rise < 19;

      // Las reglas, a medida que pasan
      if (t < 1.4) say(TXT.maze[0]);
      else if (t < RED0) say(TXT.maze[1]);
      else if (t < HIT) say(TXT.maze[2]);
      else if (t < BACK1) say(TXT.maze[3]);
      else if (t < WIN) say(TXT.maze[4]);
      else say(TXT.maze[5]);
    }

    // ----- Ajedrez: al levantar una pieza, el tablero muestra a dónde puede ir -----

    var LIGHT_MAT = new THREE.MeshStandardMaterial({ color: color(0xeee8dc), roughness: 0.45 });
    var DARK_MAT = new THREE.MeshStandardMaterial({ color: color(0x2b2b2b), roughness: 0.4 });
    // Se clona el nodo entero: meshopt guarda en él la escala de la malla cuantizada.
    function chessMesh(name, mat, size) {
      var node = chessSrc.getObjectByName(name).clone(true);
      node.traverse(function (o) {
        if (!o.isMesh) return;
        o.material = mat;
        o.castShadow = true;
        o.receiveShadow = true;
      });
      var inner = new THREE.Group();
      inner.scale.setScalar(100 * (size || 1)); // metros → centímetros
      inner.add(node);
      var g = new THREE.Group();
      g.add(inner);
      return g;
    }

    // El caballo del modelo mira hacia −x: cada bando mira hacia el otro.
    var A0 = pos([0, 0]), A7 = pos([0, 7]);
    var toBlack = Math.atan2(A0[0] - A7[0], A0[1] - A7[1]) + Math.PI / 2;
    var BACK = ["Torre", "Caballero", "Alfil", "Reina", "Rey", "Alfil", "Caballero", "Torre"];
    var chess = new THREE.Group();
    view.scene.add(chess);
    var men = [];
    var at = {};
    function addMan(name, x, y, white) {
      var g = chessMesh(name, white ? LIGHT_MAT : DARK_MAT);
      g.rotation.y = white ? toBlack : toBlack + Math.PI;
      chess.add(g);
      var m = { g: g, x: x, y: y, d: hash(x * 5, y * 3) };
      men.push(m);
      at[x + "," + y] = m;
    }
    for (var fx = 0; fx < 8; fx++) {
      addMan(BACK[fx], fx, 0, false);
      addMan("Peon", fx, 1, false);
      addMan("Peon", fx, 6, true);
      addMan(BACK[fx], fx, 7, true);
    }

    // Tres jugadas: 1. e4 e5 2. Cf3
    var MOVES = [
      { from: [4, 6], to: [4, 4], targets: [[4, 5], [4, 4]], say: TXT.ajedrez[0] },
      { from: [4, 1], to: [4, 3], targets: [[4, 2], [4, 3]], say: TXT.ajedrez[1] },
      { from: [6, 7], to: [5, 5], targets: [[5, 5], [7, 5]], say: TXT.ajedrez[2], jump: true },
    ];
    MOVES.forEach(function (mv) {
      mv.man = at[mv.from[0] + "," + mv.from[1]];
    });
    var LIFT = 2.5, M0 = 1.8, MOVE = 2.2;
    var CH_OUT = M0 + MOVES.length * MOVE + 0.5, CH_DUR = CH_OUT + 1;

    function chessFrame(t) {
      chess.visible = true;
      if (t < M0) say("Ajedrez: Atlas indica las posiciones.");
      men.forEach(function (m) {
        var p = pos([m.x, m.y]), px = p[0], pz = p[1], lift = 0;
        MOVES.forEach(function (mv, k) {
          if (mv.man !== m) return;
          var u = t - (M0 + k * MOVE);
          if (u < 0) return;
          var A = pos(mv.from), B = pos(mv.to);
          if (u >= 1.8) {
            px = B[0];
            pz = B[1];
            lift = u < 2.2 ? LIFT * (1 - ease((u - 1.8) / 0.4)) : 0;
          } else if (u >= 1.2) {
            var e = ease((u - 1.2) / 0.6);
            px = A[0] + (B[0] - A[0]) * e;
            pz = A[1] + (B[1] - A[1]) * e;
            lift = LIFT + (mv.jump ? Math.sin(e * Math.PI) * 2.5 : 0);
          } else {
            lift = u < 0.35 ? ease(u / 0.35) * LIFT : LIFT + 0.15 * Math.sin(u * 6);
          }
          if (u < MOVE) {
            say(mv.say);
            if (u < 1.8) light(mv.from, ON, 0.25);
            if (u >= 0.35 && u < 1.8) {
              var show = clamp01((u - 0.35) / 0.2) * (0.75 + 0.25 * Math.sin(u * 8));
              var go = u < 1.2 ? 0 : ease((u - 1.2) / 0.6);
              mv.targets.forEach(function (c) {
                var chosen = c[0] === mv.to[0] && c[1] === mv.to[1];
                light(c, ON, show * (chosen ? 1 : 1 - go));
              });
            } else if (u >= 1.8) {
              light(mv.to, ON, 1 - (u - 1.8) / 0.4);
            }
          }
        });
        // Entran cayendo y se van subiendo, cada una con su demora.
        var drop = 1 - ease(clamp01((t - 0.2 - m.d * 0.7) / 0.5));
        var rise = ease(clamp01((t - CH_OUT - m.d * 0.4) / 0.5));
        var py = TOP + lift + (drop + rise) * 20;
        m.g.position.set(px, py, pz);
        m.g.visible = py < TOP + 19;
      });
    }

    // ----- Arena: el jefe en llamas en el centro y tres fichas que lo atacan -----

    var arena = new THREE.Group();
    view.scene.add(arena);
    var BOSS_MAT = new THREE.MeshStandardMaterial({ color: color(0x1e1e1e), roughness: 0.35 });
    var king = chessMesh("Rey", BOSS_MAT, 1.3);
    arena.add(king);
    var C33 = pos([3, 3]), C44 = pos([4, 4]);
    var cx = (C33[0] + C44[0]) / 2, cz = (C33[1] + C44[1]) / 2;
    var HOME = [[4, 6], [1, 2], [6, 2]];
    var fighters = HOME.map(function (c) {
      var g = new THREE.Group();
      g.add(fichaSrc ? fichaSrc.clone(true) : makePiece());
      arena.add(g);
      var h = pos(c), dx = cx - h[0], dz = cz - h[1], len = Math.hypot(dx, dz);
      g.rotation.y = Math.atan2(dx, dz);
      // Casilla donde pega el golpe: a mitad de camino hacia el jefe
      var hx = h[0] + dx * 0.45, hz = h[1] + dz * 0.45, hit = 0, best = 1e9;
      xz.forEach(function (p, i) {
        var d = Math.hypot(p[0] - hx, p[1] - hz);
        if (d < best) {
          best = d;
          hit = i;
        }
      });
      return { g: g, h: h, dx: dx / len, dz: dz / len, len: len, hit: hit };
    });

    // Fuego: casillas que titilan, una luz naranja y chispas que suben.
    var FIRE_A = color(0xffb020), FIRE_B = color(0xff4a10);
    var fireCol = mod.cells.map(function () {
      return new THREE.Color();
    });
    var fireDist = mod.cells.map(function (c, i) {
      return Math.hypot((i % 8) - 3.5, (i >> 3) - 3.5);
    });
    var fireLight = new THREE.PointLight(0xff7a1a, 0, 22, 2);
    fireLight.position.set(cx, TOP + 1.5, cz);
    arena.add(fireLight);
    var sparks = [];
    for (var s = 0; s < 40; s++) {
      var sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      sp.userData = { a: hash(s, 1) * Math.PI * 2, r: 0.4 + hash(s, 2) * 1.6, life: 0.7 + hash(s, 3) * 0.6, off: hash(s, 4) };
      arena.add(sp);
      sparks.push(sp);
    }
    var AR_FIGHT = 1.9, AR_OUT = 7, AR_DUR = 7.8;

    function arenaFrame(t) {
      arena.visible = true;
      say(TXT.arena);
      var fire = clamp01((t - 0.9) / 0.5) * (1 - clamp01((t - AR_OUT) / 0.5));
      var rise = ease(clamp01((t - AR_OUT) / 0.6));
      var shakeX = 0, shakeZ = 0, flare = 0;

      fighters.forEach(function (f, k) {
        var drop = 1 - ease(clamp01((t - 1.1 - k * 0.15) / 0.5));
        var a = 0, hop = 0;
        var u = t - AR_FIGHT - k * 0.47;
        if (u >= 0 && t < AR_OUT) {
          u = (u % 1.4) / 1.4;
          if (u < 0.25) a = ease(u / 0.25);
          else if (u < 0.55) a = 1 - ease((u - 0.25) / 0.3);
          if (u < 0.55) hop = Math.sin((u / 0.55) * Math.PI) * 1.2;
          var imp = Math.max(0, 1 - Math.abs(u - 0.25) / 0.07);
          shakeX += f.dx * 0.35 * imp;
          shakeZ += f.dz * 0.35 * imp;
          flare = Math.max(flare, imp);
          if (imp > 0) lightI(f.hit, WRONG, 0.4 + 0.6 * imp);
        }
        var reach = f.len * 0.45 * a;
        f.g.position.set(f.h[0] + f.dx * reach, TOP + hop + (drop + rise) * 20, f.h[1] + f.dz * reach);
        f.g.visible = f.g.position.y < TOP + 19;
      });

      var kDrop = 1 - ease(clamp01((t - 0.4) / 0.8));
      king.position.set(cx + shakeX, TOP + (kDrop + rise) * 20, cz + shakeZ);
      king.visible = king.position.y < TOP + 19;

      // Fuego en las casillas del centro y un anillo más tenue alrededor
      var heat = fire * (1 + 0.3 * flare);
      mod.cells.forEach(function (c, i) {
        var d = fireDist[i];
        if (d > 2.4) return;
        var fl = 0.5 + 0.5 * Math.sin(t * 11 + i * 1.7) * Math.sin(t * 7.3 + i * 0.9);
        fireCol[i].copy(FIRE_B).lerp(FIRE_A, fl);
        lightI(i, fireCol[i], heat * (d < 1 ? 0.7 + 0.3 * fl : 0.15 + 0.3 * fl * (2.4 - d)));
      });
      fireLight.intensity = heat * (1.6 + 0.6 * Math.sin(t * 13) * Math.sin(t * 5.1));

      sparks.forEach(function (sp) {
        var d = sp.userData, age = ((t / d.life + d.off) % 1 + 1) % 1, r = d.r * (1 - age * 0.5);
        sp.position.set(cx + Math.cos(d.a) * r, TOP + 0.3 + age * 5, cz + Math.sin(d.a) * r);
        sp.scale.setScalar((1 - age) * 2.2 + 0.4);
        sp.material.color.copy(FIRE_A).lerp(FIRE_B, age);
        sp.material.opacity = fire * (1 - age) * 0.9;
      });
    }

    // ----- Ciclo -----

    var SEGS = [
      { name: "maze", dur: MAZE_DUR, frame: mazeFrame },
      { name: "chess", dur: CH_DUR, frame: chessFrame },
      { name: "arena", dur: AR_DUR, frame: arenaFrame },
    ];
    var TOTAL = SEGS.reduce(function (s, g) {
      return s + g.dur;
    }, 0);
    var T = reduce ? 3.2 : 0;

    view.frame = function (dt) {
      if (!reduce) T = (T + dt) % TOTAL;
      view.half = view.fit(21.6, 21.6, 14); // por si el lienzo cambió de proporción
      var k = 0, t = T;
      while (t >= SEGS[k].dur) t -= SEGS[k++].dur;
      var seg = SEGS[k], prev = SEGS[(k + SEGS.length - 1) % SEGS.length];
      var mix = ease(clamp01(t / 0.6));
      for (var i = 0; i < 64; i++) {
        level[i] = 0;
        tint[i] = ON;
        base[i].copy(BASES[prev.name](i)).lerp(BASES[seg.name](i), mix);
      }
      maze.visible = false;
      chess.visible = false;
      arena.visible = false;
      seg.frame(t);
      mod.cells.forEach(function (c, i) {
        c.mat.emissive.copy(tint[i]).multiplyScalar(level[i] * 0.6);
        c.mat.color.copy(base[i]).lerp(tint[i], Math.min(1, level[i] * 0.9));
        c.glow.material.color.copy(tint[i]);
        c.glow.material.opacity = level[i] * 0.6;
      });
    };
  }

  // ---------- Escena: Armá tu mesa ----------

  // Mapa de rol de ejemplo sobre 3 × 2 módulos (24 × 16 casillas): bosque, río y villa.
  // Los primeros cuatro forman un cuadrado de 2 × 2.
  var MAP_ORDER = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [2, 1]];
  var HOUSES = { "2,9": 1, "7,10": 1, "1,12": 1, "7,12": 1, "6,13": 1, "13,10": 1, "14,12": 1, "2,13": 1 };
  function riverX(y) {
    return 12 + 2 * Math.sin(y * 0.45);
  }
  function tile(gx, gy) {
    var road = gy === 11 || (gx === 4 && gy >= 5 && gy <= 11);
    var water = Math.abs(gx - riverX(gy)) < 1.1;
    if (water && road) return { c: 0x8a6438, e: 0.25 }; // puente
    if (water) return { c: 0x2f86d6, e: 0.5, w: true };
    if (road) return { c: 0xc9a46a, e: 0.3 };
    if (HOUSES[gx + "," + gy]) return { c: (gx + gy) % 2 ? 0xb5523b : 0x8e3b2b, e: 0.3 };
    if (Math.hypot(gx - 3.5, gy - 3.5) < 2.3) return { c: 0x7cc55a, e: 0.35 }; // claro
    var h = hash(gx, gy);
    return { c: h < 0.35 ? 0x1f5f2c : h < 0.75 ? 0x2f7d3a : 0x46a04f, e: 0.3 };
  }
  // Epígrafe para cada cantidad de módulos (de 1 a 6)
  var MESA_CAPS = [""].concat(TXT.mesa);

  function sceneMesa(host) {
    return model().then(function (src) {
      buildMesa(host, src);
    });
  }

  function buildMesa(host, src) {
    var view = makeView(host);
    var S = 24; // módulo de 21,55 cm más una separación que se vea en la vista isométrica
    var wrap = host.closest("[data-mesa]") || host.parentNode;
    var out = wrap.querySelector("[data-mesa-count]");
    var cap = wrap.querySelector("[data-atlas3d-cap]");
    var minus = wrap.querySelector('[data-mesa-step="-1"]');
    var plus = wrap.querySelector('[data-mesa-step="1"]');
    var n = Math.max(1, Math.min(6, parseInt(wrap.getAttribute("data-mesa"), 10) || 4));
    view.zoom = 0.92;
    view.mobileZoom = 0.92; // con 6 módulos el mapa llega justo a los bordes
    var mods = [];
    var t = 0;

    var probe = src.clone(true);
    probe.updateMatrixWorld(true);
    view.ground.position.y = new THREE.Box3().setFromObject(probe).min.y - 0.01;

    function add(i) {
      var mx = MAP_ORDER[i][0], my = MAP_ORDER[i][1];
      var mod = placeModule(src, view.scene);
      mod.root.position.set(mx * S, 0, my * S);
      var lit = [];
      mod.cells.forEach(function (c, idx) {
        var gx = mx * 8 + (idx % 8), gy = my * 8 + Math.floor(idx / 8), d = tile(gx, gy), col = color(d.c);
        c.mat.color.copy(col).multiplyScalar(0.75);
        c.mat.emissive.copy(col);
        c.mat.emissiveIntensity = d.e;
        if (d.w) lit.push({ mat: c.mat, e: d.e, ph: hash(gx * 3, gy * 7) * 6.28 });
      });
      mod.water = lit;
      // Los módulos del arranque caen uno detrás de otro.
      mod.born = t + (t ? 0 : i * 0.18);
      return mod;
    }

    function sync() {
      while (mods.length < n) mods.push(add(mods.length));
      while (mods.length > n) view.scene.remove(mods.pop().root);
      if (out) out.textContent = n;
      if (cap) cap.textContent = MESA_CAPS[n];
      if (minus) minus.disabled = n <= 1;
      if (plus) plus.disabled = n >= 6;
    }
    [minus, plus].forEach(function (b) {
      if (!b) return;
      b.addEventListener("click", function () {
        n = Math.max(1, Math.min(6, n + parseInt(b.getAttribute("data-mesa-step"), 10)));
        sync();
      });
    });
    sync();

    var want = new THREE.Vector3();
    view.frame = function (dt) {
      t += dt;
      var act = MAP_ORDER.slice(0, mods.length);
      var xs = act.map(function (p) { return p[0] * S; });
      var zs = act.map(function (p) { return p[1] * S; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var z0 = Math.min.apply(null, zs), z1 = Math.max.apply(null, zs);
      want.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
      var k = reduce ? 1 : Math.min(1, dt * 3);
      view.center.lerp(want, k);
      view.half += (view.fit(x1 - x0 + S, z1 - z0 + S, 4) - view.half) * k;
      mods.forEach(function (m) {
        m.root.position.y = reduce ? 0 : (1 - ease(Math.max(0, Math.min(1, (t - m.born) / 0.7)))) * 30;
        if (!reduce)
          m.water.forEach(function (w) {
            w.mat.emissiveIntensity = w.e + 0.22 * Math.sin(t * 2.2 + w.ph);
          });
      });
    };
  }

  // ---------- Escena: Atlas Core ----------

  function sceneModulo(host) {
    return Promise.all([model(), glb(NFC_URL), ficha(), glb(BASE_URL)]).then(function (r) {
      buildModulo(host, r[0], r[1], r[2], r[3]);
    });
  }

  function buildModulo(host, src, coreSrc, fichaSrc, baseSrc) {
    var view = makeView(host);
    var mod = placeModule(src, view.scene);
    var OFF = color(CELL_OFF), ON = color(CELL_ON);
    view.ground.position.y = new THREE.Box3().setFromObject(mod.root).min.y - 0.01;
    // Encuadre del módulo más Atlas Core, que sobresale 5,4 cm del borde del USB-C.
    view.center.set(0, 0, 2.7);
    view.half = view.fit(21.6, 27, 6);
    view.zoom = 0.9;
    view.mobileZoom = 1; // el tablero entero ya llena el ancho
    var front = 10.8;
    var dist = mod.cells.map(function (c) {
      var p = new THREE.Vector3();
      c.obj.getWorldPosition(p);
      return (front - p.z) / 2.65; // en casillas, desde el borde de Atlas Core
    });

    var ring = glowMesh(7);
    var PINK = color(CELL_ON);
    // La ola que recorre el tablero toma el color de la ficha leída
    var WAVE = FICHA_NAMES.map(function (f) {
      return color(parseInt(f[1].slice(1), 16));
    });
    ring.position.set(0, 0.3, 13.4);
    view.scene.add(ring);

    var core = coreSrc.clone(true);
    core.rotation.y = Math.PI; // igual que el módulo
    recolor(core);
    view.scene.add(core);
    var lamina = core.getObjectByName("Lamina");
    if (lamina && lamina.isMesh) {
      lamina.material = lamina.material.clone();
      lamina.material.color.setHex(0xf4f4f4).convertSRGBToLinear();
      lamina.material.transparent = false;
      lamina.material.opacity = 1;
      lamina.material.depthWrite = true;
      lamina.material.metalness = 0;
      lamina.material.roughness = 0.6;
      lamina.material.emissive = new THREE.Color(0);
    }
    var WHITE = lamina && lamina.material.color.clone();
    var lt = lamina ? new THREE.Box3().setFromObject(lamina).max.y : 0.24;
    var piece = new THREE.Group();
    piece.add(baseSrc.clone(true));
    var variants = FICHA_COLORS.map(function (hex) {
      var f = tinted(fichaSrc, hex);
      f.position.y = SEAT;
      piece.add(f);
      return f;
    });
    piece.position.set(0, lt, 13.4);
    view.scene.add(piece);

    // Burbuja con el nombre de la ficha leída: la dice el tablero, desde el centro
    var bubble = document.createElement("div");
    bubble.className = "stage3d__bubble";
    bubble.setAttribute("aria-hidden", "true");
    host.appendChild(bubble);
    var tip = new THREE.Vector3();
    var shown = -1;

    // Guion: Atlas Core espera separado del tablero, se acerca y se conecta al borde
    // una sola vez (el borde del tablero lo confirma). Después se repite: baja una
    // ficha, Atlas Core la lee, el tablero dice cuál es y responde, y la ficha se va
    // para que entre la del color siguiente.
    // La conexión arranca recién cuando la escena se ve (y terminó de aparecer la
    // sección); si la escena sale de la pantalla, al volver se conecta otra vez.
    // Con SPEED 1,5: la conexión (HOLD + SLIDE + LINK = 3,75) dura 2,5 s.
    var HOLD = 0.45, SLIDE = 2.1, LINK = 1.2, T = 7, AWAY = 11, WAIT = 1.2;
    var IN = HOLD + SLIDE, START = IN + LINK;
    var t = reduce ? START + 2.2 : 0;
    var armed = !reduce, wait = 0;
    view.onHide = function () {
      if (reduce) return;
      armed = true;
      wait = 0;
      t = 0;
    };
    view.frame = function (dt) {
      if (armed) {
        wait = view.seen ? wait + dt : 0;
        if (wait >= WAIT) armed = false;
      } else if (!reduce) t += dt;
      view.half = view.fit(21.6, 27, 6); // por si el lienzo cambió de proporción
      var k = t < START ? -1 : (t - START) % T;
      var n = t < START ? 0 : Math.floor((t - START) / T) % variants.length;
      variants.forEach(function (f, i) {
        f.visible = i === n;
      });
      core.position.z = (t < HOLD ? 1 : t < IN ? 1 - ease((t - HOLD) / SLIDE) : 0) * AWAY;
      var link = t >= IN && t < START ? Math.sin(((t - IN) / LINK) * Math.PI) : 0;
      var drop = 1, scan = 0, wave = -9;
      if (k >= 0) {
        if (k < 1.2) drop = 1 - ease(k / 1.2);
        else if (k > 5.6) drop = ease((k - 5.6) / 1.4);
        else drop = 0;
        if (k > 1.2 && k < 2.6) scan = Math.sin(((k - 1.2) / 1.4) * Math.PI);
        if (k > 2) wave = (k - 2) * 4.5 - 1;
      }
      piece.position.y = lt + drop * 30;
      piece.visible = drop < 0.99;
      // Sobre la lámina blanca el rosa se ve tiñéndola, no sumándole brillo
      var glow = Math.max(scan, link * 0.8);
      if (WHITE) {
        lamina.material.color.copy(WHITE).lerp(PINK, glow);
        lamina.material.emissive.copy(PINK).multiplyScalar(glow * 0.5);
      }
      ring.material.opacity = scan * 0.8;
      ring.material.color.copy(PINK);
      ring.scale.setScalar(0.6 + 0.6 * (k > 1.2 && k < 2.6 ? (k - 1.2) / 1.4 : 0));
      if (n !== shown) {
        shown = n;
        bubble.textContent = FICHA_NAMES[n][0];
        bubble.style.setProperty("--bubble", FICHA_NAMES[n][1]);
        bubble.style.setProperty("--bubble-ink", FICHA_NAMES[n][2]);
      }
      bubble.classList.toggle("is-on", k > 1.5 && k < 4.8);
      tip.set(0, mod.top + 0.5, -1).project(view.cam);
      bubble.style.left = ((tip.x + 1) / 2) * 100 + "%";
      bubble.style.top = ((1 - tip.y) / 2) * 100 + "%";
      mod.cells.forEach(function (c, i) {
        var aWave = Math.max(0, 1 - Math.abs(dist[i] - wave) / 1.8) * 0.8;
        // Al conectarse se enciende, en rosa, la fila del borde de Atlas Core
        var aLink = link * 0.8 * clamp01(1.6 - dist[i]);
        var a = Math.max(aWave, aLink);
        var isWave = aWave >= aLink;
        var tone = isWave ? WAVE[n] : ON;
        c.mat.color.copy(OFF).lerp(tone, a * 0.9);
        // Con menos brillo la ola conserva el color de la ficha (el azul sobre
        // las casillas celestes, sobre todo)
        c.mat.emissive.copy(tone).multiplyScalar(a * (isWave ? 0.3 : 0.6));
      });
    };
  }

  // ---------- Escena: la ficha ----------

  // Altura de la ficha enroscada: su anillo con rosca entra 0,45 cm en la base.
  var SEAT = 0.12;
  var THREAD = 0.45;
  var FICHA_COLORS = [null, 0x2f6fdb, 0xf2c230, 0x2e9e5b]; // null = la roja original
  // Lo que dice la burbuja de Atlas Core para cada color: texto, fondo y letra
  var FICHA_NAMES = [
    ["Red Piece!", "#d63a2b", "#fff"],
    ["Blue Piece!", "#2f6fdb", "#fff"],
    ["Yellow Piece!", "#f2c230", "#1d1d1d"],
    ["Green Piece!", "#2e9e5b", "#fff"],
  ];

  function tinted(src, hex) {
    var f = src.clone(true);
    if (hex == null) return f;
    f.traverse(function (o) {
      if (o.isMesh && o.name === "Ficha_cuerpo") {
        o.material = o.material.clone();
        o.material.color.setHex(hex).convertSRGBToLinear();
      }
    });
    return f;
  }

  function sceneFicha(host) {
    return Promise.all([ficha(), glb(BASE_URL)]).then(function (r) {
      var view = makeView(host);
      view.scene.add(r[1].clone(true));
      var fichas = FICHA_COLORS.map(function (hex) {
        var f = tinted(r[0], hex);
        f.visible = false;
        f.traverse(function (o) {
          o.castShadow = false; // sólo la base proyecta sombra
        });
        view.scene.add(f);
        return f;
      });
      view.ground.position.y = -0.01;
      view.center.set(0, 1.6, 0);
      view.half = 3.2;
      view.zoom = 0.82;

      var steps = host.parentNode.querySelectorAll(".mini-steps [data-ficha-paso]");
      var lastStep = -1;
      function step(n) {
        if (n === lastStep) return;
        lastStep = n;
        Array.prototype.forEach.call(steps, function (li, i) {
          li.classList.toggle("is-active", i === n);
        });
      }

      // Guion de 8 s por ficha: entra, se enrosca, queda, se desenrosca y sale.
      var T = 8, TURNS = 2.5, HIGH = 10;
      var t = reduce ? 3.5 : 0;
      view.frame = function (dt) {
        if (!reduce) t += dt;
        var n = Math.floor(t / T) % fichas.length, k = t % T;
        var y, turn = 0; // turn: 0 = enroscada, 1 = suelta
        if (k < 1.3) { y = SEAT + THREAD + (1 - ease(k / 1.3)) * HIGH; turn = 1; }
        else if (k < 3) { turn = 1 - ease((k - 1.3) / 1.7); y = SEAT + THREAD * turn; }
        else if (k < 4.4) { y = SEAT; }
        else if (k < 6.1) { turn = ease((k - 4.4) / 1.7); y = SEAT + THREAD * turn; }
        else { y = SEAT + THREAD + ease((k - 6.1) / 1.3) * HIGH; turn = 1; }
        fichas.forEach(function (f, i) {
          f.visible = i === n;
        });
        var f = fichas[n];
        f.position.y = y;
        f.rotation.y = turn * TURNS * Math.PI * 2; // rosca derecha: gira en sentido horario al bajar
        step(k < 4.4 ? 0 : 1);
      };
    });
  }

  // ---------- Arranque ----------

  var SCENES = { juegos: sceneJuegos, mesa: sceneMesa, modulo: sceneModulo, ficha: sceneFicha };

  var loaders = Array.prototype.map.call(stages, function (host) {
    return SCENES[host.getAttribute("data-atlas3d")] ? addLoader(host) : null;
  });

  function start(host) {
    var make = SCENES[host.getAttribute("data-atlas3d")];
    if (!make) return;
    var done = loaders[Array.prototype.indexOf.call(stages, host)];
    make(host)
      .then(function () {
        done(true);
      })
      .catch(function (e) {
        // Sin WebGL o sin red: queda la imagen de respaldo que trae el HTML.
        done(false);
        host.classList.add("is-fallback");
        if (window.console) console.warn("Atlas 3D:", e);
      });
  }

  // Las escenas explican el producto: los modelos se descargan apenas termina
  // la página, sin esperar a que el visitante llegue a cada sección.
  function preload() {
    var urls = {};
    Array.prototype.forEach.call(stages, function (host) {
      (NEEDS[host.getAttribute("data-atlas3d")] || []).forEach(function (u) {
        urls[u] = true;
      });
    });
    Object.keys(urls).forEach(function (u) {
      (u === MODEL_URL ? model() : glb(u)).catch(function () {});
    });
  }
  if (document.readyState === "complete") preload();
  else window.addEventListener("load", preload);

  if (!("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(stages, start);
    return;
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          start(e.target);
        }
      });
    },
    { rootMargin: "600px 0px" }
  );
  Array.prototype.forEach.call(stages, function (s) {
    io.observe(s);
  });
})();
