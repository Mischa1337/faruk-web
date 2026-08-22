#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trägt alle Daten aus daten.txt in die Website ein.

Aus dem Projektordner aufrufen:

    python3 werkzeug/setup.py             schreibt die Dateien
    python3 werkzeug/setup.py --pruefen   zeigt nur, was noch fehlt

Beim ersten Lauf wird eine unveränderte Kopie der Vorlagen unter .vorlage/
abgelegt. Jeder weitere Lauf beginnt wieder dort – das Skript kann also
beliebig oft laufen, ohne dass sich Ersetzungen aufschaukeln.
"""

import os, re, shutil, sys, datetime

# Das Skript liegt in werkzeug/, die Website in docs/, daten.txt oben.
WERKZEUG = os.path.dirname(os.path.abspath(__file__))
PROJEKT  = os.path.dirname(WERKZEUG)
ZIEL     = os.path.join(PROJEKT, 'docs')
VORLAGE  = os.path.join(WERKZEUG, '.vorlage')
DATEIEN = ['index.html', 'impressum.html', 'datenschutz.html', '404.html',
           'robots.txt', 'sitemap.xml', 'js/main.js', 'css/style.css']

MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
          'August', 'September', 'Oktober', 'November', 'Dezember']

PFLICHT = ['NACHNAME', 'STADT', 'DOMAIN', 'EMAIL', 'TELEFON', 'STRASSE', 'PLZ',
           'BUNDESLAND', 'JAHRE_ERFAHRUNG', 'ANZAHL_KUNDEN', 'PREIS_EINZEL',
           'PREIS_10ER_GESAMT', 'PREIS_10ER_PRO_EINHEIT', 'PREIS_ONLINE',
           'PREIS_DUO', 'UEBER_MICH', 'BREITENGRAD', 'LAENGENGRAD']


# ── daten.txt einlesen ────────────────────────────────────────────
def lies_daten():
    pfad = os.path.join(PROJEKT, 'daten.txt')
    if not os.path.exists(pfad):
        sys.exit('FEHLER: daten.txt nicht gefunden.')
    werte = {}
    for zeile in open(pfad, encoding='utf-8'):
        zeile = zeile.strip()
        if not zeile or zeile.startswith('#') or '=' not in zeile:
            continue
        schluessel, wert = zeile.split('=', 1)
        werte[schluessel.strip().upper()] = wert.strip()
    return werte


# ── Vorlagen sichern / zurückholen ────────────────────────────────
def vorlage_bereitstellen():
    neu = []
    for rel in DATEIEN:
        ziel = os.path.join(VORLAGE, rel)
        if os.path.exists(ziel):
            continue
        os.makedirs(os.path.dirname(ziel), exist_ok=True)
        shutil.copy2(os.path.join(ZIEL, rel), ziel)
        neu.append(rel)
    if neu:
        print('Vorlage gesichert: ' + ', '.join(neu))


def lies_vorlage(rel):
    return open(os.path.join(VORLAGE, rel), encoding='utf-8').read()


# ── Telefonnummer in die Link-Form bringen ────────────────────────
def telefon_fuer_links(roh):
    """0170 1234567  ->  1701234567   (für wa.me/49… und tel:+49…)"""
    ziffern = re.sub(r'\D', '', roh)
    if ziffern.startswith('00'):
        ziffern = ziffern[2:]
    if ziffern.startswith('49'):
        ziffern = ziffern[2:]
    elif ziffern.startswith('0'):
        ziffern = ziffern[1:]
    return ziffern



# ── Farben ────────────────────────────────────────────────────────
# Dieselben Formeln stecken in farben.html. Beide müssen identisch
# rechnen, sonst zeigt die Vorschau etwas anderes als das Ergebnis.

PALETTEN = {
    'orange': '#FF5C1A', 'lime': '#B8E62E', 'tuerkis': '#12B5A5',
    'blau': '#3B82F6', 'violett': '#8B5CF6', 'rot': '#E23D3D',
    'gold': '#E0A526', 'anthrazit': '#8A94A6',
}


def zu_rgb(hexwert):
    h = hexwert.lstrip('#')
    if len(h) == 3:
        h = ''.join(z * 2 for z in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def zu_hex(rgb):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(v)))) for v in rgb)


def leuchtkraft(rgb):
    werte = []
    for v in rgb:
        v /= 255
        werte.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * werte[0] + 0.7152 * werte[1] + 0.0722 * werte[2]


def kontrast(a, b):
    l1, l2 = leuchtkraft(zu_rgb(a)), leuchtkraft(zu_rgb(b))
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)


def helligkeit(hexwert, delta):
    import colorsys
    r, g, b = (v / 255 for v in zu_rgb(hexwert))
    h, l, sat = colorsys.rgb_to_hls(r, g, b)
    l = max(0.0, min(1.0, l + delta))
    return zu_hex([v * 255 for v in colorsys.hls_to_rgb(h, l, sat)])


def text_variante(akzent, grund):
    """Markenfarbe als Textfarbe.

    Startet mit einem festen Versatz, damit sie sich vom Vollton sichtbar
    abhebt – davon leben der Hover-Effekt der Buttons und der Logo-Verlauf.
    Reicht der Kontrast dann noch nicht, wird weiter nachgeschoben, bis
    WCAG AA (4.5:1) erreicht ist."""
    auf_dunklem = leuchtkraft(zu_rgb(grund)) < 0.5
    schritt = 0.02 if auf_dunklem else -0.02
    farbe = helligkeit(akzent, 0.09 if auf_dunklem else -0.09)
    for _ in range(60):
        if kontrast(farbe, grund) >= 4.5:
            break
        farbe = helligkeit(farbe, schritt)
    return farbe


def schrift_auf_akzent(akzent):
    """Schrift AUF der Markenfarbe. Weiß auf Farbe ist die übliche
       Erwartung, deshalb hat es Vorrang – aber nur, wenn es die
       4.5:1 auch wirklich erreicht. Sonst dunkle Schrift, und wenn
       beide durchfallen, die kontrastreichere von beiden."""
    hell, dunkel = '#FFFFFF', '#140904'
    if kontrast(akzent, hell) >= 4.5:
        return hell
    if kontrast(akzent, dunkel) >= 4.5:
        return dunkel
    return dunkel if kontrast(akzent, dunkel) >= kontrast(akzent, hell) else hell



# Abstände und Sättigungsfaktoren, abgelesen aus den beiden von Hand
# gestalteten Schemata. Je heller eine Fläche wird, desto weniger Sättigung –
# sonst wirken die oberen Ebenen lackiert statt tief.
STUFEN = {
    'dunkel': [('bg', 0.000, 1.00), ('bg-alt', 0.019, 0.88), ('surface', 0.032, 0.80),
               ('surface-2', 0.050, 0.72), ('line-soft', 0.056, 0.70),
               ('line', 0.095, 0.58), ('line-strong', 0.146, 0.48)],
    'hell':   [('bg', 0.000, 1.00), ('bg-alt', -0.028, 1.05), ('surface', 0.010, 0.70),
               ('surface-2', -0.040, 1.10), ('line-soft', -0.075, 1.15),
               ('line', -0.122, 1.25), ('line-strong', -0.208, 1.35)],
}


def flaechen_familie(basis, modus):
    """Leitet Hintergrund, Kartenflächen und Trennlinien aus einer Grundfarbe ab."""
    import colorsys
    r, g, b = (v / 255 for v in zu_rgb(basis))
    h, l0, s0 = colorsys.rgb_to_hls(r, g, b)
    familie = {}
    for name, dl, fs in STUFEN[modus]:
        l = max(0.0, min(1.0, l0 + dl))
        s = max(0.0, min(1.0, s0 * fs))
        familie['--' + name] = zu_hex([v * 255 for v in colorsys.hls_to_rgb(h, l, s)])
    return familie


def schrift_familie(grund):
    """Schrifttöne, die zur Grundfarbe passen und sicher lesbar sind.

    Nimmt den Farbton des Hintergrunds leicht auf – reines Grau wirkt auf
    einem farbigen Grund fremd. Danach wird so lange nachgeschoben, bis die
    Kontraste stimmen: 7:1 für den Fliesstext, 4.5:1 fuer die Nebentoene."""
    import colorsys
    h, l_grund, _ = colorsys.rgb_to_hls(*[v / 255 for v in zu_rgb(grund)])
    auf_dunklem = leuchtkraft(zu_rgb(grund)) < 0.5
    richtung = 0.02 if auf_dunklem else -0.02

    def ton(start_l, saettigung, ziel):
        farbe = zu_hex([v * 255 for v in colorsys.hls_to_rgb(h, start_l, saettigung)])
        for _ in range(80):
            if kontrast(farbe, grund) >= ziel:
                break
            farbe = helligkeit(farbe, richtung)
        return farbe

    if auf_dunklem:
        return {'--text':       ton(0.94, 0.16, 12.0),
                '--text-muted': ton(0.68, 0.10, 6.0),
                '--text-dim':   ton(0.55, 0.08, 4.5)}
    return {'--text':       ton(0.09, 0.16, 12.0),
            '--text-muted': ton(0.33, 0.10, 6.0),
            '--text-dim':   ton(0.45, 0.08, 4.5)}



# ── Freitext HTML-sicher machen ───────────────────────────────────
# Nur für Felder, die als sichtbarer Text in die Seite wandern. Werte, die
# zusätzlich im JSON-LD-Block stehen (Stadt, Domain, Name …), dürfen NICHT
# escapet werden – dort wäre &amp; ein Fehler statt einer Korrektur.
FREITEXT = ['UEBER_MICH', 'ZUSATZ_QUALIFIKATION', 'SPRACHEN', 'FIRMENNAME',
            'VERSICHERUNG_NAME', 'VERSICHERUNG_ANSCHRIFT', 'AUSBILDUNGSINSTITUT',
            'STIMME1_ZITAT', 'STIMME1_ZIEL', 'STIMME2_ZITAT', 'STIMME2_ZIEL',
            'STIMME3_ZITAT', 'STIMME3_ZIEL']


def html_sicher(werte):
    for schluessel in FREITEXT:
        if werte.get(schluessel):
            werte[schluessel] = (werte[schluessel]
                                 .replace('&', '&amp;')
                                 .replace('<', '&lt;')
                                 .replace('>', '&gt;'))
    return werte


# ── Nur den passenden Absatz behalten ─────────────────────────────
def variante_waehlen(text, behalten):
    """Löscht alle <p>-Blöcke, die mit '<strong>Variante X' beginnen,
       außer dem gewählten. `marker` ist z. B. 'GitHub Pages'."""
    def ersetze(treffer):
        block = treffer.group(0)
        return block if behalten in block else ''
    muster = re.compile(r'\n?    <p>\s*\n?\s*<strong>Variante [ABC] –.*?</p>\n?', re.S)
    gefunden = muster.findall(text)
    passend = [b for b in gefunden if behalten in b]
    if not passend:
        return text, False
    for block in gefunden:
        if block not in passend:
            text = text.replace(block, '')
    # Beim behaltenen Block die Variantenbezeichnung entfernen
    for block in passend:
        sauber = re.sub(r'<strong>Variante [ABC] – [^:]*:</strong>\s*', '', block)
        text = text.replace(block, sauber)
    return text, True


def main():
    nur_pruefen = '--pruefen' in sys.argv
    d = html_sicher(lies_daten())
    vorlage_bereitstellen()

    fehlend = [k for k in PFLICHT if not d.get(k)]
    if fehlend:
        print('\n⚠  Diese Pflichtfelder sind in daten.txt noch leer:')
        for k in fehlend:
            print('   ·', k)
        if not nur_pruefen:
            print('\nDie Seite wird trotzdem gebaut – die Lücken bleiben sichtbar.\n')

    modus = d.get('FARBMODUS', 'dunkel').strip().lower()
    if modus not in ('dunkel', 'hell'):
        print('   Hinweis: FARBMODUS "%s" unbekannt, dunkel bleibt.' % modus)
        modus = 'dunkel'

    heute = datetime.date.today()
    tel_link = telefon_fuer_links(d.get('TELEFON', ''))

    # Einfache Ersetzungen: Platzhalter -> Wert
    ersetzungen = {
        '‹Stadt›':                   d.get('STADT', ''),
        '‹Nachbarstadt 1›':          d.get('NACHBARSTADT_1', ''),
        '‹Nachbarstadt 2›':          d.get('NACHBARSTADT_2', ''),
        '‹Bundesland›':              d.get('BUNDESLAND', ''),
        '‹Nachname›':                d.get('NACHNAME', ''),
        '‹deine-domain.de›':         d.get('DOMAIN', ''),
        '‹mail@deine-domain.de›':    d.get('EMAIL', ''),
        '‹Telefonnummer ohne 0›':    tel_link,
        '‹0123 456789›':             d.get('TELEFON', ''),
        '‹instagram-name›':          d.get('INSTAGRAM', ''),
        '‹Straße und Hausnummer›':   d.get('STRASSE', ''),
        '‹PLZ›':                     d.get('PLZ', ''),
        '‹DE123456789›':             d.get('UMSATZSTEUER', ''),
        '‹Ausbildungsinstitut›':     d.get('AUSBILDUNGSINSTITUT', ''),
        '‹Jahr›':                    d.get('AUSBILDUNGSJAHR', ''),
        '‹Name der Versicherung›':   d.get('VERSICHERUNG_NAME', ''),
        '‹Anschrift der Versicherung›': d.get('VERSICHERUNG_ANSCHRIFT', ''),
        '‹8›':                       d.get('JAHRE_ERFAHRUNG', ''),
        '‹120›':                     d.get('ANZAHL_KUNDEN', ''),
        '‹75›':                      d.get('PREIS_EINZEL', ''),
        '‹650›':                     d.get('PREIS_10ER_GESAMT', ''),
        '‹65›':                      d.get('PREIS_10ER_PRO_EINHEIT', ''),
        '‹119›':                     d.get('PREIS_ONLINE', ''),
        '‹95›':                      d.get('PREIS_DUO', ''),
        '‹20›':                      d.get('UMKREIS_KM', ''),
        '‹24›':                      d.get('ABSAGE_STUNDEN', ''),
        '‹51.2277›':                 d.get('BREITENGRAD', ''),
        '‹6.7735›':                  d.get('LAENGENGRAD', ''),
        '‹weitere Sprachen›':        d.get('SPRACHEN', ''),
        '‹Monat Jahr›':              '%s %d' % (MONATE[heute.month - 1], heute.year),
    }

    ergebnis = {}
    for rel in DATEIEN:
        text = lies_vorlage(rel)

        # ── Blöcke, die ganz verschwinden ──
        text = re.sub(r'\n?\s*<div class="legal-note">.*?</div>\n?', '\n', text, flags=re.S)
        text = re.sub(r'\n?\s*<h3>‹Nur den zutreffenden Absatz behalten[^›]*›</h3>\n?', '\n', text)
        text = re.sub(r'\n?    <p>\s*\n?\s*<strong>‹Nur den zutreffenden Absatz behalten›</strong>\s*\n?\s*</p>\n?', '\n', text)
        # Anleitungs-Kommentare in robots.txt und sitemap.xml
        text = re.sub(r'^# ‹deine-domain\.de›.*\n', '', text, flags=re.M)
        text = re.sub(r'<!-- ‹deine-domain\.de› durch.*?-->\n?', '', text, flags=re.S)

        # ── Umsatzsteuer: nur eine der beiden Fassungen ──
        if rel == 'impressum.html':
            if d.get('UMSATZSTEUER', '').lower() == 'kleinunternehmer':
                text = re.sub(r'\s*<p>\s*Umsatzsteuer-Identifikationsnummer.*?</p>', '', text, flags=re.S)
                text = text.replace(
                    '<em>Alternative für Kleinunternehmer – dann den Absatz oben löschen:</em><br>\n      ', '')
            else:
                text = re.sub(r'\s*<p>\s*<em>Alternative für Kleinunternehmer.*?</p>', '', text, flags=re.S)
            # Verschachtelter Platzhalter: der äußere umschließt zwei innere,
            # deshalb bis zum doppelten Schlusszeichen matchen.
            institut = d.get('AUSBILDUNGSINSTITUT', '')
            jahr = d.get('AUSBILDUNGSJAHR', '')
            qual = 'Fitnesstrainer/in A- und B-Lizenz'
            if institut:
                qual += ', ausgestellt von ' + institut
                if jahr:
                    qual += ', ' + jahr
            text = re.sub(r'‹z\.&nbsp;B\. Fitnesstrainer.*?››', qual, text, flags=re.S)

            if not d.get('FIRMENNAME'):
                text = re.sub(r'\s*‹Firmenname[^›]*›<br>', '', text)
            else:
                text = re.sub(r'‹Firmenname[^›]*›', d['FIRMENNAME'], text)

        # ── Datenschutz: passende Hosting- und Formular-Variante ──
        if rel == 'datenschutz.html':
            # Wichtig: Die beiden Variantengruppen (Hosting und Formular) stehen
            # beide in dieser Datei. Ohne diese Trennung würde die erste Auswahl
            # auch die Absätze der zweiten Gruppe mit löschen.
            teiler = '<h3>Versand des Kontaktformulars</h3>'
            hosting = {'github': 'GitHub Pages', 'netlify': 'Netlify:',
                       'cloudflare': 'Cloudflare Pages'}.get(d.get('HOSTING', 'github').lower(), 'GitHub Pages')
            formular = {'mailto': 'ohne externen Dienst', 'formspree': 'Formspree:',
                        'netlify': 'Netlify Forms'}.get(d.get('FORMULAR', 'mailto').lower(), 'ohne externen Dienst')
            if teiler in text:
                oben, unten = text.split(teiler, 1)
                oben, ok1 = variante_waehlen(oben, hosting)
                unten, ok2 = variante_waehlen(unten, formular)
                text = oben + teiler + unten
                if not ok1:
                    print('   Hinweis: Hosting-Variante "%s" nicht gefunden.' % hosting)
                if not ok2:
                    print('   Hinweis: Formular-Variante "%s" nicht gefunden.' % formular)
            else:
                print('   Hinweis: Abschnittstrenner nicht gefunden, Varianten bleiben stehen.')

        # ── Freitexte ──
        if rel == 'index.html':
            text = re.sub(r'‹Hier kommen 3–4 Sätze.*?›', d.get('UEBER_MICH', ''), text, flags=re.S)
            text = re.sub(r'‹Ersetze diese drei Zitate.*?›',
                          'Drei von vielen – hier erzählen Kundinnen und Kunden selbst.', text, flags=re.S)
            text = re.sub(r'‹z\.&nbsp;B\. Rückentraining[^›]*›', d.get('ZUSATZ_QUALIFIKATION', ''), text)
            text = re.sub(r'‹Link zum Google-Unternehmensprofil[^›]*›', d.get('GOOGLE_PROFIL_LINK', ''), text)

            # Kundenstimmen der Reihe nach
            for nr in (1, 2, 3):
                zitat = d.get('STIMME%d_ZITAT' % nr, '')
                name  = d.get('STIMME%d_NAME' % nr, '')
                alter = d.get('STIMME%d_ALTER' % nr, '')
                ziel  = d.get('STIMME%d_ZIEL' % nr, '')
                if zitat:
                    text = re.sub(r'‹Echtes Zitat einfügen[^›]*›', zitat.replace('\\', '\\\\'), text, count=1)
                if name:
                    text = re.sub(r'‹Vorname›', name, text, count=1)
                if alter:
                    text = re.sub(r'‹Alter›', alter, text, count=1)
                if ziel:
                    text = re.sub(r'‹Ziel[^›]*›', ziel, text, count=1)

            # Netlify-Formular braucht Zusatzattribute im <form>-Tag
            if d.get('FORMULAR', '').lower() == 'netlify':
                text = text.replace(
                    '<form class="contact-form" id="contactForm" novalidate>',
                    '<form class="contact-form" id="contactForm" name="kontakt" '
                    'data-netlify="true" netlify-honeypot="_gotcha" novalidate>')

        if rel == 'js/main.js' and d.get('FORMULAR', '').lower() == 'formspree':
            text = text.replace("formEndpoint: ''",
                                "formEndpoint: '%s'" % d.get('FORMSPREE_ENDPOINT', ''))

        if rel == 'css/style.css':
            # Buchstabe in der Logo-Kachel folgt dem Markennamen
            anfang = (d.get('MARKENNAME', '').strip() or d.get('VORNAME', '').strip() or 'F')[0].upper()
            text = text.replace('content: "F";', 'content: "%s";' % anfang)

            # Beide Schemata erzeugen, nicht nur das aktive. Sonst würde
            # HINTERGRUND_HELL stillschweigend ignoriert, solange dunkel
            # eingestellt ist – und ein Umschalten liefert Weiß statt Creme.
            gruende = {}
            for m_modus, feld, standard in (('dunkel', 'HINTERGRUND_DUNKEL', '#0A0A0B'),
                                            ('hell',   'HINTERGRUND_HELL',   '#FFFFFF')):
                farbe = d.get(feld, '').strip() or standard
                if not re.fullmatch(r'#[0-9A-Fa-f]{6}', farbe):
                    print('   Hinweis: %s "%s" unbrauchbar, Standard bleibt.' % (feld, farbe))
                    farbe = standard
                gruende[m_modus] = farbe
                if farbe.upper() == standard:
                    continue
                toene = flaechen_familie(farbe, m_modus)
                toene.update(schrift_familie(farbe))
                stelle = text.index(':root[data-farbmodus="hell"]')
                for name, wert in toene.items():
                    muster = r'(?m)^(  %s:\s*)[^;]+;' % re.escape(name)
                    kopf, rest = text[:stelle], text[stelle:]
                    if m_modus == 'hell':
                        text = kopf + re.sub(muster, r'\g<1>%s;' % wert, rest, count=1)
                    else:
                        text = re.sub(muster, r'\g<1>%s;' % wert, kopf, count=1) + rest
                    stelle = text.index(':root[data-farbmodus="hell"]')
                print('   %-6s Grund %s → Schrift %s (%.1f:1) · gedämpft %s (%.1f:1)'
                      % (m_modus, farbe, toene['--text'], kontrast(toene['--text'], farbe),
                         toene['--text-muted'], kontrast(toene['--text-muted'], farbe)))

            # ── Akzent, je Schema eigener Wert ──
            # AKZENTFARBE_DUNKEL/_HELL schlagen AKZENTFARBE. So kann das dunkle
            # Schema grün und das helle gold sein, ohne zwei Stylesheets.
            def akzent_lesen(feld):
                roh = d.get(feld, '').strip()
                wert = PALETTEN.get(roh.lower(), roh)
                if wert and not re.fullmatch(r'#[0-9A-Fa-f]{6}', wert):
                    print('   Hinweis: %s "%s" unbrauchbar, wird übergangen.' % (feld, roh))
                    return ''
                return wert

            grundakzent = akzent_lesen('AKZENTFARBE') or '#FF5C1A'
            akzente = {m: akzent_lesen('AKZENTFARBE_' + m.upper()) or grundakzent
                       for m in ('dunkel', 'hell')}
            wunsch = d.get('SCHRIFT_AUF_BUTTONS', 'automatisch').strip().lower()

            werte = {}
            for m_modus in ('dunkel', 'hell'):
                a = akzente[m_modus]
                auf = {'hell': '#FFFFFF', 'dunkel': '#140904'}.get(wunsch) or schrift_auf_akzent(a)
                if wunsch in ('hell', 'dunkel') and kontrast(auf, a) < 4.5:
                    print('   Achtung: Schrift auf Buttons erreicht im Schema %s nur %.1f:1.'
                          % (m_modus, kontrast(auf, a)))
                werte[m_modus] = (a, text_variante(a, gruende[m_modus]), auf)
                print('   %-6s Akzent %s → als Text %s (%.1f:1) · Schrift darauf %s (%.1f:1)'
                      % (m_modus, a, werte[m_modus][1], kontrast(werte[m_modus][1], gruende[m_modus]),
                         auf, kontrast(auf, a)))

            # Dunkel steht im Grundblock ...
            a, hi, auf = werte['dunkel']
            for name, wert in (('accent', a), ('accent-hi', hi), ('on-accent', auf)):
                text = re.sub(r'(--%s:\s*)#[0-9A-Fa-f]{6};' % name, r'\g<1>%s;' % wert, text, count=1)
            # ... hell wird im zweiten Block überschrieben
            a, hi, auf = werte['hell']
            text = text.replace(':root[data-farbmodus="hell"] {',
                ':root[data-farbmodus="hell"] {\n  --accent:      %s;\n  --accent-hi:   %s;'
                '\n  --on-accent:   %s;' % (a, hi, auf), 1)

        if rel.endswith('.html'):
            # Farbmodus am <html>-Tag verankern
            text = re.sub(r'<html lang="de"[^>]*>', '<html lang="de" data-farbmodus="%s">' % modus, text, count=1)

        if rel == 'sitemap.xml':
            text = re.sub(r'<lastmod>[^<]*</lastmod>',
                          '<lastmod>%s</lastmod>' % heute.isoformat(), text)

        # ── Anzeigename ──
        # "Faruk" steht als Vorgabe fest im Text. Nur die gross geschriebene
        # Form ersetzen, damit img/faruk.svg und der Instagram-Name unberührt
        # bleiben. In den WhatsApp-Adressen muss der Name kodiert werden,
        # sonst zerbricht ein Leerzeichen oder Punkt den Link.
        vorname = d.get('VORNAME', '').strip() or 'Faruk'
        marke = d.get('MARKENNAME', '').strip() or vorname
        if rel.endswith(('.html', '.js')) and (vorname != 'Faruk' or marke != 'Faruk'):
            import urllib.parse
            kodiert = urllib.parse.quote(vorname)
            text = re.sub(r'(wa\.me/[^"\']*?)Faruk', lambda m: m.group(1) + kodiert, text)
            text = re.sub(r'(<span class="brand-text">)Faruk',
                          lambda m: m.group(1) + marke, text)
            text = re.sub(r'(<strong>)Faruk( – Personal Training</strong>)',
                          lambda m: m.group(1) + marke + m.group(2), text)
            text = re.sub(r'\bFaruk\b(?![^<]*</span>)', vorname, text)
            text = text.replace('"name": "%s – Personal Training"' % vorname,
                                '"name": "%s – Personal Training"' % marke)
            text = text.replace('content="%s – Personal Training"' % vorname,
                                'content="%s – Personal Training"' % marke)
            if rel == 'index.html':
                print('   Anzeigename: "%s"%s' % (vorname,
                      ', Marke "%s"' % marke if marke != vorname else ''))

        # ── Zeile unter dem Markennamen ──
        claim = d.get('CLAIM', '').strip()
        if claim and rel.endswith('.html'):
            text = text.replace('<span class="brand-sub">Personal Training</span>',
                                '<span class="brand-sub">%s</span>' % claim)

        # ── Einfache Platzhalter ──
        for platzhalter, wert in ersetzungen.items():
            if wert:
                text = text.replace(platzhalter, wert)

        ergebnis[rel] = text
        if not nur_pruefen:
            open(os.path.join(ZIEL, rel), 'w', encoding='utf-8').write(text)

    # ── Endkontrolle ──
    print('\n' + '─' * 62)
    offen = 0
    for rel in DATEIEN:
        for nr, zeile in enumerate(ergebnis[rel].splitlines(), 1):
            for treffer in re.findall(r'‹[^›]*›', zeile):
                print('  %-20s Zeile %-4d %s' % (rel, nr, treffer[:52]))
                offen += 1
    if offen:
        print('─' * 62)
        print('%d Stelle(n) noch offen – oben stehen Datei und Zeile.' % offen)
        if nur_pruefen:
            print('(Prüfmodus – es wurde nichts geschrieben.)')
    else:
        print('  ✓ Keine Platzhalter mehr. Die Seite ist bereit.')
        print('─' * 62)


if __name__ == '__main__':
    main()
