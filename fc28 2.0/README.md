# CYBERFC 28 — NEXT-GEN 3D FOOTBALL SIMULATION ENGINE (v2.0)

Pełnoprawna, wysokiej jakości gra piłkarska 3D klasy AAA dla przeglądarek internetowych, zbudowana na architekturze modularnej z wykorzystaniem **TypeScript**, **Three.js**, **Rapier3D**, **Colyseus / WebSockets** oraz chmury **Cloudflare Workers / D1**.

---

## 🌟 Główne Cechy & Architektura

1. **Grafika & Środowisko 3D (`src/rendering/` & `src/stadium/`)**:
   - Autorski silnik renderowania perspektywicznego z PCFSoftShadowMap i ACESFilmicToneMapping.
   - Trójwymiarowa murawa Premier League w 20 pasów koszenia z generatorem szorstkości i pasów.
   - Bramki 3D (słupki, poprzeczki, stelaż, siatki reagujące na gole).
   - Dynamiczna kamera transmisyjna (Broadcast TV) z płynnym śledzeniem akcji i wstrząsem przy bramkach.

2. **Fizyka Piłki & Zawodników (`src/physics/`)**:
   - Trójwymiarowa trajektoria balistyczna z efektem Magnusa (podkręcanie rogali i triveli).
   - Sprężyste odbicia od słupków, poprzeczek i interwencji bramkarzy.
   - Płynna inercja i responsywne zwroty bez ślizgania się po lodzie.

3. **Modele i Rigging Piłkarzy (`src/players/`)**:
   - Trójwymiarowe modele zawodników z podziałem na tors, głowę, ramiona, nogi i buty.
   - Dynamiczna kinematyka biegu, sprintu, zwodów i zastawiania piłki.
   - **95 autentycznych kart piłkarzy** z realnymi zdjęciami `.webp`.

4. **Ultimate Team & Ekonomia (`src/ultimate-team/`)**:
   - `CardDatabase`: Baza 95 oficjalnych kart (m.in. Pelé, Yashin, Haaland, Mbappé, De Bruyne, Van Dijk).
   - `ChemistrySystem`: Matematyczny model zgrania (do 33/33) uwzględniający pozycję, narodowość i synergię Ikon.
   - `PackSystem`: 3 tiery paczek (Standardowa 100 🪙, Premium 250 🪙, Ultimate 500 🪙) z oficjalnymi drop rate'ami i skupem duplikatów.
   - `SquadManager`: Zapisywanie składu, portfel monet, synchronizacja z chmurą.

5. **Multiplayer & Serwer Autorytatywny (`server/` & `src/multiplayer/`)**:
   - `MatchRoom`: Serwerowy pokój meczowy z autorytatywnym tickiem 60 Hz i sprawdzaniem goli.
   - `Matchmaker`: Kolejkowanie i dobieranie graczy 1v1 oraz 2v2.
   - `schema.sql`: Produkcyjna baza danych Cloudflare D1 (konta, kluby, historia meczów, ranking).

6. **Konta & Bezpieczeństwo (`src/services/`)**:
   - Rejestracja, logowanie i synchronizacja sesji przez Cloudflare Workers.
   - Tryb Gościa oraz generowanie/przywracanie unikalnych kodów transferu danych (`FC28_...`).

---

## 🚀 Uruchomienie i Rozwój

### Wymagania:
- Node.js v18+ (zalecany v20+)
- npm v9+

### Instalacja zależności:
```bash
npm install
```

### Uruchomienie środowiska deweloperskiego (Vite):
```bash
npm run dev
```

### Uruchomienie testów jednostkowych i integracyjnych (Vitest):
```bash
npm test
```

### Budowa wersji produkcyjnej:
```bash
npm run build
```

---

## 📁 Struktura Katalogów

```
fc28 2.0/
├── public/
│   └── assets/              # Prawdziwe zdjęcia zawodników (.webp) i ikony stylów
├── src/
│   ├── core/
│   │   ├── Engine.ts        # Główny koordynator gry
│   │   ├── GameLoop.ts      # Pętla 60 Hz z interpolacją renderowania
│   │   └── EventBus.ts      # Typowana szyna zdarzeń
│   ├── rendering/
│   │   ├── Renderer.ts      # Konfiguracja WebGL / Three.js
│   │   └── CameraController.ts # Kamera transmisyjna
│   ├── stadium/
│   │   └── Pitch.ts         # Murawa, pasy, linie, bramki 3D
│   ├── physics/
│   │   └── BallPhysics.ts   # Fizyka piłki (Magnus, odbicia, opór)
│   ├── players/
│   │   ├── PlayerModel.ts   # Modele 3D, stroje, animacje biegu
│   │   └── PlayerEntity.ts  # Kinematyka, kondycja, sterowanie
│   ├── ultimate-team/
│   │   ├── PlayerCard.ts    # Typy kart i definicje PlayStyle+
│   │   ├── CardDatabase.ts  # Baza 95 oficjalnych kart
│   │   ├── ChemistrySystem.ts # Obliczanie zgrania (33/33)
│   │   ├── PackSystem.ts    # Sklep i losowanie paczek
│   │   └── SquadManager.ts  # Zarządzanie klubem i monetami
│   ├── services/
│   │   └── AccountService.ts # API kont i transfer postępów
│   └── main.ts              # Entrypoint aplikacji
├── server/
│   ├── rooms/
│   │   └── MatchRoom.ts     # Autorytatywny serwer meczowy
│   ├── matchmaking/
│   │   └── Matchmaker.ts    # Dobieranie przeciwników
│   └── database/
│       └── schema.sql       # Schemat Cloudflare D1
└── tests/
    ├── unit/                # Testy kart, chemii, paczek, fizyki
    └── multiplayer/         # Testy serwera, pokoi i matchmakingu
```
