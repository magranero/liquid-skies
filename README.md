# Liquid Skies · web

Web estática del movimiento Liquid Skies (techno & remember, nómada: cada edición en un sitio).
Desplegada en Netlify: https://liquid-skies.netlify.app

## Cambiar las plazas libres

Edita `data/eventos.json` directamente en GitHub (icono del lápiz) y cambia:

```json
"plazas_libres": 100
```

La web lee ese archivo en vivo desde GitHub: el número se actualiza en ~5 minutos
sin redesplegar. Con `0` la web muestra "Nave completa".

## Añadir un evento nuevo

1. Añade un objeto nuevo en `data/eventos.json` (copia el de `v1` y cambia `id`, fechas, lugar…).
2. Duplica `eventos/v1/` como `eventos/v2/` y ajusta textos, `data-event="v2"` y metaetiquetas `og:*`.
3. Genera la imagen para compartir (`img/og-v2.jpg`, 1200×630) con `tools/render_og.py` del proyecto.

## Estructura

- `index.html` — manifiesto, el viaje y listado de eventos
- `eventos/v1/` — página del evento (preview para WhatsApp/redes vía `og:image`)
- `data/eventos.json` — datos de eventos y plazas libres
- `js/main.js` — cielo líquido WebGL, cuenta atrás, compartir
