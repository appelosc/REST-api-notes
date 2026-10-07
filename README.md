# REST-api-notes

REST-API för en applikation där användare delar anteckningar (post-it-lappar) på gemensamma tavlor (boards).

Byggt med Express 5, Prisma (PostgreSQL), Zod och JWT.

## Kom igång

### Miljövariabler

Skapa en `.env` i projektroten:

| Variabel       | Beskrivning                                              |
| -------------- | -------------------------------------------------------- |
| `DATABASE_URL` | Anslutningssträng till PostgreSQL (används av Prisma)    |
| `JWT_SECRET`   | Hemlighet för att verifiera JWT-tokens                   |
| `PORT`         | Port servern lyssnar på (standard `3001`, `3000` i Docker) |
| `MODE`         | `development` kör med nodemon, annars `npm start`        |
| `DEV_TOKEN`    | (valfri) JWT som används av `.http`-testfilerna          |

### Köra med Docker

```bash
docker compose up --build
```

API:et nås då på `http://localhost:3002`.

### Köra lokalt

```bash
npm install
npx prisma generate
npm run dev     # nodemon
# eller
npm start
```

## Autentisering

Alla endpoints under `/boards` och `/notes` kräver en JWT i `Authorization`-headern:

```
Authorization: Bearer <token>
```

Token verifieras med `JWT_SECRET`. Användarens id läses från tokenets `sub`-claim.

Ogiltig eller saknad token ger:

```json
// 401 Unauthorized
{ "message": "Authorization failed", "error": "<felmeddelande>" }
```

## Behörighet

- En användare har åtkomst till en tavla om användarens id finns i tavlans `userIds`.
- Alla med åtkomst till en tavla kan läsa, skapa, uppdatera och ta bort anteckningar på den.

## Datamodeller

### Board

```json
{
  "id": 1,
  "name": "Min tavla",
  "userIds": ["1", "2"],
  "created_at": "2026-01-01T12:00:00.000Z",
  "updated_at": "2026-01-01T12:00:00.000Z"
}
```

### Note

```json
{
  "id": 1,
  "author_id": 1,
  "boardId": 1,
  "note": "Duka bordet",
  "color": "green",
  "position": { "x": 100, "y": 100 },
  "created_at": "2026-01-01T12:00:00.000Z",
  "updated_at": "2026-01-01T12:00:00.000Z"
}
```

`color` måste vara en av: `yellow`, `blue`, `red`, `green`, `orange`.

## Endpoints

| Metod    | Sökväg                   | Beskrivning                                   |
| -------- | ------------------------ | --------------------------------------------- |
| `GET`    | `/`                      | Hälsokontroll                                 |
| `GET`    | `/boards`                | Hämta tavlor användaren har åtkomst till      |
| `GET`    | `/notes/:boardId`        | Hämta alla anteckningar på en tavla           |
| `POST`   | `/notes`                 | Skapa en anteckning                           |
| `PUT`    | `/notes/:boardId/:id`    | Ersätt en anteckning                          |
| `PATCH`  | `/notes/:boardId/:id`    | Uppdatera delar av en anteckning              |
| `DELETE` | `/notes/:boardId/:id`    | Ta bort en anteckning                         |

---

### `GET /`

Ingen autentisering krävs.

**Svar `200`**

```json
{ "msg": "Frotend API" }
```

---

### `GET /boards`

Returnerar alla tavlor där användaren finns i `userIds`.

**Svar `200`** – en array av [Board](#board).

---

### `GET /notes/:boardId`

Returnerar alla anteckningar på tavlan.

| Status | Orsak                                              |
| ------ | -------------------------------------------------- |
| `200`  | Array av [Note](#note)                             |
| `400`  | `boardId` är inte ett heltal                       |
| `404`  | Tavlan finns inte eller användaren saknar åtkomst  |

---

### `POST /notes`

Skapar en anteckning. Den inloggade användaren blir författare.

**Body**

```json
{
  "boardId": 2,
  "note": "Duka bordet",
  "color": "green",
  "position": { "x": 100, "y": 100 }
}
```

Alla fält är obligatoriska.

**Svar `201`**

```json
{
  "message": "Note created succesfully",
  "note": { /* Note */ }
}
```

| Status | Orsak                                |
| ------ | ------------------------------------ |
| `400`  | Valideringsfel (se [Fel](#fel))      |
| `403`  | Användaren saknar åtkomst till tavlan |
| `404`  | Tavlan finns inte                    |

---

### `PUT /notes/:boardId/:id`

Ersätter en anteckning. `note`, `color` och `position` är obligatoriska.

**Body**

```json
{
  "note": "Koka kräftor",
  "color": "red",
  "position": { "x": 200, "y": 150 }
}
```

**Svar `200`** – den uppdaterade [Note](#note).

| Status | Orsak                                                 |
| ------ | ----------------------------------------------------- |
| `400`  | Ogiltigt `id` eller valideringsfel                    |
| `403`  | Användaren saknar åtkomst till tavlan                 |
| `404`  | Tavlan finns inte, eller anteckningen finns inte på tavlan |

---

### `PATCH /notes/:boardId/:id`

Uppdaterar valda fält. Samma fält som `PUT`, men alla är valfria.

**Body**

```json
{
  "note": "Koka kräftor i 30 minuter",
  "color": "red"
}
```

**Svar `200`** – den uppdaterade [Note](#note).

Felkoder som för `PUT`.

---

### `DELETE /notes/:boardId/:id`

Tar bort en anteckning. Alla med åtkomst till tavlan kan ta bort dess anteckningar.

**Svar `200`**

```json
{
  "message": "Note deleted successfully",
  "note": { /* borttagen Note */ }
}
```

| Status | Orsak                                                                 |
| ------ | --------------------------------------------------------------------- |
| `400`  | Ogiltigt `id`                                                         |
| `403`  | Användaren saknar åtkomst till tavlan                                 |
| `404`  | Tavlan finns inte eller anteckningen finns inte på tavlan             |

## Fel

Valideringsfel (`400`) returnerar Zods issues:

```json
{
  "error": [
    {
      "code": "invalid_value",
      "path": ["color"],
      "message": "Invalid option: expected one of \"yellow\"|\"blue\"|\"red\"|\"green\"|\"orange\""
    }
  ]
}
```

Övriga fel returnerar `{ "message": "..." }`. Oväntade fel ger `500` med `{ "message": "Internal server error" }`.

## Testa

`src/tests/*.http` innehåller exempelanrop för VS Code-tillägget REST Client. Sätt `DEV_TOKEN` i `.env`.

## CORS

Tillåtna origins: `http://localhost:5173`, `https://people.arcada.fi`, `http://people.arcada.fi`.
