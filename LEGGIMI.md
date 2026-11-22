# ZA STREET RACERS — drag racing arcade (HTML5 Canvas 2D)

Gioco di Christian / Stile Digitale. Un solo file `gioco/index.html` (grafica compresa), 16:9 orizzontale, pensato per telefono, 5 lingue.

## Dove sta tutto (stesso schema di ZA DEMOLITION)
| Cosa | Dove |
|---|---|
| Codice | GitHub **stiledigitale/za-street-racers** (branch `main`) |
| Gioco online | **Cloudflare Pages** (account Stile Digitale), progetto `za-street-racers`, cartella pubblicata `gioco`, nessun comando di build → https://za-street-racers.pages.dev |

## Cartelle
| Cartella | Cosa contiene |
|---|---|
| `gioco/` | Il gioco pubblicato (`index.html` con tutta la grafica, `lib/supabase.js` per il multiplayer) |
| `sorgenti/` | I file da cui si costruisce il gioco: `src/*.js`, `src/index.html`, `build.py`, strumenti per preparare le immagini |

## Aggiornare il gioco
1. Modificare i file in `sorgenti/src/`.
2. `cd sorgenti && python3 build.py` → crea `dist/index.html`; copiarlo in `gioco/index.html`.
3. Caricare su GitHub (`main`): Cloudflare Pages pubblica da solo in circa un minuto.

I salvataggi (crediti, garage, pilota) restano nel browser di chi gioca.

## Per riprendere con Claude
Collega il repository stiledigitale/za-street-racers e scrivi: *"Questo è il mio gioco ZA STREET RACERS. Leggi LEGGIMI.md e continuiamo da qui."*

## Multiplayer online (2-4 piloti)
Come Tactical Racing Simulator: **Supabase Realtime**, progetto `stiledigitale_games` (stessa chiave publishable di TRS), nessun server da mantenere e nessuna tabella. Codice in `sorgenti/src/net.js` e in fondo a `game.js` (sezione "multiplayer online").
- **Menu → ONLINE**: *Sfida a 2* o *Sfida a 4* (canali `zsr-quick2` / `zsr-quick4`: quando ci sono abbastanza piloti che cercano, chi cerca da più tempo forma il gruppo e la gara parte da sola) oppure *Crea stanza* (codice di 5 lettere, senza I e O) / *Entra* con il codice. *Invita* copia o condivide il link `?room=CODICE`: aprendolo si entra direttamente nella stanza.
- Stanza = canale `zsr-room-CODICE`; presence con nome, pilota, auto e aspetto. Il primo arrivato crea la gara e preme **VIA!** (servono almeno 2 piloti). Massimo 4; non si entra in una gara in corso.
- Corsie libere **vuote** (niente CPU). Corsie uguali su tutti i telefoni, in ordine di stanza (il primo in basso); in due le corsie centrali; i nomi dei piloti compaiono dietro le auto prima del via.
- Ognuno simula solo la propria auto e manda posizione e tempo di gara 20 volte al secondo. Gli avversari si disegnano dove erano allo STESSO tempo di gara del giocatore (ognuno parte dal suo verde): chi è davanti sullo schermo è chi è davanti nei tempi, anche con il ritardo della rete. Chi esce durante la gara si ferma ("ha lasciato la gara").
- Fine gara: crediti come la gara veloce, **Torna alla stanza** per la rivincita.
- Prove: `?net=local` simula la rete tra le schede dello stesso browser. Nell'artefatto di claude.ai il multiplayer non funziona (solo sul sito).

## Classifica online e piloti collegati (22/11/2026)
- Tabella Supabase `zsr_times` (progetto stiledigitale_games) e vista `zsr_best` con il miglior tempo di ogni pilota.
- Il tempo va in classifica a fine gara veloce o online, sulla distanza della pista (Zona industriale 402 m, Lago di Garda 804 m); le gare contro CPU in carriera no.
- Pulsante "Classifica online" nel menu (al posto di Regole), con le schede delle due piste e i primi 20.
- In alto a destra, sotto lo schermo intero, il numero dei piloti collegati (presence sul canale `zsr-online`).
- Inoltre: scalate dopo il traguardo, zona verde più stretta a ogni marcia, classi di potenziamento (Serie, Sport, Pro, Élite) usate dalla partita veloce online, potenziamenti più cari (500 / 1200 / 2500).
