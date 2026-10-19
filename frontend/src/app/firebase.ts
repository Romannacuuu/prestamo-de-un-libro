import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyByeAVb1_l0mekQAIhUX1FVTmKMhqChZSc',
  authDomain: 'prestamo-principito-rom.firebaseapp.com',
  projectId: 'prestamo-principito-rom',
  storageBucket: 'prestamo-principito-rom.firebasestorage.app',
  messagingSenderId: '375736110472',
  appId: '1:375736110472:web:0849df10f2824498827e3d',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const appAlta = initializeApp(firebaseConfig, 'alta');
export const authAlta = getAuth(appAlta);
export const dbAlta = getFirestore(appAlta);
