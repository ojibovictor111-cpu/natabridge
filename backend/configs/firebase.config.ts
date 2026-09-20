import type { ServiceAccount } from "firebase-admin/app";
import { cert, getApps, initializeApp } from "firebase-admin/app";

const getFirebaseApp = () => {
    const existing = getApps().find((app) => app.name === "[DEFAULT]");
    if (existing) return existing;

    const serviceAccount: ServiceAccount = {
        clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")!,
        projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID!
    };

    return initializeApp({ credential: cert(serviceAccount) });
};

export { getFirebaseApp };
