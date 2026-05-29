import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();

export const auth = getAuth(app);
export const db = getFirestore(app);

export function listenForAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export async function getUserProgress(userId) {
  const progressRef = doc(db, "players", userId);
  const snapshot = await getDoc(progressRef);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserRun(user, score) {
  if (!user) return null;

  const safeScore = Math.max(0, Math.floor(score));
  const progressRef = doc(db, "players", user.uid);
  const snapshot = await getDoc(progressRef);
  const previousProgress = snapshot.exists() ? snapshot.data() : {};
  const previousHighScore = previousProgress.highScore || 0;
  const previousGamesPlayed = previousProgress.gamesPlayed || 0;
  const nextHighScore = Math.max(previousHighScore, safeScore);
  const nextGamesPlayed = previousGamesPlayed + 1;

  await setDoc(
    progressRef,
    {
      displayName: user.displayName || "Player",
      email: user.email || null,
      highScore: nextHighScore,
      lastScore: safeScore,
      gamesPlayed: nextGamesPlayed,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { highScore: nextHighScore, lastScore: safeScore, gamesPlayed: nextGamesPlayed };
}

export async function syncLocalHighScore(user, highScore) {
  if (!user || !highScore) return null;

  const safeHighScore = Math.max(0, Math.floor(highScore));
  const progressRef = doc(db, "players", user.uid);
  const snapshot = await getDoc(progressRef);
  const previousHighScore = snapshot.exists() ? snapshot.data().highScore || 0 : 0;
  const nextHighScore = Math.max(previousHighScore, safeHighScore);

  await setDoc(
    progressRef,
    {
      displayName: user.displayName || "Player",
      email: user.email || null,
      highScore: nextHighScore,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { highScore: nextHighScore };
}
