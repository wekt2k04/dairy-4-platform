# Firebase and Auth Handover

## What is wired now

- Backend writes unified prediction documents to Firestore collection `predictions`.
- Frontend login is **Mock/Demo** only.
- Dashboard can read the latest prediction by ID from route state or Firestore.

## Firestore setup

1. Create a Firebase project.
2. Enable Firestore in production mode.
3. Create a service account and download the JSON key for the backend.
4. Set these environment variables on the droplet:
   - `FIREBASE_PROJECT_ID`
   - `GOOGLE_APPLICATION_CREDENTIALS`
5. Point `GOOGLE_APPLICATION_CREDENTIALS` to the service-account JSON inside the container or host filesystem.

## Security rules

The backend uses the Admin SDK, so Firestore rules do not restrict backend writes. Keep client access narrow:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /predictions/{predictionId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

If the frontend must read by prediction ID without user sign-in, move that read behind a backend route instead of opening the collection.

## Replacing Mock/Demo auth later

1. Replace `/api/auth/mock-login` with Firebase Authentication verification.
2. Send Firebase ID tokens from the frontend.
3. Verify the token in FastAPI before issuing any session or API access.
4. Keep the auth label in the UI until the mock flow is fully removed.

## Recommended production shape

- Frontend uses Firebase Auth.
- Backend verifies ID tokens on every protected route.
- Firestore receives prediction records only from the backend Admin SDK.
