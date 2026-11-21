import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

const TRANSACTION_TYPES = [
  "send_money",
  "mobile_recharge",
  "cash_out",
  "cash_in",
  "payment"
];

export async function saveTransaction({
  userId,
  type,
  recipient = "",
  phone = "",
  merchant = "",
  merchantNumber = "",
  amount,
  reference = ""
}) {
  const currentUser = auth.currentUser;

  // Authentication check
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error("Please login with your account first.");
  }

  // Transaction type check
  if (!TRANSACTION_TYPES.includes(type)) {
    throw new Error("Invalid transaction type.");
  }

  // Amount validation
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid transaction amount.");
  }

  // Transaction data
  const transactionData = {
    userId: currentUser.uid,
    type,
    amount: numericAmount,
    currency: "BDT",

    recipient,
    phone,

    merchant,
    merchantNumber,

    reference,

    status: "SUBMITTED",
    fraudStatus: "PENDING",

    source: "NextPay Web",
    createdAt: serverTimestamp()
  };

  // Save to Firestore
  const docRef = await addDoc(
    collection(db, "transactions"),
    transactionData
  );

  return {
    id: docRef.id,
    ...transactionData
  };
}
