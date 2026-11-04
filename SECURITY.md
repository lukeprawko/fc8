# Bezpieczeństwo projektu NOVA

## Firestore

Reguły z firestore.rules ograniczają odczyt i zapis profilu do właściciela konta. Pola administratora są chronione przed zmianą przez zwykłe konto. Administratora nadaje się ręcznie w Firebase Console, ustawiając players/{uid}.isAdmin na true. Klienci nie mogą zmieniać tego pola.

Po weryfikacji projektu wdroż reguły poleceniem PowerShell: firebase deploy --only firestore:rules

Samo dodanie pliku reguł do repozytorium nie zmienia konfiguracji działającego projektu Firebase.

## Token GitHub

Token PAT, który wcześniej znajdował się w plikach projektu, mógł zostać sklonowany lub zapisany w historii Git. Unieważnij go w ustawieniach GitHub. Usunięcie go z bieżących plików nie usuwa kopii z historii commitów.

Uploader zapisuje teraz token w lokalnym profilu Windows w postaci chronionej przez DPAPI. Nie umieszczaj tokenów w repozytorium.