// firebaseConfig.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBjLjwe9T4iTMDSQ-OJyEV73RkYDZ7BAAc',
  authDomain: 'pingme-58b20.firebaseapp.com',
  projectId: 'pingme-58b20',
  storageBucket: 'pingme-58b20.appspot.com',
  messagingSenderId: '140525205614',
  appId: '1:140525205614:android:ad565e29a729a5ee03ce7f',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
