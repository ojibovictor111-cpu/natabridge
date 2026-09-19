import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const getFirebaseAuth = () => {
     const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
     const app = getApps().find((candidate) => candidate.name === "[DEFAULT]") ?? initializeApp({
          credential: serviceAccountJson
               ? cert(JSON.parse(serviceAccountJson) as ServiceAccount)
               : applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID || "natabridge-cf0da"
     });

     return getAuth(app);
};

export { getFirebaseAuth };
