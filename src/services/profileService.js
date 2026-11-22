import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile
} from "firebase/auth";

import { auth, db } from "../firebase/firebase";

export const PHONE_REGEX = /^01[3-9]\d{8}$/;
export const PIN_LENGTH = 5;
export const PIN_REGEX = new RegExp(`^\\d{${PIN_LENGTH}}$`);

const PBKDF2_ITERATIONS = 150000;

/* ---------------------------------------------------------- */
/* Helpers                                                    */
/* ---------------------------------------------------------- */

function requireUser() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please login first.");
  }

  return currentUser;
}

// Turns Firebase error codes into short, readable messages.
export function getErrorMessage(err) {
  switch (err?.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/weak-password":
      return "New password must be at least 6 characters.";
    case "auth/requires-recent-login":
      return "Please logout and login again, then retry.";
    case "auth/network-request-failed":
    case "unavailable":
      return "Network problem. Check your connection and try again.";
    case "permission-denied":
      return "Firebase blocked this save. Publish the latest firestore.rules in Firebase Console (Firestore Database > Rules), then try again.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
}

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derivePinHash(pin, salt, iterations) {
  if (!window.crypto?.subtle) {
    throw new Error("PIN needs a secure page (HTTPS or localhost).");
  }

  const key = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );

  return toBase64(new Uint8Array(bits));
}

function assertStrongPin(pin) {
  if (!PIN_REGEX.test(pin)) {
    throw new Error(`PIN must be exactly ${PIN_LENGTH} digits.`);
  }

  const allSame = /^(\d)\1+$/.test(pin);
  const sequence = "01234567890123456789".includes(pin) ||
    "98765432109876543210".includes(pin);

  if (allSame || sequence) {
    throw new Error("PIN is too easy to guess. Choose a different one.");
  }
}

async function reauthenticate(password) {
  const currentUser = requireUser();

  if (!password) {
    throw new Error("Enter your account password.");
  }

  const credential = EmailAuthProvider.credential(
    currentUser.email,
    password
  );

  await reauthenticateWithCredential(currentUser, credential);
}

/* ---------------------------------------------------------- */
/* Profile document                                           */
/* ---------------------------------------------------------- */

export async function createUserProfile({ uid, name, email }) {
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    phone: null,
    hasPin: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateName(name) {
  const currentUser = requireUser();
  const cleanName = name.trim().replace(/\s+/g, " ");

  if (cleanName.length < 2) {
    throw new Error("Name must be at least 2 characters.");
  }

  await setDoc(
    doc(db, "users", currentUser.uid),
    {
      name: cleanName,
      email: currentUser.email || "",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  // Keep Firebase Auth's display name in sync too.
  await updateProfile(currentUser, { displayName: cleanName });
}

/* ---------------------------------------------------------- */
/* Mobile number (one-time, permanent)                        */
/* ---------------------------------------------------------- */

// Saves the number on the user's profile AND reserves it in
// phoneNumbers/{number}, so no two accounts can share a number.
// Once saved, it can never be changed (also enforced by firestore.rules).
export async function claimPhoneNumber(phone) {
  const currentUser = requireUser();

  if (!PHONE_REGEX.test(phone)) {
    throw new Error("Enter a valid Bangladesh mobile number (01XXXXXXXXX).");
  }

  const userRef = doc(db, "users", currentUser.uid);
  const phoneRef = doc(db, "phoneNumbers", phone);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      const phoneSnap = await tx.get(phoneRef);

      if (userSnap.exists() && userSnap.data().phone) {
        throw new Error(
          "Your mobile number is already saved and cannot be changed."
        );
      }

      if (phoneSnap.exists()) {
        throw new Error("This number is already linked to another account.");
      }

      tx.set(phoneRef, {
        uid: currentUser.uid,
        createdAt: serverTimestamp()
      });

      if (userSnap.exists()) {
        tx.update(userRef, {
          phone,
          updatedAt: serverTimestamp()
        });
      } else {
        // Accounts created before profiles existed have no user document yet.
        tx.set(userRef, {
          name: currentUser.displayName || "",
          email: currentUser.email || "",
          phone,
          hasPin: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    });
  } catch (err) {
    if (err?.code === "permission-denied") {
      throw new Error(
        "Firebase blocked saving this number. Publish the latest firestore.rules in Firebase Console (Firestore Database > Rules), then try again.",
        { cause: err }
      );
    }

    throw err;
  }
}

/* ---------------------------------------------------------- */
/* Transaction PIN (stored as a salted hash, never plain text) */
/* ---------------------------------------------------------- */

export async function savePin(pin) {
  const currentUser = requireUser();
  assertStrongPin(pin);

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(pin, salt, PBKDF2_ITERATIONS);

  const batch = writeBatch(db);

  batch.set(doc(db, "pins", currentUser.uid), {
    hash,
    salt: toBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    updatedAt: serverTimestamp()
  });

  batch.set(
    doc(db, "users", currentUser.uid),
    { hasPin: true, updatedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();
}

export async function verifyPin(pin) {
  const currentUser = requireUser();
  const snap = await getDoc(doc(db, "pins", currentUser.uid));

  if (!snap.exists()) {
    return false;
  }

  const { hash, salt, iterations } = snap.data();
  const attempt = await derivePinHash(pin, fromBase64(salt), iterations);

  return attempt === hash;
}

export async function changePin({ currentPin, newPin }) {
  if (!PIN_REGEX.test(currentPin)) {
    throw new Error("Enter your current PIN.");
  }

  const correct = await verifyPin(currentPin);

  if (!correct) {
    throw new Error("Current PIN is incorrect.");
  }

  await savePin(newPin);
}

// "Forgot PIN": prove it's really the owner by re-entering the account password.
export async function resetPinWithPassword({ password, newPin }) {
  await reauthenticate(password);
  await savePin(newPin);
}

/* ---------------------------------------------------------- */
/* Password                                                   */
/* ---------------------------------------------------------- */

export async function changePassword({ currentPassword, newPassword }) {
  const currentUser = requireUser();

  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  await reauthenticate(currentPassword);
  await updatePassword(currentUser, newPassword);
}
