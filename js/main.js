/**
 * Mochis Gym Training - Main JavaScript
 * Segunda etapa: migrar lógica a módulos Django y API REST
 */

(function () {
  "use strict";

  const WHATSAPP_BASE = "https://wa.me/526681174194";
  const TIMEZONE = "America/Mazatlan";

  const SCHEDULE = {
    1: { open: 5, close: 23 },
    2: { open: 5, close: 23 },
    3: { open: 5, close: 23 },
    4: { open: 5, close: 23 },
    5: { open: 5, close: 23 },
    6: { open: 8, close: 18 },
    0: { open: 9, close: 14 }
  };

  const MEMBERSHIP_LABELS = {
    visita: "visita",
    semana: "semana",
    quincena: "quincena",
    mensualidad: "mensualidad",
    semestral: "semestral",
    anualidad: "anualidad"
  };

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  function safeRun(fn) {
    try {
      fn();
    } catch (error) {
      console.warn("Mochis Gym:", error.message);
    }
  }

  /* Evita saltos de pantalla al abrir capas en navegadores móviles. */
  let lockedScrollY = 0;

  function lockPageScroll() {
    if (document.body.classList.contains("is-scroll-locked")) return;

    lockedScrollY = window.scrollY;
    document.body.style.top = "-" + lockedScrollY + "px";
    document.body.classList.add("is-scroll-locked");
  }

  function unlockPageScroll() {
    if (!document.body.classList.contains("is-scroll-locked")) return;

    const html = document.documentElement;
    const previousScrollBehavior = html.style.scrollBehavior;

    /* Evita que el scroll suave anime el regreso a la posición original. */
    html.style.scrollBehavior = "auto";
    document.body.classList.remove("is-scroll-locked");
    document.body.style.top = "";
    window.scrollTo({ top: lockedScrollY, left: 0, behavior: "auto" });

    requestAnimationFrame(function () {
      html.style.scrollBehavior = previousScrollBehavior;
    });
  }

  /* --------------------------------------------------------------------------
     Manejo de imágenes faltantes
     -------------------------------------------------------------------------- */
  function initMissingImages() {
    $$("img").forEach(function (img) {
      if (img.complete && img.naturalWidth === 0) {
        handleMissingImage(img);
      }
      img.addEventListener("error", function () {
        handleMissingImage(img);
      });
    });
  }

  function handleMissingImage(img) {
    img.classList.add("is-missing");
    img.removeAttribute("src");
    img.alt = "";
  }

  /* --------------------------------------------------------------------------
     Año del footer
     -------------------------------------------------------------------------- */
  function initFooterYear() {
    const yearEl = $("#footer-year");
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  /* --------------------------------------------------------------------------
     Enlaces dinámicos de WhatsApp para membresías
     -------------------------------------------------------------------------- */
  function initMembershipWhatsApp() {
    $$(".membresia-card__btn[data-membership]").forEach(function (link) {
      const membership = link.getAttribute("data-membership");
      const price = link.getAttribute("data-price");
      const label = MEMBERSHIP_LABELS[membership] || membership;

      if (!membership || !price) return;

      const message =
        "Hola, vi la página de Mochis Gym Training y quiero información sobre la " +
        label +
        " de $" +
        Number(price).toLocaleString("es-MX") +
        ".";

      link.href = WHATSAPP_BASE + "?text=" + encodeURIComponent(message);
    });
  }

  /* --------------------------------------------------------------------------
     Header scroll y menú móvil
     -------------------------------------------------------------------------- */
  function initHeader() {
    const header = $("#header");
    const toggle = $(".header__toggle");
    const nav = $(".header__nav");
    const navLinks = $$("[data-nav-link]");

    if (!header) return;

    function onScroll() {
      header.classList.toggle("header--scrolled", window.scrollY > 40);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
          lockPageScroll();
        } else {
          unlockPageScroll();
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
          closeNav();
          toggle.focus();
        }
      });

      document.addEventListener("click", function (event) {
        if (!nav.classList.contains("is-open")) return;
        if (!nav.contains(event.target) && !toggle.contains(event.target)) {
          closeNav();
        }
      });

      function closeNav() {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        unlockPageScroll();
      }

      navLinks.forEach(function (link) {
        link.addEventListener("click", closeNav);
      });
    }
  }

  /* --------------------------------------------------------------------------
     Navegación suave y sección activa
     -------------------------------------------------------------------------- */
  function initSmoothNav() {
    const navLinks = $$("[data-nav-link]");
    const sections = $$("section[id]");

    navLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        history.pushState(null, "", href);
      });
    });

    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          const id = entry.target.getAttribute("id");
          navLinks.forEach(function (link) {
            const isActive = link.getAttribute("href") === "#" + id;
            link.classList.toggle("is-active", isActive);
            if (isActive) {
              link.setAttribute("aria-current", "page");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0.2
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* --------------------------------------------------------------------------
     Indicador abierto / cerrado (America/Mazatlan)
     -------------------------------------------------------------------------- */
  function initScheduleStatus() {
    const statusEl = $("#horarios-status");
    if (!statusEl) return;

    const dotEl = $(".horarios__status-dot", statusEl);
    const textEl = $(".horarios__status-text", statusEl);

    function getMazatlanParts() {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      });

      const parts = formatter.formatToParts(new Date());
      const map = {};
      parts.forEach(function (part) {
        map[part.type] = part.value;
      });

      const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const day = weekdayMap[map.weekday];
      const hour = parseInt(map.hour, 10);
      const minute = parseInt(map.minute, 10);
      const currentMinutes = hour * 60 + minute;

      return { day, currentMinutes };
    }

    function minutesFromHour(hour) {
      return hour * 60;
    }

    function formatHour(hour) {
      const suffix = hour >= 12 ? "p.m." : "a.m.";
      const h = hour % 12 === 0 ? 12 : hour % 12;
      return h + ":00 " + suffix;
    }

    function updateStatus() {
      const { day, currentMinutes } = getMazatlanParts();
      const today = SCHEDULE[day];

      if (!today) return;

      const openMinutes = minutesFromHour(today.open);
      const closeMinutes = minutesFromHour(today.close);

      statusEl.classList.remove("horarios__status--open", "horarios__status--closed", "horarios__status--soon");

      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        statusEl.classList.add("horarios__status--open");
        textEl.textContent = "Abierto ahora";
      } else if (currentMinutes < openMinutes) {
        statusEl.classList.add("horarios__status--soon");
        textEl.textContent = "Abre próximamente a las " + formatHour(today.open);
      } else {
        statusEl.classList.add("horarios__status--closed");
        textEl.textContent = "Cerrado ahora";
      }
    }

    updateStatus();
    setInterval(updateStatus, 60000);
  }

  /* --------------------------------------------------------------------------
     Lightbox
     -------------------------------------------------------------------------- */
  function initLightbox() {
    const lightbox = $("#lightbox");
    if (!lightbox) return;

    const lightboxImg = $(".lightbox__img", lightbox);
    const lightboxCaption = $(".lightbox__caption", lightbox);
    const closeBtn = $(".lightbox__close", lightbox);
    const triggers = $$("[data-lightbox]");
    let lastFocused = null;

    function openLightbox(src, caption) {
      if (!src || !lightboxImg) return;

      lastFocused = document.activeElement;
      lightboxImg.src = src;
      lightboxImg.alt = caption || "Imagen de instalaciones";
      if (lightboxCaption) {
        lightboxCaption.textContent = caption || "";
      }

      lightbox.hidden = false;
      requestAnimationFrame(function () {
        lightbox.classList.add("is-active");
      });
      lockPageScroll();
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove("is-active");
      setTimeout(function () {
        lightbox.hidden = true;
        if (lightboxImg) {
          lightboxImg.src = "";
        }
      }, 300);
      unlockPageScroll();
      if (lastFocused && typeof lastFocused.focus === "function") {
        try {
          lastFocused.focus({ preventScroll: true });
        } catch (error) {
          lastFocused.focus();
        }
      }
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        const img = trigger.querySelector("img");
        if (img && img.classList.contains("is-missing")) return;

        const src = trigger.getAttribute("data-lightbox");
        const caption = trigger.getAttribute("data-caption");
        openLightbox(src, caption);
      });
    });

    closeBtn.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !lightbox.hidden && lightbox.classList.contains("is-active")) {
        closeLightbox();
      }
    });
  }

  /* --------------------------------------------------------------------------
     Acordeón FAQ
     -------------------------------------------------------------------------- */
  function initFaqAccordion() {
    const questions = $$(".faq__question");

    questions.forEach(function (question) {
      question.addEventListener("click", function () {
        const expanded = question.getAttribute("aria-expanded") === "true";
        const answerId = question.getAttribute("aria-controls");
        const answer = answerId ? document.getElementById(answerId) : null;
        const item = question.closest(".faq__item");

        questions.forEach(function (other) {
          if (other === question) return;
          other.setAttribute("aria-expanded", "false");
          const otherItem = other.closest(".faq__item");
          if (otherItem) otherItem.classList.remove("is-open");
          const otherAnswerId = other.getAttribute("aria-controls");
          const otherAnswer = otherAnswerId ? document.getElementById(otherAnswerId) : null;
          if (otherAnswer) otherAnswer.hidden = true;
        });

        question.setAttribute("aria-expanded", String(!expanded));
        if (answer) {
          answer.hidden = expanded;
        }
        if (item) {
          item.classList.toggle("is-open", !expanded);
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     Animaciones con IntersectionObserver
     -------------------------------------------------------------------------- */
  function initRevealAnimations() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = $$(".reveal");

    if (prefersReducedMotion || !revealElements.length) {
      revealElements.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    const staggerGroups = $$(
      ".hero__grid, .hero__badges, .beneficios__grid, .gallery, .membresias__grid, .horarios__grid, .resenas__highlights, .faq__list"
    );

    staggerGroups.forEach(function (group) {
      group.querySelectorAll(".reveal").forEach(function (el, index) {
        el.style.transitionDelay = Math.min(index * 0.08, 0.4) + "s";
      });
    });

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* --------------------------------------------------------------------------
     Inicialización
     -------------------------------------------------------------------------- */
  function init() {
    safeRun(initMissingImages);
    safeRun(initFooterYear);
    safeRun(initMembershipWhatsApp);
    safeRun(initHeader);
    safeRun(initSmoothNav);
    safeRun(initScheduleStatus);
    safeRun(initLightbox);
    safeRun(initFaqAccordion);
    safeRun(initRevealAnimations);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
