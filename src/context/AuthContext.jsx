
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";

import { auth } from "../firebase/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(
      auth, email, password
    );

    await updateProfile(result.user, {
      displayName: name
    });
    
    return result.user;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, logout }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
