# Notes Board App – REST API

REST API for an application where users share notes (sticky notes) on shared boards.

Built with Express 5, Prisma (PostgreSQL), Zod and JWT.

This is one of three parts of the Notes Board App:

- [authn-authz](https://github.com/appelosc/authn-authz): authentication API that issues the JWTs
- **REST-api-notes** (this repo): boards and notes API
- [notes-frontend](https://github.com/appelosc/notes-frontend): React and TypeScript frontend

## Getting started

### Environment variables

Create a `.env` file in the project root:

| Variable       | Description                                                   |
| -------------- | ------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string (used by Prisma)                 |
| `JWT_SECRET`   | Secret used to verify JWTs                                    |
| `PORT`         | Port the server listens on (default `3001`, `3000` in Docker) |
| `MODE`         | `development` runs with nodemon, otherwise `npm start`        |
| `DEV_TOKEN`    | (optional) JWT used by the `.http` test files                 |

### Run with Docker

```bash
docker compose up --build
```

The API is then available at `http://localhost:3002`.

### Run locally

```bash
npm install
npx prisma generate
npm run dev     # nodemon
# or
npm start
```

## Authentication

All endpoints under `/boards` and `/notes` require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is verified with `JWT_SECRET`. The user's id is read from the token's `sub` claim.

An invalid or missing token returns:

```json
// 401 Unauthorized
{ "message": "Authorization failed", "error": "<error message>" }
```

## Authorization

- A user has access to a board if the user's id is in the board's `userIds`.
- Everyone with access to a board can read, create, update and delete notes on it.

## Data models

### Board

```json
{
  "id": 1,
  "name": "My board",
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
  "note": "Set the table",
  "color": "green",
  "position": { "x": 100, "y": 100 },
  "created_at": "2026-01-01T12:00:00.000Z",
  "updated_at": "2026-01-01T12:00:00.000Z"
}
```

`color` must be one of: `yellow`, `blue`, `red`, `green`, `orange`.

## Endpoints

| Method   | Path                  | Description                         |
| -------- | --------------------- | ----------------------------------- |
| `GET`    | `/`                   | Health check                        |
| `GET`    | `/boards`             | Get the boards the user can access  |
| `GET`    | `/notes/:boardId`     | Get all notes on a board            |
| `POST`   | `/notes`              | Create a note                       |
| `PUT`    | `/notes/:boardId/:id` | Replace a note                      |
| `PATCH`  | `/notes/:boardId/:id` | Update parts of a note              |
| `DELETE` | `/notes/:boardId/:id` | Delete a note                       |

---

### `GET /`

No authentication required.

**Response `200`**

```json
{ "msg": "Frotend API" }
```

---

### `GET /boards`

Returns all boards where the user is in `userIds`.

**Response `200`**: an array of [Board](#board).

---

### `GET /notes/:boardId`

Returns all notes on the board.

| Status | Reason                                                |
| ------ | ----------------------------------------------------- |
| `200`  | Array of [Note](#note)                                |
| `400`  | `boardId` is not an integer                           |
| `404`  | The board does not exist or the user has no access    |

---

### `POST /notes`

Creates a note. The logged-in user becomes the author.

**Body**

```json
{
  "boardId": 2,
  "note": "Set the table",
  "color": "green",
  "position": { "x": 100, "y": 100 }
}
```

All fields are required.

**Response `201`**

```json
{
  "message": "Note created succesfully",
  "note": { /* Note */ }
}
```

| Status | Reason                                  |
| ------ | --------------------------------------- |
| `400`  | Validation error (see [Errors](#errors)) |
| `403`  | The user has no access to the board     |
| `404`  | The board does not exist                |

---

### `PUT /notes/:boardId/:id`

Replaces a note. `note`, `color` and `position` are required.

**Body**

```json
{
  "note": "Boil the crayfish",
  "color": "red",
  "position": { "x": 200, "y": 150 }
}
```

**Response `200`**: the updated [Note](#note).

| Status | Reason                                                           |
| ------ | ---------------------------------------------------------------- |
| `400`  | Invalid `id` or validation error                                 |
| `403`  | The user has no access to the board                              |
| `404`  | The board does not exist, or the note does not exist on the board |

---

### `PATCH /notes/:boardId/:id`

Updates selected fields. Same fields as `PUT`, but all are optional.

**Body**

```json
{
  "note": "Boil the crayfish for 30 minutes",
  "color": "red"
}
```

**Response `200`**: the updated [Note](#note).

Error codes as for `PUT`.

---

### `DELETE /notes/:boardId/:id`

Deletes a note. Everyone with access to the board can delete its notes.

**Response `200`**

```json
{
  "message": "Note deleted successfully",
  "note": { /* deleted Note */ }
}
```

| Status | Reason                                                           |
| ------ | ---------------------------------------------------------------- |
| `400`  | Invalid `id`                                                     |
| `403`  | The user has no access to the board                              |
| `404`  | The board does not exist, or the note does not exist on the board |

## Errors

Validation errors (`400`) return Zod's issues:

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

Other errors return `{ "message": "..." }`. Unexpected errors return `500` with `{ "message": "Internal server error" }`.

## Testing

`src/tests/*.http` contains example requests for the VS Code extension REST Client. Set `DEV_TOKEN` in `.env`.

## CORS

Allowed origins: `http://localhost:5173`, `https://people.arcada.fi`, `http://people.arcada.fi`.
