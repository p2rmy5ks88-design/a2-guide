# Svea Fastigheter

Den svenska utgåvan av Eko Estates: ett fastighetsspel i 3D för mobil och surfplatta, spelat i liggande läge.

- **Fem städer**: Stockholm (med fem miljöer) samt Göteborg, Malmö, Linköping och Uppsala, som låses upp med prestationer.
- **Allt på svenska**: kort, regler, prestationer, dagliga uppdrag, Lyckohjulet och Sverigequizet. Priser i kronor (Mkr/mdkr).
- **Spelare**: 2–6 per spel, som människor på samma telefon eller AI-hyresvärdar (Lätt, Normal, Svår).

## Filer

| Fil | Syfte |
| --- | --- |
| `game.html` | Källan. Redigera den här. |
| `index.html` | Fristående sida som byggs från `game.html` med `python3 build.py`. |

Stadsradion använder låtarna i `../eko-estates/audio/fm/`.

## Onlinespel (Firebase Realtime Database)

Webblänken spelar online via samma Firebase-projekt som Eko Estates. Inställningarna hämtas från `../eko-estates/firebase-config.js`, så ingen extra konfiguration behövs.

- Spelare loggas in anonymt i bakgrunden, utan konto eller e-post.
- Svea-spel hålls isär från Eko-spel: lobbyer har statusen `lobby-sv` och taggen `ed: 'sv'`, och inloggningen sparas separat (`sveaFbAuth`). Svea visar bara svenska spel i listan och Eko visar aldrig dem.
- **Bjud in vänner** i lobbyn delar en länk som `…/svea-fastigheter/?join=KOD`.
- Som artefakt i claude.ai används claude.ai:s inbyggda lagring i stället.
