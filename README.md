# Centrum kryzysowe

Prototyp aplikacji dla operatora centrum kryzysowego na zawodach sportowych (biegi, triathlon, wyścigi rowerowe). Operator szybko rejestruje zgłoszenia z trasy, prowadzi listę DNF dla sędziego i koordynuje samochody SAG, a po zawodach eksportuje raport dla organizatora.

**Wersja online:** https://bleys80.github.io/centrum-kryzysowe/

## Dane

Aplikacja jest w pełni statyczna. Nie ma kont, backendu ani bazy w chmurze. Wszystkie dane zostają w przeglądarce operatora i w pliku kopii na jego dysku. W tym repozytorium jest wyłącznie kod i fikcyjne dane demo. Zawodnika identyfikuje tylko numer startowy.

## Uruchomienie

Wymaga Node.js 22+ oraz Chrome lub Edge.

```
cd aplikacja
npm install
npm run dev      # serwer deweloperski
npm test         # testy jednostkowe (Vitest)
npm run e2e      # testy end-to-end w Chrome i Edge (Playwright)
npm run build    # wersja produkcyjna w aplikacja/dist
```

## Stos

Vite, React, TypeScript. Wdrożenie na GitHub Pages przez GitHub Actions.
