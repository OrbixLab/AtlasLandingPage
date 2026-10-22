/* Atlas — medición: Google Analytics 4 (visitas, origen y eventos) y Microsoft
   Clarity (mapas de calor y grabación de sesiones).

   Los IDs se cargan acá y en ningún otro lado. Mientras sigan los valores de
   ejemplo no se carga nada. Los eventos propios (clic en «Comprar Atlas», FAQ,
   etc.) los manda script.js con window.atlasTrack. */
(function () {
  "use strict";

  var GA4_ID = "G-YFG4QV9DRH"; // ANALYTICS_ID: Google Analytics → Administrar → Flujos de datos
  var CLARITY_ID = "XXXXXXXXXX"; // ANALYTICS_ID: Clarity → Settings → Overview → Project ID

  // Sólo se mide el sitio publicado, no las pruebas en local.
  var live = /(^|\.)atlas-64\.com$/.test(location.hostname);
  var ga = live && GA4_ID.indexOf("XXXX") === -1;
  var clarity = live && CLARITY_ID.indexOf("XXXX") === -1;

  function load(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  if (ga) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
    load("https://www.googletagmanager.com/gtag/js?id=" + GA4_ID);
  }

  if (clarity) {
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    load("https://www.clarity.ms/tag/" + CLARITY_ID);
  }

  // Un evento con nombre y datos opcionales: va a GA4 y queda marcado en Clarity
  // para poder filtrar las grabaciones (p. ej. «sesiones que hicieron clic en Comprar»).
  window.atlasTrack = function (name, params) {
    if (ga) window.gtag("event", name, params || {});
    if (clarity) window.clarity("event", name);
  };
})();
