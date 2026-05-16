# Adding New Features

## Backend rules

1. Add a Pydantic schema first.
2. Put orchestration logic in `backend/services/`.
3. Keep routes thin in `backend/api/`.
4. Persist Firestore writes only through the service layer.
5. Never make vision a hard dependency for health or production.

## Frontend rules

1. Add the TypeScript contract in `frontend/src/types.ts`.
2. Add or update the API wrapper in `frontend/src/services/api.ts`.
3. Pass data into pages and components through props or route state.
4. Do not reintroduce `localStorage` for simulation state.
5. Keep each dashboard block independent so one missing block does not break the others.

## Safe extension pattern

- **New API route**
  - schema
  - service function
  - router registration
  - frontend wrapper
  - UI consumer

- **New dashboard block**
  - add the response field
  - extend the TypeScript type
  - render the block conditionally if the data is optional

## Inference contract rules

- Health and production must still work if vision is absent.
- Model artifacts stay under `backend/models/weights/`.
- Use explicit fallback behavior when a model file is missing.
- Keep the unified prediction document backward compatible when adding new fields.

## Firestore rules

- The backend is the source of truth for prediction writes.
- Client reads should be read-only and narrow.
- Prefer adding a backend read endpoint before widening Firestore access.
