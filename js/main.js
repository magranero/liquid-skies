// Liquid Skies — cielo líquido WebGL, eventos, cuenta atrás y compartir.

// Los datos se leen en vivo del repo de GitHub: editar data/eventos.json allí
// actualiza las plazas libres sin redesplegar (caché de GitHub ~5 min).
const DATA_REMOTE = "https://raw.githubusercontent.com/magranero/liquid-skies/main/data/eventos.json";
const DATA_LOCAL = "/data/eventos.json";

/* ---------------- Cielo líquido ---------------- */
function initSky() {
  const c = document.getElementById("sky");
  if (!c) return;
  const gl = c.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float s;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);for(int i=0;i<6;i++){v+=a*n(p);p=R*p*2.02;a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/r;vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);
 p.y+=s*.35;
 float T=t*.045;
 vec2 q=vec2(fbm(p*1.6+T),fbm(p*1.6-T+4.2));
 vec2 w=vec2(fbm(p*1.3+2.5*q+vec2(1.7,9.2)+T*1.3+m*.25),fbm(p*1.3+2.5*q+vec2(8.3,2.8)-T));
 float f=fbm(p*1.2+3.*w);
 vec3 night=vec3(.012,.016,.045);
 vec3 deep=vec3(.05,.11,.36);
 vec3 cyan=vec3(.2,.92,1.);
 vec3 vio=vec3(.52,.3,1.);
 vec3 pink=vec3(1.,.24,.6);
 vec3 col=mix(night,deep,smoothstep(.2,.8,f));
 col=mix(col,vio,smoothstep(.55,.95,length(w))*.55);
 col=mix(col,cyan,pow(smoothstep(.55,1.,f),3.)*.9);
 col+=pink*pow(smoothstep(.7,1.,w.x*f*1.6),4.)*.35;
 float caustic=pow(abs(sin((f+w.y)*18.+t*.4)),24.)*smoothstep(.45,.8,f);
 col+=cyan*caustic*.35;
 col*=.55+.6*smoothstep(-.2,1.1,uv.y);
 col*=1.-.55*length((uv-.5)*vec2(1.1,1.4));
 gl_FragColor=vec4(col,1.);
}`;
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k);
  const ur = U("r"), ut = U("t"), um = U("m"), us = U("s");
  const mouse = [0, 0], target = [0, 0];
  addEventListener("pointermove", (e) => { target[0] = e.clientX / innerWidth - .5; target[1] = e.clientY / innerHeight - .5; });
  const scale = Math.min(devicePixelRatio, 1.5) * (innerWidth < 700 ? .6 : .75);
  const resize = () => { c.width = innerWidth * scale; c.height = innerHeight * scale; gl.viewport(0, 0, c.width, c.height); };
  addEventListener("resize", resize); resize();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  const frame = (now) => {
    mouse[0] += (target[0] - mouse[0]) * .04; mouse[1] += (target[1] - mouse[1]) * .04;
    gl.uniform2f(ur, c.width, c.height);
    gl.uniform1f(ut, still ? 20 : (now - t0) / 1000);
    gl.uniform2f(um, mouse[0], mouse[1]);
    gl.uniform1f(us, scrollY / innerHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  if (still) addEventListener("scroll", () => requestAnimationFrame(frame), { passive: true });
}

/* ---------------- Datos ---------------- */
async function loadEventos() {
  for (const url of [DATA_REMOTE + "?t=" + Math.floor(Date.now() / 60000), DATA_LOCAL]) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) return (await r.json()).eventos || [];
    } catch (_) { /* siguiente fuente */ }
  }
  return [];
}

function seatsHTML(n) {
  const cls = n <= 0 ? "zero" : n <= 20 ? "low" : "";
  const label = n <= 0 ? "Nave completa" : n === 1 ? "Plaza libre" : "Plazas libres";
  return `<span class="seats ${cls}"><b>${Math.max(0, n)}</b><span>${label}</span></span>`;
}

const fmtDay = (d) => d.toLocaleDateString("es-ES", { day: "2-digit", timeZone: "Europe/Madrid" });
const fmtMon = (d) => d.toLocaleDateString("es-ES", { month: "short", timeZone: "Europe/Madrid" }).replace(".", "").toUpperCase();

function renderEventos(list) {
  const box = document.getElementById("eventos-list");
  if (!box) return;
  const now = Date.now();
  box.innerHTML = list.map((e) => {
    const d = new Date(e.inicio);
    const past = new Date(e.fin || e.inicio).getTime() < now;
    return `<a class="ev rv" href="${e.url}">
      <div class="ph" style="background-image:url('${e.imagen}')">
        <span class="pill badge"><i class="dot"></i>${past ? "Ya aterrizamos" : "Próximo despegue"}</span>
      </div>
      <div class="info">
        <div class="date grad">${fmtDay(d)}.${String(d.getMonth() + 1).padStart(2, "0")}</div>
        <h3>${e.nombre}${e.subtitulo ? " · " + e.subtitulo : ""}</h3>
        <div class="meta">${e.fecha_texto} · ${e.hora_texto}<br>${e.lugar} — ${e.direccion}<br>${e.precio}</div>
        <div class="cta">${past ? "" : seatsHTML(e.plazas_libres)}<span class="btn primary">Ver evento →</span></div>
      </div>
    </a>`;
  }).join("");
  observe();
}

function fillSeats(ev) {
  document.querySelectorAll("[data-seats]").forEach((el) => { el.innerHTML = seatsHTML(ev.plazas_libres); });
  document.querySelectorAll("[data-seats-num]").forEach((el) => {
    el.textContent = ev.plazas_libres > 0 ? ev.plazas_libres : "0 · completo";
  });
}

/* ---------------- Cuenta atrás ---------------- */
function countdown(target, el, compact) {
  if (!el) return;
  const t = new Date(target).getTime();
  const tick = () => {
    let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    const p = (x) => String(x).padStart(2, "0");
    el.innerHTML = compact
      ? `${d}d ${p(h)}h ${p(m)}m ${p(s)}s`
      : [[d, "días"], [p(h), "horas"], [p(m), "min"], [p(s), "seg"]].map(([v, k]) => `<div><b>${v}</b><span>${k}</span></div>`).join("");
  };
  tick(); setInterval(tick, 1000);
}

/* ---------------- Compartir ---------------- */
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("on");
  setTimeout(() => t.classList.remove("on"), 2200);
}

function initShare() {
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const text = document.body.dataset.share || document.title;
  document.querySelectorAll("[data-wa]").forEach((a) => { a.href = "https://wa.me/?text=" + encodeURIComponent(text + "\n" + url); });
  document.querySelectorAll("[data-tg]").forEach((a) => { a.href = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text); });
  document.querySelectorAll("[data-x]").forEach((a) => { a.href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url); });
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(url); toast("Enlace copiado 🚀"); } catch (_) { prompt("Copia el enlace:", url); }
  }));
  document.querySelectorAll("[data-native]").forEach((b) => {
    if (!navigator.share) { b.remove(); return; }
    b.addEventListener("click", () => navigator.share({ title: document.title, text, url }).catch(() => {}));
  });
}

/* ---------------- Reveal ---------------- */
let io;
function observe() {
  io = io || new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll(".rv:not(.in)").forEach((el) => io.observe(el));
}

/* ---------------- Arranque ---------------- */
initSky();
initShare();
observe();
document.querySelectorAll(".rule").forEach((r) => r.addEventListener("click", () => r.classList.toggle("stuck")));

loadEventos().then((list) => {
  renderEventos(list);
  const id = document.body.dataset.event;
  const upcoming = list.filter((e) => new Date(e.fin || e.inicio) > new Date());
  const ev = id ? list.find((e) => e.id === id) : upcoming[0];
  if (!ev) return;
  fillSeats(ev);
  countdown(ev.inicio, document.getElementById("count"), false);
  countdown(ev.inicio, document.getElementById("count-mini"), true);
});
