(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Aurora background ---------- */
  const canvas = document.getElementById("aurora");
  const ctx = canvas.getContext("2d");
  const blobs = [
    { hue: "255, 122, 69", r: 0.42, x: 0.15, y: 0.2, sx: 0.00021, sy: 0.00017 },
    { hue: "255, 61, 127", r: 0.36, x: 0.8, y: 0.3, sx: 0.00016, sy: 0.00023 },
    { hue: "124, 92, 255", r: 0.5, x: 0.55, y: 0.85, sx: 0.00019, sy: 0.00014 },
    { hue: "42, 211, 255", r: 0.28, x: 0.3, y: 0.7, sx: 0.00024, sy: 0.00019 },
  ];
  let w, h, dpr;
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // Render at reduced resolution — it's blurred anyway, and this keeps it cheap.
    w = canvas.width = Math.floor((window.innerWidth * dpr) / 3);
    h = canvas.height = Math.floor((window.innerHeight * dpr) / 3);
  }

  function draw(t) {
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    ctx.fillStyle = "#07070b";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const scroll = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
    blobs.forEach((b, i) => {
      const cx = (b.x + Math.sin(t * b.sx + i) * 0.18 + (pointer.x - 0.5) * 0.08 * (i + 1)) * w;
      const cy = (b.y + Math.cos(t * b.sy + i * 2) * 0.16 + (pointer.y - 0.5) * 0.06 * (i + 1) - scroll * 0.3) * h;
      const r = b.r * Math.max(w, h);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${b.hue}, 0.45)`);
      g.addColorStop(1, `rgba(${b.hue}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    ctx.globalCompositeOperation = "source-over";
    // Vignette towards the bottom so content stays readable.
    const v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, "rgba(7,7,11,0)");
    v.addColorStop(1, "rgba(7,7,11,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);

  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX / window.innerWidth;
    pointer.ty = e.clientY / window.innerHeight;
  });

  /* ---------- Hero intro ---------- */
  requestAnimationFrame(() => {
    document.querySelectorAll(".hero-title .word").forEach((el, i) => {
      el.style.transitionDelay = `${0.1 + i * 0.08}s`;
    });
    document.body.classList.add("loaded");
  });

  /* ---------- Nav ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = document.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el, i) => {
    if (!el.closest(".hero")) el.style.transitionDelay = `${(i % 4) * 0.08}s`;
    io.observe(el);
  });

  /* ---------- Word-by-word about statement ---------- */
  const statement = document.querySelector(".reveal-words");
  if (statement) {
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) return frag.append(part);
            const s = document.createElement("span");
            s.className = "w";
            s.textContent = part;
            frag.append(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          child.classList.add("w");
        }
      });
    };
    wrap(statement);
    const words = statement.querySelectorAll(".w");
    const lightWords = () => {
      const rect = statement.getBoundingClientRect();
      const progress = (window.innerHeight * 0.85 - rect.top) / (rect.height + window.innerHeight * 0.35);
      const lit = Math.floor(Math.max(0, Math.min(1, progress)) * words.length);
      words.forEach((wd, i) => wd.classList.toggle("on", i < lit));
    };
    if (reduceMotion) words.forEach((wd) => wd.classList.add("on"));
    else {
      lightWords();
      window.addEventListener("scroll", lightWords, { passive: true });
    }
  }

  /* ---------- Counters ---------- */
  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = +el.dataset.count;
        const start = performance.now();
        const dur = reduceMotion ? 1 : 1800;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / dur);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        counterIO.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => counterIO.observe(el));

  /* ---------- Pointer-driven effects (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    // Custom cursor
    const cursor = document.querySelector(".cursor");
    const dot = cursor.querySelector(".cursor-dot");
    const ring = cursor.querySelector(".cursor-ring");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { ...pos };
    window.addEventListener("pointermove", (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      cursor.classList.add("is-active");
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    });
    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
    document.querySelectorAll("a, button, .card, .service").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });

    // Magnetic buttons
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 600);
      });
    });

    // 3D tilt + spotlight cards
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    });
  }

  /* ---------- Footer clock + year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
  const clock = document.getElementById("clock");
  const updateClock = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " local time";
  };
  updateClock();
  setInterval(updateClock, 30000);
})();
