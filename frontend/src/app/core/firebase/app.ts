import { FirebaseOptions, initializeApp } from 'firebase/app';

const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDOPx9o0GoNdqBGUmtE1xJ1D0cnb0MLJ54',
  authDomain: 'natabridge-cf0da.firebaseapp.com',
  projectId: 'natabridge-cf0da',
  storageBucket: 'natabridge-cf0da.firebasestorage.app',
  messagingSenderId: '259973865355',
  appId: '1:259973865355:web:8644c604bfc439b5f7198e',
  measurementId: 'G-F7N0CGPQDE',
};

const app = initializeApp(firebaseConfig);

export { app };
