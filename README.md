# ⚽ JDR Games — CYBERFC 28 2.0 (Ultimate Team 3D)

Oficjalne repozytorium platformy gier **JDR Games** z flagowym projektem **CYBERFC 28 2.0** — zaawansowanym symulatorem piłki nożnej 3D klasy AAA dla przeglądarek internetowych.

🔗 **Zagraj na żywo w przeglądarce:**
- **Strona główna JDR Games:** [https://jdrgames.pl/](https://jdrgames.pl/)
- **CYBERFC 28 2.0 (Wersja główna):** [https://jdrgames.pl/fc28/](https://jdrgames.pl/fc28/)
- **CYBERFC 28 2.0 (Ścieżka bezpośrednia 2.0):** [https://jdrgames.pl/fc28-2.0/](https://jdrgames.pl/fc28-2.0/)
- **GitHub Pages domyślne:** [https://lukeprawko.github.io/fc8/](https://lukeprawko.github.io/fc8/)

---

## 🌟 Najważniejsze Systemy Gry

1. **Nowoczesny Dashboard EA FC 28 Ultimate Team**:
   - Szklany interfejs (*glassmorphism*, `backdrop-filter: blur(32px)`).
   - Globalny pasek nawigacji: Monety 🪙, Skład, Sklep z Paczkami, Ranking, Kod Zapisu i Profil Konta.
   - Prezentacja składu wyjściowego z prawdziwymi portretami 95 piłkarzy, OVR i stylami PlayStyle+.

2. **Czysty Ekran Meczowy & Inteligentne Przełączanie Zawodników**:
   - Usunięto zbędne nakładki interfejsu (brak bocznych pasków i dolnego zasłaniacza) — na ekranie widać wyłącznie boisko 3D, piłkę, zawodników, nazwiska nad głowami oraz wynik.
   - Klawisze <kbd>Spacja</kbd>, <kbd>Tab</kbd>, <kbd>Q</kbd> w obronie oraz środkowy przycisk myszy przełączają Cię **zawsze na zawodnika znajdującego się najbliżej piłki** (lub drugiego najbliższego przy asekuracji).
   - Automatyczne przejęcie kontroli nad zawodnikiem przyjmującym podanie.

3. **Kinowe Otwieranie Paczek (FUT Pack Opening & Walkout)**:
   - Pełnoekranowy silnik fizyki cząsteczkowej konfetti (ponad 200 wirujących w 3D metalicznych płatków złotej i neonowej folii).
   - Gwałtowne drżenie paczki z laserowym rozcięciem zgrzewu.
   - Elitarna sekwencja Walkoutu (dla kart 87+ oraz Ikon 90+) z flagą narodowości, plakietką pozycji, wybuchowym banerem i postumentem 3D.

4. **Autentyczna Baza 95 Piłkarzy**:
   - Prawdziwe zdjęcia zawodników w formacie `.webp` (m.in. Haaland, Mbappé, Messi, Ronaldo, De Bruyne, Bellingham, Van Dijk, Courtois, Pelé, Yashin, Cruyff, R9, Zidane).
   - 25 oficjalnych stylów gry PlayStyle+ (Power Shot+, Finesse Shot+, Incisive Pass+, Rapid Step+, Intercept Wall+ itd.).

5. **Silnik Fizyki Balistycznej i Kinematyki**:
   - Efekt Magnusa (podkręcanie rogali i triveli).
   - Odbicia od słupków, poprzeczek i interwencji bramkarzy.
   - Płynne, zwinne przyspieszenie bez opóźnień i bez efektu ślizgania się po lodzie.

6. **Chmura i Multiplayer P2P**:
   - Autoryzacja i zapis chmurowy przez Cloudflare Workers & D1.
   - Tryb gościa z jednorazowym kodem transferu danych (`FC28_...`).
   - Szybki matchmaking online, prywatne pokoje kodem oraz Lobby 2v2.

---

## 🎮 Sterowanie

```
[RUCH]:                     W, A, S, D  (lub ruch kursorem myszy po włączeniu trybu M)
[SPRINT]:                   Lewy Shift
[ZASTAWKA (OSŁONA)]:        Spacja (gdy masz piłkę - zużywa staminę)
[STRZAŁ]:                   Lewy Przycisk Myszy (przytrzymaj dla siły strzału)
[PODANIE PO ZIEMI]:         Prawy Przycisk Myszy (przytrzymaj dla siły podania)
[PODANIE GÓRĄ / LOB]:       Klawisz Q (przy piłce)
[WYPUSZCZENIE PIŁKI]:       Klawisz E (knock-on sprint)
[ZWODY PIŁKARSKIE]:         Klawisze F, C, V, X, Z (lub cyfry 1, 2, 3, 4)
[WŚLIZG]:                   Prawy Przycisk Myszy (w obronie)
[ODBIÓR NA STOJĄCO]:        Lewy Przycisk Myszy (w obronie)
[PRZEŁĄCZ ZAWODNIKA]:       Spacja / Tab / Q (zawsze przełącza na najbliższego piłki!)
```

---

## 🛠️ Architektura Nowej Generacji (Folder `fc28 2.0`)

Modułowa wersja w folderze `fc28 2.0` zawiera:
- **TypeScript & Three.js**: Pełna obiektowa architektura silnika renderowania i fizyki.
- **Vitest**: 14 automatycznych testów jednostkowych i integracyjnych uruchamianych w GitHub Actions.
- **Cloudflare D1 SQL Schema**: Schemat bazy danych dla kont, składów, historii meczów i tabeli wyników.
- **Autorytatywny Pokój Serwera**: Obsługa ticków 60 Hz i walidacji ruchów sieciowych.

---

## 🚀 CI/CD & GitHub Actions

Każdy push do gałęzi `main` automatycznie:
1. Uruchamia testy jednostkowe (`npm test` w `fc28 2.0`).
2. Skanuje repozytorium pod kątem bezpieczeństwa (`gitleaks`).
3. Buduje i wdraża całą witrynę na **GitHub Pages** pod domeną **[jdrgames.pl](https://jdrgames.pl)**.
