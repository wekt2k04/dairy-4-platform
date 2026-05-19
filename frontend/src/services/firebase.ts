import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import type { DashboardState } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;

export function getFirebaseApp() {
  if (app) {
    return app;
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return undefined;
  }

  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseServices() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  return {
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export async function getPredictionById(predictionId: string): Promise<DashboardState | null> {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const predictionRef = doc(services.firestore, 'predictions', predictionId);
  const snapshot = await getDoc(predictionRef);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Omit<DashboardState, 'prediction_id' | 'source'>;
  return {
    prediction_id: predictionId,
    ...data,
    source: 'firestore',
  };
}
