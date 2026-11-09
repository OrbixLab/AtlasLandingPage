/* La página del link de un modelo 3D (/models/?id=<modelo>, /es/modelos/?id=<modelo>).
 *
 * La app da este link para bajar en la computadora un modelo que la cuenta tiene. El link es el
 * mismo para todos y no vence: lo que da acceso es la cuenta. La página inicia sesión contra la API
 * (la misma cuenta de la app), le pide a GET /v1/model-downloads/<id> una URL firmada de 5 minutos
 * y recién ahí baja el archivo. Sin el modelo en la biblioteca, la API responde 403.
 *
 * La sesión se guarda como en la app: un refresh token en localStorage, que se cambia por uno nuevo
 * cada vez que se usa. Con la sesión vencida o sin almacenamiento, se vuelve a pedir la contraseña.
 *
 * Los textos salen en el idioma de <html lang>. Los mensajes de la API vienen en inglés; acá no se
 * muestran: se decide por el status HTTP.
 */
(function () {
  "use strict";

  var gate = document.querySelector("[data-model-gate]");
  if (!gate) return;

  var LANG = document.documentElement.lang === "es" ? "es" : "en";
  var T = {
    en: {
      loading: "Loading…",
      noId: "This link is incomplete: it doesn't say which model to download. Copy it again from the app.",
      signIn: "Sign in with the account that has this model.",
      signingIn: "Signing in…",
      badLogin: "Wrong email or password.",
      checking: "Checking your library…",
      ready: "This model is in your library.",
      preparing: "Preparing the download…",
      started: "The download should start now. If it doesn't, press the button again.",
      notYours: "This model isn't in this account's library. Get it in the Atlas 64 app with this account, or sign in with the one that has it.",
      revoked: "This model isn't available for this account anymore.",
      removed: "This model was removed and can't be downloaded anymore.",
      missing: "This model doesn't exist. Check that you copied the whole link.",
      noApp: "This account can't download models.",
      network: "We couldn't reach Atlas. Check your connection and try again.",
      account: "Signed in as {name}.",
      model: "3D model"
    },
    es: {
      loading: "Cargando…",
      noId: "Este link está incompleto: no dice qué modelo bajar. Copialo de nuevo desde la app.",
      signIn: "Iniciá sesión con la cuenta que tiene este modelo.",
      signingIn: "Iniciando sesión…",
      badLogin: "Email o contraseña incorrectos.",
      checking: "Revisando tu biblioteca…",
      ready: "Este modelo está en tu biblioteca.",
      preparing: "Preparando la descarga…",
      started: "La descarga debería empezar ahora. Si no arranca, tocá el botón de nuevo.",
      notYours: "Este modelo no está en la biblioteca de esta cuenta. Obtenelo en la app Atlas 64 con esta cuenta, o iniciá sesión con la que lo tiene.",
      revoked: "Este modelo ya no está disponible para esta cuenta.",
      removed: "Este modelo se retiró y ya no se puede bajar.",
      missing: "Este modelo no existe. Fijate de haber copiado el link entero.",
      noApp: "Esta cuenta no puede bajar modelos.",
      network: "No pudimos conectarnos con Atlas. Revisá tu conexión e intentá de nuevo.",
      account: "Sesión iniciada como {name}.",
      model: "Modelo 3D"
    }
  }[LANG];

  // En la computadora de quien desarrolla, ?api=http://localhost:3030 prueba contra el backend local.
  var params = new URLSearchParams(location.search);
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var API = (local && params.get("api")) || "https://api.atlas-64.com";
  var MODEL_ID = params.get("id") || "";
  var STORE_KEY = "atlas.models.refreshToken";

  var el = function (name) { return gate.querySelector("[data-model-" + name + "]"); };
  var statusEl = el("status");
  var form = el("login");
  var ready = el("ready");
  var downloadBtn = el("download");
  var accessToken = "";

  function status(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle("model-gate__status--error", !!isError);
  }

  function show(which) {
    form.hidden = which !== "login";
    ready.hidden = which !== "ready";
  }

  function stored() {
    try { return localStorage.getItem(STORE_KEY) || ""; } catch (e) { return ""; }
  }

  function store(token) {
    try {
      if (token) localStorage.setItem(STORE_KEY, token);
      else localStorage.removeItem(STORE_KEY);
    } catch (e) { /* sin almacenamiento: la sesión dura lo que la página */ }
  }

  function api(method, path, body, token) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(API + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    });
  }

  function textOf(model, field) {
    var texts = (model && model.texts) || {};
    var langs = [LANG, model && model.defaultLanguage].concat(Object.keys(texts));
    for (var i = 0; i < langs.length; i++) {
      var entry = texts[langs[i]];
      if (entry && entry[field]) return entry[field];
    }
    return "";
  }

  function mm(value) {
    return String(Math.round(Number(value) * 100) / 100);
  }

  // La ficha pública: sólo para mostrar qué se va a bajar. Si el modelo ya no está en la tienda
  // (404), igual se puede bajar: lo que decide es la biblioteca.
  function loadModel() {
    return api("GET", "/v1/models/" + encodeURIComponent(MODEL_ID)).then(function (res) {
      if (!res.ok || !res.data) return;
      var m = res.data;
      var title = textOf(m, "title") || MODEL_ID;
      el("name").textContent = title;
      var meta = [T.model + " · .STL"];
      if (m.widthMm != null) meta.push(mm(m.widthMm) + " × " + mm(m.depthMm) + " × " + mm(m.heightMm) + " mm");
      el("meta").textContent = meta.join(" · ");
      if (m.coverUrl) {
        var cover = el("cover");
        cover.src = API + m.coverUrl;
        cover.hidden = false;
      }
      el("info").hidden = false;
      document.title = title + " | Atlas 64";
    }).catch(function () { /* la ficha es opcional */ });
  }

  function onSession(res) {
    if (!res.ok || !res.data || !res.data.accessToken) return false;
    accessToken = res.data.accessToken;
    if (res.data.refreshToken) store(res.data.refreshToken);
    var user = res.data.user || {};
    el("account").textContent = T.account.replace("{name}", user.username || user.email || "");
    return true;
  }

  function askLogin(message, isError) {
    accessToken = "";
    show("login");
    status(message || T.signIn, isError);
  }

  // Comprueba la biblioteca sin bajar nada: la URL firmada dura 5 minutos, así que la de verdad se
  // pide recién al tocar el botón.
  function check() {
    status(T.checking);
    return download(false);
  }

  function download(start) {
    return api("GET", "/v1/model-downloads/" + encodeURIComponent(MODEL_ID), null, accessToken).then(function (res) {
      if (res.ok && res.data && res.data.url) {
        show("ready");
        if (start) {
          status(T.started);
          location.href = res.data.url;
        } else {
          status(T.ready);
        }
        return;
      }
      if (res.status === 401) return askLogin();
      show("ready");
      downloadBtn.hidden = true;
      // La API dice el motivo en data.reason (not-owned, revoked, removed).
      var reason = res.data && res.data.data && res.data.data.reason;
      var message = {
        403: reason === "not-owned" ? T.notYours : T.noApp,
        404: T.missing,
        410: reason === "removed" ? T.removed : T.revoked
      }[res.status];
      status(message || T.network, true);
    });
  }

  function resume() {
    var token = stored();
    if (!token) return Promise.resolve(askLogin());
    return api("POST", "/v1/authentication", { strategy: "refresh", refreshToken: token }).then(function (res) {
      if (!onSession(res)) {
        store("");
        return askLogin();
      }
      return check();
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector("button");
    button.disabled = true;
    status(T.signingIn);
    api("POST", "/v1/authentication", {
      strategy: "local",
      email: form.email.value.trim(),
      password: form.password.value,
      remember: true
    }).then(function (res) {
      if (!onSession(res)) {
        askLogin(res.status === 401 || res.status === 400 ? T.badLogin : T.network, true);
        return;
      }
      form.password.value = "";
      downloadBtn.hidden = false;
      return check();
    }).catch(function () {
      status(T.network, true);
    }).then(function () {
      button.disabled = false;
    });
  });

  downloadBtn.addEventListener("click", function () {
    downloadBtn.disabled = true;
    status(T.preparing);
    download(true).catch(function () {
      status(T.network, true);
    }).then(function () {
      downloadBtn.disabled = false;
    });
    if (window.atlasTrack) window.atlasTrack("descargar_modelo", { model: MODEL_ID });
  });

  el("logout").addEventListener("click", function () {
    var token = stored();
    store("");
    if (token) api("POST", "/v1/logout", { refreshToken: token }).catch(function () {});
    downloadBtn.hidden = false;
    askLogin();
  });

  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(MODEL_ID)) {
    status(T.noId, true);
    return;
  }
  loadModel();
  resume().catch(function () {
    status(T.network, true);
  });
})();
