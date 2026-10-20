/* Atlas — escenas 3D del tablero (Three.js).
   Cada bloque con [data-atlas3d] arma su escena cuando se acerca a la pantalla:
     maze   → la ficha recorre el Maze y enciende las casillas
     mesa   → de 1 a 6 módulos que arman un mapa de rol (botones + y −)
     modulo → un módulo con Atlas Core acoplado: una ficha se apoya, se lee y el tablero responde
     ficha  → la ficha se enrosca en la base, se desenrosca, sale y entra otra de otro color
   Three.js y el modelo se descargan una sola vez y sólo si hay una escena a la vista.
   Todas usan la misma vista isométrica fija. */
(function () {
  "use strict";

  var stages = document.querySelectorAll("[data-atlas3d]");
  if (!stages.length) return;

  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
  var GLTF_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
  var MESHOPT_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js";
  var MODEL_URL = "/assets/3d/atlas64_modulo.glb";
  var FICHA_URL = "/assets/3d/ficha_roja.glb"; // comprimido con meshopt
  var BASE_URL = "/assets/3d/base_con_rosca.glb";
  var NFC_URL = "/assets/Models3D/modulo_nfc.glb"; // Atlas Core, mismo origen que el módulo

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Colores de las casillas (definidos por Gonzalo, 2026-10-20) y del modelo.
  var CELL_OFF = 0xa9cbf9;
  var CELL_ON = 0xff4fa3;
  var CELL_WRONG = 0xcd3f21;
  var RECOLOR = {
    conector: [0x111111, 0, 0.55], // carcasa del pogo pin
    metal: [0x8a6a24, 1, 0.4], // contactos, en dorado oscuro
    boton: [0x3b3b3b, 0, 0.5],
  };

  // ---------- Carga perezosa ----------

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("No se pudo cargar " + src));
      };
      document.head.appendChild(s);
    });
  }

  var libPromise = null;
  function lib() {
    return (
      libPromise ||
      (libPromise = loadScript(THREE_URL)
        .then(function () {
          return loadScript(GLTF_URL);
        })
        .then(function () {
          return loadScript(MESHOPT_URL);
        }))
    );
  }

  // Carga un .glb en centímetros (los modelos vienen en metros) con sombras.
  function loadGLB(url) {
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
            resolve(root);
          },
          undefined,
          reject
        );
      });
    });
  }

  var fichaPromise = null;
  function ficha() {
    return fichaPromise || (fichaPromise = loadGLB(FICHA_URL));
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

  var modelPromise = null;
  function model() {
    return (
      modelPromise ||
      (modelPromise = lib().then(function () {
        return new Promise(function (resolve, reject) {
          new THREE.GLTFLoader().load(
            MODEL_URL,
            function (g) {
              var root = g.scene;
              root.scale.setScalar(100); // metros → centímetros
              root.rotation.y = Math.PI; // el borde del botón y el USB-C, hacia la cámara
              recolor(root);
              root.updateMatrixWorld(true);
              resolve(root);
            },
            undefined,
            reject
          );
        });
      }))
    );
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
    host.classList.add("is-ready");

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

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        view.visible = es[0].isIntersecting;
      }).observe(host);
    }

    var last = null;
    function loop(ts) {
      requestAnimationFrame(loop);
      var dt = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!view.visible) return;
      if (view.frame) view.frame(dt);
      var c = view.center,
        D = 400;
      cam.position.set(
        c.x + Math.sin(ISO_YAW) * Math.cos(ISO_EL) * D,
        c.y + Math.sin(ISO_EL) * D,
        c.z + Math.cos(ISO_YAW) * Math.cos(ISO_EL) * D
      );
      cam.lookAt(c);
      cam.left = -view.half * view.aspect;
      cam.right = view.half * view.aspect;
      cam.top = view.half;
      cam.bottom = -view.half;
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

  // Ficha genérica, hasta que esté el modelo real (base de 23 mm, hasta 60 mm de alto).
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

  // ---------- Escena: Maze ----------

  function sceneMaze(host, src) {
    var view = makeView(host);
    var mod = placeModule(src, view.scene);
    var TOP = mod.top;
    var OFF = color(CELL_OFF),
      ON = color(CELL_ON),
      WRONG = color(CELL_WRONG);
    view.ground.position.y = new THREE.Box3().setFromObject(mod.root).min.y - 0.01;
    view.half = view.fit(21.6, 21.6, 14);
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

    // La ficha roja real; si no carga, queda la genérica.
    var piece = new THREE.Group();
    view.scene.add(piece);
    ficha()
      .then(function (f) {
        piece.add(f.clone(true));
      })
      .catch(function () {
        piece.add(makePiece());
      });

    var cap = host.parentNode.querySelector("[data-atlas3d-cap]");
    var lastCap = "";
    function say(s) {
      if (cap && s !== lastCap) {
        cap.textContent = s;
        lastCap = s;
      }
    }

    // Guion: el camino se muestra, se apaga y la ficha lo recorre de memoria.
    var P = [[0, 7], [0, 6], [1, 6], [2, 6], [2, 5], [2, 4], [3, 4], [4, 4], [4, 3], [5, 3], [6, 3], [6, 2], [6, 1], [7, 1]];
    var W = [2, 3];
    var L = P.slice(0, 6).concat([W, P[5]], P.slice(6));
    var T0 = 1, STEP = 0.18, FADE0 = 4.3, FADE1 = 4.9, DROP0 = 5, DROP1 = 5.8, MV = 0.45;
    var MV_END = DROP1 + (L.length - 1) * MV, CEL0 = MV_END + 0.1, CEL1 = CEL0 + 2.2, UP1 = CEL1 + 0.8, DUR = UP1 + 0.4;
    var level = new Array(64), tint = new Array(64);

    function light(c, col, a) {
      var i = c[1] * 8 + c[0];
      if (a > level[i]) {
        level[i] = a;
        tint[i] = col;
      }
    }
    function pos(c) {
      return xz[c[1] * 8 + c[0]];
    }

    var t = reduce ? 3.2 : 0,
      run = !reduce;
    var btn = host.parentNode.querySelector("[data-atlas3d-toggle]");
    if (btn) {
      btn.textContent = run ? "Pausar" : "Reproducir";
      btn.addEventListener("click", function () {
        run = !run;
        btn.textContent = run ? "Pausar" : "Reproducir";
      });
    }

    view.frame = function (dt) {
      if (run) t = (t + dt) % DUR;
      for (var i = 0; i < 64; i++) {
        level[i] = 0;
        tint[i] = ON;
      }
      var px, pz, py = TOP;
      if (t < T0) say("Encontrá la salida recordando el camino.");
      if (t >= T0 && t < FADE1) {
        var fade = t < FADE0 ? 1 : 1 - (t - FADE0) / (FADE1 - FADE0);
        P.forEach(function (c, k) {
          var s = T0 + k * STEP;
          if (t >= s) light(c, ON, Math.min(1, (t - s) / 0.15) * fade * 0.9);
        });
        say(t < FADE0 ? "El tablero te muestra el camino…" : "…y lo apaga. Ahora, de memoria.");
      }
      if (t < DROP0) {
        px = pos(P[0])[0];
        pz = pos(P[0])[1];
        py = TOP + 40;
      } else if (t < DROP1) {
        px = pos(P[0])[0];
        pz = pos(P[0])[1];
        py = TOP + (1 - ease((t - DROP0) / (DROP1 - DROP0))) * 9;
      } else if (t < MV_END) {
        var u = (t - DROP1) / MV, j = Math.floor(u), f = u - j, a = L[j], b = L[j + 1], k2 = ease(f);
        var A = pos(a), B = pos(b);
        px = A[0] + (B[0] - A[0]) * k2;
        pz = A[1] + (B[1] - A[1]) * k2;
        py = TOP + Math.sin(f * Math.PI) * 1.6;
        for (var n = 0; n <= j; n++) if (L[n] !== W) light(L[n], ON, 0.22);
        var here = f < 0.5 ? a : b, land = Math.max(0, 1 - Math.min(f, 1 - f) * 4);
        var wrong = (j === 5 && f > 0.5) || j === 6;
        if (wrong) {
          light(W, WRONG, 0.95);
          say("Paso equivocado: la casilla se pone roja.");
        } else {
          say("Cada paso correcto se enciende.");
        }
        if (here !== W) light(here, ON, 0.4 + 0.6 * land);
      } else {
        px = pos(P[P.length - 1])[0];
        pz = pos(P[P.length - 1])[1];
        if (t < CEL1) {
          var kk = (t - CEL0) * 9;
          P.forEach(function (c, idx) {
            light(c, ON, Math.max(0.3, 1 - Math.abs(idx - kk) / 2.5));
          });
          say("¡Salida!");
        } else {
          var up = Math.min(1, (t - CEL1) / (UP1 - CEL1));
          py = TOP + ease(up) * 9;
          P.forEach(function (c) {
            light(c, ON, 0.3 * (1 - up));
          });
        }
      }
      piece.position.set(px, py, pz);
      piece.visible = py < TOP + 30;
      mod.cells.forEach(function (c, i) {
        c.mat.emissive.copy(tint[i]).multiplyScalar(level[i] * 0.6);
        c.mat.color.copy(OFF).lerp(tint[i], Math.min(1, level[i] * 0.9));
        c.glow.material.color.copy(tint[i]);
        c.glow.material.opacity = level[i] * 0.6;
      });
    };
  }

  // ---------- Escena: Armá tu mesa ----------

  // Mapa de rol de ejemplo sobre 3 × 2 módulos (24 × 16 casillas): bosque, río y villa.
  var MAP_ORDER = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
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
  var MESA_CAPS = {
    1: "El claro del bosque.",
    2: "Aparece el río.",
    3: "El bosque sigue.",
    4: "El sendero llega a la villa.",
    5: "Un puente cruza el río.",
    6: "El mapa completo.",
  };

  function sceneMesa(host, src) {
    var view = makeView(host);
    var S = 24; // módulo de 21,55 cm más una separación que se vea en la vista isométrica
    var wrap = host.closest("[data-mesa]") || host.parentNode;
    var out = wrap.querySelector("[data-mesa-count]");
    var cap = wrap.querySelector("[data-atlas3d-cap]");
    var minus = wrap.querySelector('[data-mesa-step="-1"]');
    var plus = wrap.querySelector('[data-mesa-step="1"]');
    var n = Math.max(1, Math.min(6, parseInt(wrap.getAttribute("data-mesa"), 10) || 2));
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
      mod.born = t;
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
        m.root.position.y = reduce ? 0 : (1 - ease(Math.min(1, (t - m.born) / 0.7))) * 30;
        if (!reduce)
          m.water.forEach(function (w) {
            w.mat.emissiveIntensity = w.e + 0.22 * Math.sin(t * 2.2 + w.ph);
          });
      });
    };
  }

  // ---------- Escena: el módulo ----------

  function sceneModulo(host, src) {
    var view = makeView(host);
    var mod = placeModule(src, view.scene);
    var OFF = color(CELL_OFF), ON = color(CELL_ON);
    view.ground.position.y = new THREE.Box3().setFromObject(mod.root).min.y - 0.01;
    // Encuadre del módulo más Atlas Core, que sobresale 5,4 cm del borde del USB-C.
    view.center.set(0, 0, 2.7);
    view.half = view.fit(21.6, 27, 6);
    var front = 10.8;
    var dist = mod.cells.map(function (c) {
      var p = new THREE.Vector3();
      c.obj.getWorldPosition(p);
      return (front - p.z) / 2.65; // en casillas, desde el borde de Atlas Core
    });

    var core = null, lamina = null, piece = null, ring = glowMesh(7);
    var PINK = color(CELL_ON);
    ring.position.set(0, 0.3, 13.4);
    view.scene.add(ring);
    Promise.all([loadGLB(NFC_URL), ficha(), loadGLB(BASE_URL)])
      .then(function (r) {
        core = r[0];
        core.rotation.y = Math.PI; // igual que el módulo
        recolor(core);
        view.scene.add(core);
        lamina = core.getObjectByName("Lamina");
        if (lamina && lamina.isMesh) {
          lamina.material = lamina.material.clone();
          lamina.material.emissive = new THREE.Color(0);
        }
        var lt = lamina ? new THREE.Box3().setFromObject(lamina).max.y : 0.24;
        piece = new THREE.Group();
        var f = r[1].clone(true);
        f.position.y = SEAT;
        piece.add(r[2].clone(true));
        piece.add(f);
        piece.position.set(0, lt, 13.4);
        piece.userData.rest = lt;
        view.scene.add(piece);
      })
      .catch(function (e) {
        if (window.console) console.warn("Atlas 3D (Atlas Core):", e);
      });

    // Guion de 7 s: baja la ficha, Atlas Core la lee, el tablero responde y la ficha se va.
    var T = 7;
    var t = reduce ? 2.2 : 0;
    view.frame = function (dt) {
      if (!reduce) t += dt;
      var k = t % T;
      var drop = 0, scan = 0, wave = -9;
      if (k < 1.2) drop = 1 - ease(k / 1.2);
      else if (k > 5.6) drop = ease((k - 5.6) / 1.4);
      if (k > 1.2 && k < 2.6) scan = Math.sin(((k - 1.2) / 1.4) * Math.PI);
      if (k > 2) wave = (k - 2) * 4.5 - 1;
      if (piece) {
        piece.position.y = piece.userData.rest + drop * 30;
        piece.visible = drop < 0.99;
      }
      if (lamina && lamina.material.emissive) lamina.material.emissive.copy(PINK).multiplyScalar(scan * 0.9);
      ring.material.opacity = scan * 0.8;
      ring.material.color.copy(PINK);
      ring.scale.setScalar(0.6 + 0.6 * (k > 1.2 && k < 2.6 ? (k - 1.2) / 1.4 : 0));
      mod.cells.forEach(function (c, i) {
        var a = Math.max(0, 1 - Math.abs(dist[i] - wave) / 1.8) * 0.8;
        c.mat.color.copy(OFF).lerp(ON, a * 0.9);
        c.mat.emissive.copy(ON).multiplyScalar(a * 0.6);
      });
    };
  }

  // ---------- Escena: la ficha ----------

  // Altura de la ficha enroscada: su anillo con rosca entra 0,45 cm en la base.
  var SEAT = 0.12;
  var THREAD = 0.45;
  var FICHA_COLORS = [null, 0x2f6fdb, 0xf2c230, 0x2e9e5b]; // null = la roja original

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
    return Promise.all([ficha(), loadGLB(BASE_URL)]).then(function (r) {
      var view = makeView(host);
      var base = r[1];
      view.scene.add(base);
      var fichas = FICHA_COLORS.map(function (hex) {
        var f = tinted(r[0], hex);
        f.visible = false;
        view.scene.add(f);
        return f;
      });
      view.ground.position.y = -0.01;
      view.center.set(0, 1.6, 0);
      view.half = 3.2;

      var steps = host.parentNode.querySelectorAll(".mini-steps li");
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

  var SCENES = { maze: sceneMaze, mesa: sceneMesa, modulo: sceneModulo };

  function fallback(host, e) {
    // Sin WebGL o sin red: queda la imagen de respaldo que trae el HTML.
    host.classList.add("is-fallback");
    if (window.console) console.warn("Atlas 3D:", e);
  }

  function start(host) {
    var kind = host.getAttribute("data-atlas3d");
    if (kind === "ficha") {
      sceneFicha(host).catch(function (e) {
        fallback(host, e);
      });
      return;
    }
    var make = SCENES[kind];
    if (!make) return;
    model()
      .then(function (src) {
        make(host, src);
      })
      .catch(function (e) {
        fallback(host, e);
      });
  }

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
    { rootMargin: "400px 0px" }
  );
  Array.prototype.forEach.call(stages, function (s) {
    io.observe(s);
  });
})();
