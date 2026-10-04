# AFP-Coaching · Website

Website von AFP-Coaching – Personal Training vor Ort und online.
Live unter [afp-coaching.de](https://afp-coaching.de).

Reines HTML, CSS und JavaScript: kein Build-Prozess, keine Frameworks, keine
Cookies und keine Anfragen an fremde Server.

## Aufbau

```
docs/                 Die Website – nur dieser Ordner wird veröffentlicht
  index.html          Startseite (One-Pager)
  impressum.html
  datenschutz.html
  404.html            Fehlerseite
  css/style.css       Design und Farben
  js/main.js          Menü, Animationen, Kontaktformular
  img/                Bilder
  robots.txt
  sitemap.xml
```

## Lokal ansehen

```bash
python3 -m http.server 4321 --directory docs
```

Danach `http://localhost:4321` im Browser öffnen.

## Veröffentlichen

GitHub Pages veröffentlicht den Ordner `docs/` aus dem Branch `main`.
Jede Änderung, die dort landet, ist nach etwa einer Minute live.
