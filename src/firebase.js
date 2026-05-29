import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  where,
} from "firebase/firestore";

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

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function playerTagFromUid(uid) {
  return String(uid || "").slice(0, 8).toLowerCase();
}

function friendshipIdFor(firstUid, secondUid) {
  return [firstUid, secondUid].sort().join("_");
}

function publicProfileFromUser(user, progress = {}) {
  const displayName = user.displayName || "Player";
  const playerTag = playerTagFromUid(user.uid);

  return {
    uid: user.uid,
    displayName,
    displayNameLower: normalizeSearchText(displayName),
    playerTag,
    playerTagLower: playerTag,
    photoURL: user.photoURL || null,
    highScore: Math.max(0, Math.floor(progress.highScore || 0)),
    updatedAt: serverTimestamp(),
  };
}

function requestSummary(userOrProfile) {
  return {
    uid: userOrProfile.uid,
    displayName: userOrProfile.displayName || "Player",
    photoURL: userOrProfile.photoURL || null,
    playerTag: userOrProfile.playerTag || playerTagFromUid(userOrProfile.uid),
  };
}

export async function getUserProgress(userId) {
  const progressRef = doc(db, "players", userId);
  const snapshot = await getDoc(progressRef);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserRun(user, runInput) {
  if (!user) return null;

  const safeScore = Math.max(0, Math.floor(typeof runInput === "number" ? runInput : runInput?.score || 0));
  const safeRunCoins = Math.max(0, Math.floor(typeof runInput === "number" ? 0 : runInput?.runCoins || 0));
  const progressRef = doc(db, "players", user.uid);
  const nextProgress = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(progressRef);
    const previousProgress = snapshot.exists() ? snapshot.data() : {};
    const nextHighScore = Math.max(previousProgress.highScore || 0, safeScore);
    const nextGamesPlayed = (previousProgress.gamesPlayed || 0) + 1;
    const nextCoins = (previousProgress.coins || 0) + safeRunCoins;
    const nextTotalCoins = (previousProgress.totalCoins || 0) + safeRunCoins;

    const progress = {
      displayName: user.displayName || "Player",
      email: user.email || null,
      highScore: nextHighScore,
      lastScore: safeScore,
      gamesPlayed: nextGamesPlayed,
      coins: nextCoins,
      totalCoins: nextTotalCoins,
      lastRunCoins: safeRunCoins,
      updatedAt: serverTimestamp(),
    };

    transaction.set(progressRef, progress, { merge: true });
    return { ...progress, updatedAt: null };
  });

  await upsertPublicProfile(user, nextProgress);
  return nextProgress;
}

export async function syncLocalHighScore(user, highScore) {
  return syncLocalProgress(user, { highScore });
}

export async function syncLocalProgress(user, localProgress = {}) {
  if (!user) return null;

  const safeHighScore = Math.max(0, Math.floor(localProgress.highScore || 0));
  const safeLastScore = Math.max(0, Math.floor(localProgress.lastScore || 0));
  const safeGamesPlayed = Math.max(0, Math.floor(localProgress.gamesPlayed || 0));
  const safeCoins = Math.max(0, Math.floor(localProgress.coins || 0));
  const safeTotalCoins = Math.max(0, Math.floor(localProgress.totalCoins || safeCoins));
  const safeLastRunCoins = Math.max(0, Math.floor(localProgress.lastRunCoins || 0));
  const progressRef = doc(db, "players", user.uid);
  const nextProgress = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(progressRef);
    const previousProgress = snapshot.exists() ? snapshot.data() : {};
    const progress = {
      displayName: user.displayName || "Player",
      email: user.email || null,
      highScore: Math.max(previousProgress.highScore || 0, safeHighScore),
      lastScore: previousProgress.lastScore || safeLastScore,
      gamesPlayed: Math.max(previousProgress.gamesPlayed || 0, safeGamesPlayed),
      coins: Math.max(previousProgress.coins || 0, safeCoins),
      totalCoins: Math.max(previousProgress.totalCoins || 0, safeTotalCoins),
      lastRunCoins: previousProgress.lastRunCoins || safeLastRunCoins,
      updatedAt: serverTimestamp(),
    };

    transaction.set(progressRef, progress, { merge: true });
    return { ...progress, updatedAt: null };
  });

  await upsertPublicProfile(user, nextProgress);
  return nextProgress;
}

export async function upsertPublicProfile(user, progress = {}) {
  if (!user) return null;

  const publicProfile = publicProfileFromUser(user, progress);
  await setDoc(doc(db, "publicProfiles", user.uid), publicProfile, { merge: true });
  return { ...publicProfile, updatedAt: null };
}

export async function searchPlayers(term, currentUid) {
  const searchTerm = normalizeSearchText(term);
  if (!currentUid || searchTerm.length < 2) return [];

  const profilesRef = collection(db, "publicProfiles");
  const searchQuery = searchTerm.startsWith("@")
    ? query(profilesRef, where("playerTagLower", "==", searchTerm.slice(1)), limit(8))
    : query(profilesRef, orderBy("displayNameLower"), startAt(searchTerm), endAt(`${searchTerm}\uf8ff`), limit(8));

  const snapshot = await getDocs(searchQuery);
  return snapshot.docs
    .map((profileDoc) => profileDoc.data())
    .filter((profile) => profile.uid !== currentUid);
}

export async function getFriendRequestState(currentUid, targetUid) {
  if (!currentUid || !targetUid) return { status: "none" };

  const friendshipSnapshot = await getDoc(doc(db, "friendships", friendshipIdFor(currentUid, targetUid)));
  if (friendshipSnapshot.exists()) return { status: "friends" };

  const outgoingSnapshot = await getDoc(doc(db, "friendRequests", `${currentUid}_${targetUid}`));
  if (outgoingSnapshot.exists()) {
    return { status: outgoingSnapshot.data().status || "pending", direction: "outgoing" };
  }

  const incomingSnapshot = await getDoc(doc(db, "friendRequests", `${targetUid}_${currentUid}`));
  if (incomingSnapshot.exists()) {
    return { status: incomingSnapshot.data().status || "pending", direction: "incoming" };
  }

  return { status: "none" };
}

export async function sendFriendRequest(currentUser, targetProfile) {
  if (!currentUser) throw new Error("Sign in to send friend requests.");
  if (!targetProfile?.uid || targetProfile.uid === currentUser.uid) {
    throw new Error("Choose another player to add.");
  }

  const requestRef = doc(db, "friendRequests", `${currentUser.uid}_${targetProfile.uid}`);
  const reverseRequestRef = doc(db, "friendRequests", `${targetProfile.uid}_${currentUser.uid}`);
  const friendshipRef = doc(db, "friendships", friendshipIdFor(currentUser.uid, targetProfile.uid));

  await runTransaction(db, async (transaction) => {
    const [friendshipSnapshot, requestSnapshot, reverseSnapshot] = await Promise.all([
      transaction.get(friendshipRef),
      transaction.get(requestRef),
      transaction.get(reverseRequestRef),
    ]);

    if (friendshipSnapshot.exists()) throw new Error("You are already friends.");
    if (requestSnapshot.exists() && requestSnapshot.data().status === "pending") {
      throw new Error("Friend request already sent.");
    }
    if (reverseSnapshot.exists() && reverseSnapshot.data().status === "pending") {
      throw new Error("This player already sent you a request.");
    }

    transaction.set(requestRef, {
      fromUid: currentUser.uid,
      toUid: targetProfile.uid,
      status: "pending",
      fromDisplayName: currentUser.displayName || "Player",
      fromPhotoURL: currentUser.photoURL || null,
      toDisplayName: targetProfile.displayName || "Player",
      toPhotoURL: targetProfile.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return { id: `${currentUser.uid}_${targetProfile.uid}`, status: "pending" };
}

export function listenForIncomingFriendRequests(uid, callback) {
  if (!uid) return () => {};

  const requestQuery = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid)
  );

  return onSnapshot(requestQuery, (snapshot) => {
    const requests = snapshot.docs
      .map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }))
      .filter((request) => request.status === "pending")
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(requests);
  });
}

export async function respondToFriendRequest(requestId, response) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Sign in to respond to friend requests.");
  if (!["accepted", "declined"].includes(response)) throw new Error("Invalid friend request response.");

  const requestRef = doc(db, "friendRequests", requestId);

  return runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) throw new Error("Friend request no longer exists.");

    const request = requestSnapshot.data();
    if (request.toUid !== currentUser.uid) throw new Error("Only the receiver can respond.");
    if (request.status !== "pending") throw new Error("Friend request already handled.");

    transaction.set(requestRef, { status: response, updatedAt: serverTimestamp() }, { merge: true });

    if (response === "accepted") {
      const friendshipRef = doc(db, "friendships", friendshipIdFor(request.fromUid, request.toUid));
      transaction.set(friendshipRef, {
        members: [request.fromUid, request.toUid],
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        memberSummaries: {
          [request.fromUid]: {
            uid: request.fromUid,
            displayName: request.fromDisplayName || "Player",
            photoURL: request.fromPhotoURL || null,
          },
          [request.toUid]: {
            uid: request.toUid,
            displayName: request.toDisplayName || currentUser.displayName || "Player",
            photoURL: request.toPhotoURL || currentUser.photoURL || null,
          },
        },
      });
    }

    return { id: requestId, status: response };
  });
}
