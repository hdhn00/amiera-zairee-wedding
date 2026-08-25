// ============================================================
// 1. CONFIG — replace with your deployed Worker URL
// ============================================================
const WORKER_URL = "https://amiera-zairee-rsvp.YOUR-SUBDOMAIN.workers.dev";

// ============================================================
// 2. SIDE CONTENT — bride vs groom versions of the invite card
// ============================================================
const WEDDING_DATE = new Date("2026-12-26T11:00:00+08:00");

const SIDES = {
  bride: {
    nameA: "AMIERA", nameB: "ZAIREE",
    scriptA: "Amiera Natasha", scriptB: "Zairee Nazmi",
    childRole: "puteri",
    parents: "SUHAIMI BIN SAPAR<br><span class=\"amp-small\">&amp;</span><br>HASNORAINI BT. ABDULLAH",
    contact: "IBU &nbsp; : 012-434 8404<br>BAPA : 019-252 6430"
  },
  groom: {
    nameA: "ZAIREE", nameB: "AMIERA",
    scriptA: "Zairee Nazmi", scriptB: "Amiera Natasha",
    childRole: "putera",
    parents: "ZAMBREE BIN ZAWAWI<br><span class=\"amp-small\">&amp;</span><br>NASRIAH BT. SAMSUDIN",
    contact: "IBU &nbsp;: 014-264 1872<br>BAPA : 017-242 5341"
  }
};

function applySide() {
  const params = new URLSearchParams(window.location.search);
  const side = params.get("side") === "groom" ? "groom" : "bride";
  const data = SIDES[side];

  // hero image toggle (full Canva hero)
  document.querySelectorAll(".hero-canva-img").forEach(el => el.classList.remove("is-active"));
  const activeHero = document.querySelector(`[data-role="hero-${side}"]`);
  if (activeHero) activeHero.classList.add("is-active");

  document.querySelectorAll('[data-role="script-a"]').forEach(el => el.textContent = data.scriptA);
  document.querySelectorAll('[data-role="script-b"]').forEach(el => el.textContent = data.scriptB);
  document.querySelectorAll('[data-role="child-role"]').forEach(el => el.textContent = data.childRole);
  document.querySelectorAll('[data-role="parents"]').forEach(el => el.innerHTML = data.parents);
  document.querySelectorAll('[data-role="contact"]').forEach(el => el.innerHTML = data.contact);

  // footer + cover script names keep couple order same as hero for this side
  document.querySelectorAll('.footer-names [data-role="name-a"], .cover-monogram [data-role="name-a"]').forEach(el => el.textContent = capitalize(data.nameA));
  document.querySelectorAll('.footer-names [data-role="name-b"], .cover-monogram [data-role="name-b"]').forEach(el => el.textContent = capitalize(data.nameB));

  // wax seal initials
  document.querySelectorAll('[data-role="seal-initials"]').forEach(el => {
    el.textContent = `${data.nameA.charAt(0)}&${data.nameB.charAt(0)}`;
  });
}
function capitalize(s){ return s.charAt(0) + s.slice(1).toLowerCase(); }

// ============================================================
// 3. COUNTDOWN
// ============================================================
function updateDigit(id, value) {
  const el = document.getElementById(id);
  if (el.textContent !== value) {
    el.textContent = value;
    el.classList.remove("is-ticking");
    // force reflow so the animation can restart every time
    void el.offsetWidth;
    el.classList.add("is-ticking");
  }
}

function tickCountdown() {
  const now = new Date();
  let diff = WEDDING_DATE - now;
  if (diff < 0) diff = 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  updateDigit("cd-days", String(days));
  updateDigit("cd-hours", String(hours).padStart(2, "0"));
  updateDigit("cd-mins", String(mins).padStart(2, "0"));
  updateDigit("cd-secs", String(secs).padStart(2, "0"));
}

// ============================================================
// 4. RSVP FORM
// ============================================================
function setupAttendanceToggle() {
  const buttons = document.querySelectorAll(".attend-btn");
  const hiddenInput = document.getElementById("rsvp-attendance");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      hiddenInput.value = btn.dataset.value;
    });
  });
}

async function fetchCounts() {
  try {
    const res = await fetch(`${WORKER_URL}/counts`);
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("stat-total").textContent = data.total ?? 0;
    document.getElementById("stat-hadir").textContent = data.paxHadir ?? 0;
    document.getElementById("stat-tidak").textContent = data.tidakHadir ?? 0;
  } catch (err) {
    console.warn("Could not load RSVP counts:", err);
  }
}

function setupForm() {
  const form = document.getElementById("rsvp-form");
  const status = document.getElementById("form-status");
  const submitBtn = document.getElementById("rsvp-submit");
  const params = new URLSearchParams(window.location.search);
  const side = params.get("side") === "groom" ? "groom" : "bride";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "MENGHANTAR...";
    status.textContent = "";

    const payload = {
      name: document.getElementById("rsvp-name").value.trim(),
      attendance: document.getElementById("rsvp-attendance").value,
      pax: document.getElementById("rsvp-pax").value,
      wishes: document.getElementById("rsvp-wishes").value.trim(),
      side
    };

    try {
      const res = await fetch(`${WORKER_URL}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Request failed");

      status.textContent = "Terima kasih! RSVP anda telah diterima.";
      form.reset();
      document.querySelectorAll(".attend-btn").forEach(b => b.classList.remove("is-active"));
      document.querySelector('.attend-btn[data-value="hadir"]').classList.add("is-active");
      document.getElementById("rsvp-attendance").value = "hadir";
      fetchCounts();
    } catch (err) {
      status.textContent = "Maaf, ralat berlaku. Sila cuba lagi.";
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "HANTAR RSVP →";
    }
  });
}

// ============================================================
// 5. OPENING COVER (door reveal)
// ============================================================
function setupCover() {
  const cover = document.getElementById("cover");
  const btn = document.getElementById("cover-btn");
  const hero = document.querySelector(".hero");
  const music = document.getElementById("bg-music");
  const musicToggle = document.getElementById("music-toggle");

  document.body.classList.add("no-scroll");

  btn.addEventListener("click", () => {
    cover.classList.add("is-opening");
    hero.classList.add("is-revealed");
    document.body.classList.remove("no-scroll");

    // user gesture just happened, so autoplay-with-sound is allowed here
    music.play().then(() => {
      musicToggle.classList.add("is-playing");
    }).catch(() => {
      // playback blocked or no source yet; user can still tap the toggle manually
    });

    cover.addEventListener("transitionend", () => {
      cover.classList.add("is-hidden");
    }, { once: true });
  });

  musicToggle.addEventListener("click", () => {
    if (music.paused) {
      music.play().then(() => musicToggle.classList.add("is-playing")).catch(() => {});
    } else {
      music.pause();
      musicToggle.classList.remove("is-playing");
    }
  });
}

// ============================================================
// 6. SCROLL REVEAL
// ============================================================
function setupScrollReveal() {
  const targets = document.querySelectorAll(".reveal, .reveal-fade");
  if (!("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach(el => observer.observe(el));
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  applySide();
  setupAttendanceToggle();
  setupForm();
  setupCover();
  setupScrollReveal();
  fetchCounts();
  tickCountdown();
  setInterval(tickCountdown, 1000);
});
