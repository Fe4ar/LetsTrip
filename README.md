# LetsTrip 🌍

Kollaborative Reiseplanung für Teams und Gruppen — vollständig selbst gehostet via Docker Compose.

## Schnellstart

```bash
# 1. Repository klonen oder Projektordner öffnen
cd letstrip

# 2. Umgebungsvariablen anlegen
cp .env.example .env

# 3. App starten
docker compose up -d

# 4. Im Browser öffnen
open http://localhost:8500
```

Das war's! Die App ist nach ca. 30–60 Sekunden erreichbar.

---

## Demo-Zugänge

| Rolle | E-Mail | Passwort |
|---|---|---|
| Administrator | admin@letstrip.local | Admin123! |
| Teamleiter | lead@letstrip.local | Lead123! |
| Reisender | traveler@letstrip.local | Travel123! |

---

## Ports

| Dienst | Port |
|---|---|
| Web-Oberfläche | **8500** |
| Backend API (intern) | 8000 |
| PostgreSQL (intern) | 5432 |

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI (Python 3.12) |
| Datenbank | PostgreSQL 16 |
| Karte | Leaflet + OpenStreetMap (CartoDB Dark) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM (öffentliche Demo-API) |
| Reverse Proxy | Nginx |
| Container | Docker Compose |

---

## Rollen & Berechtigungen

| Berechtigung | Admin | Teamleiter | Reisender |
|---|:---:|:---:|:---:|
| Benutzer verwalten | ✅ | ❌ | ❌ |
| Reisen erstellen | ✅ | ✅ | ❌ |
| Mitglieder hinzufügen | ✅ | ✅ | ❌ |
| Reisedaten bearbeiten | ✅ | ✅ | ✅ |
| Ausgaben erfassen | ✅ | ✅ | ✅ |

---

## Funktionen

- 🗺️ **Karte** — Orte suchen (via Nominatim), Tagen zuweisen, Autorouten berechnen (via OSRM)
- 📋 **Liste** — Alle Orte pro Tag strukturiert anzeigen und bearbeiten
- 📅 **Buchungen** — Unterkunft, Flüge, Mietwagen, sonstige Reservierungen
- 💰 **Budget** — Ausgaben erfassen, gleichmäßig auf Personen aufteilen, Donut-Chart nach Kategorie
- 📁 **Dateien** — PDFs, Bilder und Dokumente hochladen (max. 50 MB)
- 👥 **Collab** — Mitglieder verwalten, Aktivitätsprotokoll

---

## Karten & Routing

- **Kartenansicht**: OpenStreetMap via CartoDB Dark Tiles (kein API-Key nötig)
- **Geocoding**: Nominatim public API — bei starker Nutzung eigene Instanz empfohlen
- **Routing**: OSRM Demo-Server (router.project-osrm.org) — für Produktion eigene Instanz empfohlen:
  ```yaml
  # docker-compose.yml erweitern:
  osrm:
    image: osrm/osrm-backend
    # weitere Konfiguration nach OSRM-Dokumentation
  ```

---

## Datenspeicherung

- **Datenbank**: PostgreSQL-Daten in Docker Volume `postgres_data`
- **Dateien**: Uploads in Docker Volume `uploads_data`
- **Backups**: `docker exec letstrip-db pg_dump -U letstrip letstrip > backup.sql`

---

## Konfiguration (.env)

```env
POSTGRES_DB=letstrip
POSTGRES_USER=letstrip
POSTGRES_PASSWORD=sicheres_passwort_hier
SECRET_KEY=langer_zufaelliger_string_hier
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

## Dienste stoppen / neu starten

```bash
# Stoppen
docker compose down

# Stoppen + Daten löschen (Vorsicht!)
docker compose down -v

# Logs anzeigen
docker compose logs -f backend

# Rebuild
docker compose up -d --build
```
