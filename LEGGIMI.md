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
| `gioco/` | Il gioco pubblicato (`index.html`, tutto incluso) |
| `sorgenti/` | I file da cui si costruisce il gioco: `src/*.js`, `src/index.html`, `build.py`, strumenti per preparare le immagini |

## Aggiornare il gioco
1. Modificare i file in `sorgenti/src/`.
2. `cd sorgenti && python3 build.py` → crea `dist/index.html`; copiarlo in `gioco/index.html`.
3. Caricare su GitHub (`main`): Cloudflare Pages pubblica da solo in circa un minuto.

I salvataggi (crediti, garage, pilota) restano nel browser di chi gioca.

## Per riprendere con Claude
Collega il repository stiledigitale/za-street-racers e scrivi: *"Questo è il mio gioco ZA STREET RACERS. Leggi LEGGIMI.md e continuiamo da qui."*

