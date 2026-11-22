import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import { createWallet } from "../services/walletService";
import {
  createUserProfile,
  claimPhoneNumber,
  getErrorMessage
} from "../services/profileService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // undefined = still loading, null = no profile document, object = loaded
  const [profile, setProfile] = useState(undefined);
  // Same idea for the wallet: undefined = loading, null = none yet
  const [wallet, setWallet] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(undefined);
        setWallet(undefined);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Live copy of users/{uid}: name, phone, hasPin update everywhere instantly.
  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      (error) => {
        console.error("Profile listener failed:", error);
        setProfile(null);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  // Live balance: updates the moment money is sent to you or you cash in.
  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsubscribe = onSnapshot(
      doc(db, "wallets", user.uid),
      (snap) => {
        if (snap.exists()) {
          setWallet({ id: snap.id, ...snap.data() });
          return;
        }

        setWallet(null);

        // First time we see this user: give them an empty wallet.
        createWallet(user.uid).catch((error) => {
          console.error("Could not create wallet:", error);
        });
      },
      (error) => {
        console.error("Wallet listener failed:", error);
        setWallet(null);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const register = async (name, email, password, phone = "") => {
    const result = await createUserWithEmailAndPassword(
      auth, email, password
    );

    await updateProfile(result.user, {
      displayName: name
    });

    // The account exists now. If saving the extra details fails, we still
    // let the person in and tell them what to fix from the Profile page.
    let setupError = "";

    try {
      await createUserProfile({
        uid: result.user.uid,
        name,
        email
      });

      if (phone) {
        await claimPhoneNumber(phone);
      }
    } catch (err) {
      setupError = phone
        ? `Account created, but your number was not saved: ${getErrorMessage(err)} You can add it from your profile.`
        : getErrorMessage(err);
    }

    return { user: result.user, setupError };
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        profileLoading: Boolean(user) && profile === undefined,
        loading,
        register,
        login,
        logout
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
