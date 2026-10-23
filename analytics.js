/* Atlas — medición: Google Analytics 4 (visitas, origen y eventos) y Microsoft
   Clarity (mapas de calor y grabación de sesiones), con aviso de cookies.

   Los IDs se cargan acá y en ningún otro lado. Mientras sigan los valores de
   ejemplo no se carga nada. Los eventos propios (clic en «Comprar Atlas», FAQ,
   secciones vistas, etc.) los manda script.js con window.atlasTrack.

   Consentimiento: hasta que la persona acepta, GA4 funciona sin cookies (sólo
   cuenta visitas de forma anónima, el «modo de consentimiento» de Google) y
   Clarity no se carga. Al aceptar se activan las cookies y Clarity. La elección
   se guarda en el navegador; cualquier elemento con [data-cookie-settings]
   vuelve a mostrar el aviso (hay un botón en la política de privacidad). */
(function () {
  "use strict";

  var GA4_ID = "G-YFG4QV9DRH"; // ANALYTICS_ID: Google Analytics → Administrar → Flujos de datos
  var CLARITY_ID = "z27du9ics3"; // ANALYTICS_ID: Clarity → Settings → Overview → Project ID

  var KEY = "atlas-cookies"; // "granted" o "denied"

  // Sólo se mide el sitio publicado, no las pruebas en local.
  var live = /(^|\.)atlas-64\.com$/.test(location.hostname);
  var hasGa = GA4_ID.indexOf("XXXX") === -1;
  var hasClarity = CLARITY_ID.indexOf("XXXX") === -1;
  var ga = live && hasGa;
  var clarityOn = false;

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function store(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      // Sin almacenamiento (modo privado estricto): la elección dura esta visita
    }
  }

  function load(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  var choice = stored();

  if (ga) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    // Sin publicidad: los permisos de anuncios quedan siempre denegados
    window.gtag("consent", "default", {
      analytics_storage: choice === "granted" ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
    load("https://www.googletagmanager.com/gtag/js?id=" + GA4_ID);
  }

  function startClarity() {
    if (clarityOn || !live || !hasClarity) return;
    clarityOn = true;
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    load("https://www.clarity.ms/tag/" + CLARITY_ID);
    window.clarity("consent");
  }

  function grant() {
    store("granted");
    if (ga) window.gtag("consent", "update", { analytics_storage: "granted" });
    startClarity();
  }
  function deny() {
    store("denied");
    if (ga) window.gtag("consent", "update", { analytics_storage: "denied" });
    // Si Clarity ya estaba corriendo, deja de grabar en la próxima página
  }

  if (choice === "granted") startClarity();

  // ---------- Aviso de cookies ----------

  var banner = null;
  function showBanner() {
    if (banner) {
      banner.hidden = false;
      return;
    }
    banner = document.createElement("section");
    banner.className = "cookie-bar";
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.innerHTML =
      '<p class="cookie-bar__text">Usamos cookies para entender cómo se usa el sitio y así seguir mejorando. ' +
      "No las utilizamos para publicidad. " +
      '<a href="/privacy-policy/#sitio-web">Más información</a></p>' +
      '<div class="cookie-bar__actions">' +
      '<button class="cookie-bar__btn" type="button" data-cookie="denied">Rechazar</button>' +
      '<button class="cookie-bar__btn cookie-bar__btn--accept" type="button" data-cookie="granted">Aceptar</button>' +
      "</div>";
    banner.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-cookie]");
      if (!btn) return;
      if (btn.getAttribute("data-cookie") === "granted") grant();
      else deny();
      banner.hidden = true;
    });
    document.body.appendChild(banner);
  }

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // Sólo hace falta preguntar si hay algo que mida
  if (hasGa || hasClarity) {
    ready(function () {
      if (!choice) showBanner();
      document.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest("[data-cookie-settings]")) {
          event.preventDefault();
          showBanner();
        }
      });
    });
  }

  // Un evento con nombre y datos opcionales: va a GA4 y queda marcado en Clarity
  // para poder filtrar las grabaciones (p. ej. «sesiones que hicieron clic en Comprar»).
  window.atlasTrack = function (name, params) {
    if (ga) window.gtag("event", name, params || {});
    if (clarityOn) window.clarity("event", name);
  };
})();
