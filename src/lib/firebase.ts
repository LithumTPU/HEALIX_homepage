import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAefgeoFaztmjsTm56W2LZchavUC8hDY_o",  
  authDomain: "healthbot-e8438.firebaseapp.com",
  databaseURL: "https://healthbot-e8438-default-rtdb.firebaseio.com",
  projectId: "healthbot-e8438",
  storageBucket: "healthbot-e8438.appspot.com",
  messagingSenderId: "555833461576",
  appId: "1:555833461576:web:45f802862d25a33b49017d",
  measurementId: "G-EDG9PFW99H"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
