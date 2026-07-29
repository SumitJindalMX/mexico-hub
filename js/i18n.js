(() => {
  const STRINGS = {
    en: {
      "nav.browse": "Browse activities",
      "nav.myRegs": "My registrations",
      "nav.calendar": "Calendar",
      "nav.gallery": "Winners",
      "nav.analytics": "Analytics",
      "nav.tour": "Tour",
      "hero.cta": "Browse activities",
      "role.visitor": "Visitor",
      "section.pulse": "What Mexico is known for right now",
      "section.themes": "Four ways Mexico shows up",
      "section.events": "Hackathons & other activities",
      "section.myRegs": "My registrations",
      "section.calendar": "Activity calendar",
      "section.gallery": "Winners gallery",
      "section.analytics": "Ops analytics",
      "notify.title": "Notifications",
      "notify.empty": "No alerts right now.",
      "btn.register": "Register team",
      "btn.create": "Create activity",
      "lang.es": "ES",
      "lang.en": "EN",
      "tour.welcome": "Welcome to Mexico Hub — browse activities, register teams, and organize events by role.",
    },
    es: {
      "nav.browse": "Ver actividades",
      "nav.myRegs": "Mis registros",
      "nav.calendar": "Calendario",
      "nav.gallery": "Ganadores",
      "nav.analytics": "Analítica",
      "nav.tour": "Recorrido",
      "hero.cta": "Ver actividades",
      "role.visitor": "Visitante",
      "section.pulse": "Por qué destaca México ahora",
      "section.themes": "Cuatro formas en que México se muestra",
      "section.events": "Hackathons y otras actividades",
      "section.myRegs": "Mis registros",
      "section.calendar": "Calendario de actividades",
      "section.gallery": "Galería de ganadores",
      "section.analytics": "Analítica operativa",
      "notify.title": "Notificaciones",
      "notify.empty": "Sin alertas por ahora.",
      "btn.register": "Registrar equipo",
      "btn.create": "Crear actividad",
      "lang.es": "ES",
      "lang.en": "EN",
      "tour.welcome": "Bienvenido a Mexico Hub — explora actividades, registra equipos y organiza según tu rol.",
    },
  };

  const KEY = "gdl.lang";

  function lang() {
    return localStorage.getItem(KEY) || "en";
  }

  function setLang(l) {
    localStorage.setItem(KEY, l === "es" ? "es" : "en");
    apply();
  }

  function t(key) {
    const pack = STRINGS[lang()] || STRINGS.en;
    return pack[key] || STRINGS.en[key] || key;
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    const btn = document.getElementById("btn-lang");
    if (btn) btn.textContent = lang() === "es" ? "EN" : "ES";
    document.documentElement.lang = lang();
  }

  function toggle() {
    setLang(lang() === "es" ? "en" : "es");
  }

  window.GDLi18n = { t, apply, toggle, lang, setLang, STRINGS };
})();
