# Pickr Praesentation

## Kurzidee

Pickr hilft Gruppen, schnell Entscheidungen zu treffen.
Statt lange im Chat zu diskutieren, erstellt eine Person einen Raum, alle geben Ideen ein und Pickr fuehrt die Gruppe zu einem Ergebnis.

## Problem

Viele kleine Entscheidungen dauern in Gruppen unverhaeltnismaessig lange:

- Was essen wir?
- Was schauen wir?
- Was machen wir heute?
- Wer muss zahlen, Getraenke holen, aufraeumen ...?

Pickr macht daraus einen kurzen gemeinsamen Ablauf.

## Loesung

1. Raum erstellen
2. Code oder QR-Code teilen
3. Ideen sammeln
4. Modus waehlen
5. Ergebnis bekommen

Der Fokus liegt auf Tempo, wenig Einstiegshuerden und einer spielerischen Bedienung.

## Funktionen

- Raumcode statt Account
- Beitritt per Link, QR-Code oder Code
- vier Gruppen-Modi: Swipe, Zufallsrad, Mehrheit, Battle
- Solo-Tools ganz ohne Raum: Fingerwahl ("Wer muss...?") und Muenzwurf
- lokaler Verlauf der letzten Entscheidungen
- Einstellungen zum Zuruecksetzen/Loeschen lokaler Daten

## Demo-Ablauf

1. Startseite mit Pickr-Logo-Animation zeigen
2. Raum erstellen
3. Zweite Person per QR-Code/Link beitreten lassen
4. Ideen eingeben
5. Modus waehlen und Pick starten
6. Ergebnis zeigen, danach im Verlauf wiederfinden
7. Kurz die Solo-Tools zeigen (Fingerwahl, Muenzwurf) - funktionieren ganz ohne Raum

## Technik

- Reines HTML/CSS/JavaScript, kein Build-Tool, kein Framework
- Supabase (REST-API per fetch) fuer die gemeinsamen Raeume
- LocalStorage fuer Session, Verlauf und Einstellungen
- QR-Code ueber einen externen Bild-Dienst, kein JS-Paket noetig
- Live-Sync per Polling (jede Sekunde neu laden), bewusst keine WebSockets

## Vortrag zu fuenft

Fuenf natuerliche Themenbloecke, je etwa 2 Minuten. Wer welchen Teil uebernimmt, sucht ihr euch selbst aus - jeder Block steht fuer sich und laesst sich direkt an einer eigenen Seite/Datei zeigen.

**Idee & Problem**
Worum geht's bei Pickr, welches Problem loest die App. Kurzer Blick auf die Startseite mit der Logo-Animation.

**Raum erstellen & beitreten**
`erstellen.html` und `beitreten.html` zeigen: das Formular, und dass doppelt eingetragene Ideen (z.B. zweimal "Pizza") automatisch zusammengefasst werden. QR-Code/Link zum Beitreten erklaeren.

**Der Raum (Lobby)**
`raum.html`: Teilnehmerliste, Bereit-System, Modus auswaehlen. Schoen zu zeigen: sobald der Host startet, landen alle automatisch in der Abstimmung - keiner muss extra klicken.

**Die Spielmodi**
`entscheiden.html`: Swipe zum Ziehen (wie bei Tinder), das echte Glücksrad, Mehrheits-Abstimmung, Battle. Hier lohnt sich eine kurze Live-Runde.

**Technik & Extras**
Wie die Daten gespeichert werden (`api.js`, einfache fetch-Aufrufe gegen die Datenbank, Live-Sync per Polling), plus die Solo-Tools, den Verlauf und die Einstellungen kurz zeigen.

## Hinweis

Pickr ist ein DHBW-Projekt und ein Projekt von SHMT.
Die App ist fuer die Praesentation und Demonstration gedacht, nicht als kommerzielles Produktivsystem.
