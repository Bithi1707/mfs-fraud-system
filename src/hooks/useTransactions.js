import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../firebase/firebase";

export function transactionTime(item) {
  // A brand-new transaction has no server time yet: treat it as "now".
  return item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now();
}

// Live list of every transaction the user sent, made, or received (newest first).
export function useTransactions(uid) {
  const [made, setMade] = useState(null);
  const [received, setReceived] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return undefined;

    const toList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const handleError = (setter) => (err) => {
      console.error("Transactions listener failed:", err);
      setError("Could not load transactions.");
      setter([]);
    };

    const stopMade = onSnapshot(
      query(collection(db, "transactions"), where("userId", "==", uid)),
      (snap) => setMade(toList(snap)),
      handleError(setMade)
    );

    const stopReceived = onSnapshot(
      query(collection(db, "transactions"), where("receiverId", "==", uid)),
      (snap) => setReceived(toList(snap)),
      handleError(setReceived)
    );

    return () => {
      stopMade();
      stopReceived();
    };
  }, [uid]);

  const transactions = useMemo(() => {
    const byId = new Map();

    [...(made || []), ...(received || [])].forEach((item) => {
      byId.set(item.id, item);
    });

    return [...byId.values()].sort(
      (a, b) => transactionTime(b) - transactionTime(a)
    );
  }, [made, received]);

  return {
    transactions,
    loading: made === null || received === null,
    error
  };
}
