#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trägt alle Daten aus daten.txt in die Website ein.

    python3 setup.py             schreibt die Dateien
    python3 setup.py --pruefen   zeigt nur, was noch fehlt

Beim ersten Lauf wird eine unveränderte Kopie der Vorlagen unter .vorlage/
abgelegt. Jeder weitere Lauf beginnt wieder dort – das Skript kann also
beliebig oft laufen, ohne dass sich Ersetzungen aufschaukeln.
"""

import os, re, shutil, sys, datetime

BASIS   = os.path.dirname(os.path.abspath(__file__))
VORLAGE = os.path.join(BASIS, '.vorlage')
DATEIEN = ['index.html', 'impressum.html', 'datenschutz.html', '404.html',
           'robots.txt', 'sitemap.xml', 'js/main.js']

MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
          'August', 'September', 'Oktober', 'November', 'Dezember']

PFLICHT = ['NACHNAME', 'STADT', 'DOMAIN', 'EMAIL', 'TELEFON', 'STRASSE', 'PLZ',
           'BUNDESLAND', 'JAHRE_ERFAHRUNG', 'ANZAHL_KUNDEN', 'PREIS_EINZEL',
           'PREIS_10ER_GESAMT', 'PREIS_10ER_PRO_EINHEIT', 'PREIS_ONLINE',
           'PREIS_DUO', 'UEBER_MICH', 'BREITENGRAD', 'LAENGENGRAD']


# ── daten.txt einlesen ────────────────────────────────────────────
def lies_daten():
    pfad = os.path.join(BASIS, 'daten.txt')
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
    if not os.path.isdir(VORLAGE):
        os.makedirs(VORLAGE)
        for rel in DATEIEN:
            ziel = os.path.join(VORLAGE, rel)
            os.makedirs(os.path.dirname(ziel), exist_ok=True)
            shutil.copy2(os.path.join(BASIS, rel), ziel)
        print('Vorlagen gesichert unter .vorlage/')


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

        if rel == 'sitemap.xml':
            text = re.sub(r'<lastmod>[^<]*</lastmod>',
                          '<lastmod>%s</lastmod>' % heute.isoformat(), text)

        # ── Einfache Platzhalter ──
        for platzhalter, wert in ersetzungen.items():
            if wert:
                text = text.replace(platzhalter, wert)

        ergebnis[rel] = text
        if not nur_pruefen:
            open(os.path.join(BASIS, rel), 'w', encoding='utf-8').write(text)

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
