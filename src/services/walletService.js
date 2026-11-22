import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import { PHONE_REGEX, PIN_REGEX, verifyPin } from "./profileService";

export const CASH_IN_MAX_AMOUNT = 15000;
export const CASH_IN_DAILY_LIMIT = 3;

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

// "Today" always means today in Bangladesh (UTC+6), written as 20261122.
export function dhakaDayKey(date = new Date()) {
  const shifted = new Date(date.getTime() + 6 * 60 * 60 * 1000);

  return (
    shifted.getUTCFullYear() * 10000 +
    (shifted.getUTCMonth() + 1) * 100 +
    shifted.getUTCDate()
  );
}

function emptyWallet() {
  return { balance: 0, cashInDay: 0, cashInCount: 0 };
}

function parseAmount(value) {
  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Enter a whole amount of at least ৳1.");
  }

  return amount;
}

/* ---------------------------------------------------------- */
/* Wallet                                                     */
/* ---------------------------------------------------------- */

// Creates the empty wallet (balance 0) the first time a user is seen.
export async function createWallet(uid) {
  await setDoc(doc(db, "wallets", uid), {
    ...emptyWallet(),
    updatedAt: serverTimestamp()
  });
}

/* ---------------------------------------------------------- */
/* Cash In                                                    */
/* ---------------------------------------------------------- */

export async function cashIn(amountInput) {
  const currentUser = requireUser();
  const amount = parseAmount(amountInput);

  if (amount > CASH_IN_MAX_AMOUNT) {
    throw new Error(
      `You can cash in up to ৳${CASH_IN_MAX_AMOUNT.toLocaleString("en-US")} at a time.`
    );
  }

  const walletRef = doc(db, "wallets", currentUser.uid);
  const txRef = doc(collection(db, "transactions"));
  const today = dhakaDayKey();

  return runTransaction(db, async (tx) => {
    const walletSnap = await tx.get(walletRef);
    const wallet = { ...emptyWallet(), ...(walletSnap.exists() ? walletSnap.data() : {}) };

    const countToday = wallet.cashInDay === today ? wallet.cashInCount : 0;

    if (countToday >= CASH_IN_DAILY_LIMIT) {
      throw new Error(
        `Daily limit reached. You can cash in ${CASH_IN_DAILY_LIMIT} times per day. Try again tomorrow.`
      );
    }

    const newBalance = wallet.balance + amount;

    tx.set(txRef, {
      userId: currentUser.uid,
      type: "cash_in",
      amount,
      currency: "BDT",
      reference: "Cash In",
      oldBalanceOrg: wallet.balance,
      newBalanceOrig: newBalance,
      status: "COMPLETED",
      fraudStatus: "PENDING",
      source: "NextPay Web",
      createdAt: serverTimestamp()
    });

    tx.set(walletRef, {
      balance: newBalance,
      lastTxId: txRef.id,
      cashInDay: today,
      cashInCount: countToday + 1,
      updatedAt: serverTimestamp()
    });

    return {
      id: txRef.id,
      amount,
      newBalance,
      cashInsLeft: CASH_IN_DAILY_LIMIT - (countToday + 1)
    };
  });
}

/* ---------------------------------------------------------- */
/* Send Money                                                 */
/* ---------------------------------------------------------- */

export async function sendMoney({
  recipientPhone,
  recipientName,
  amount: amountInput,
  pin,
  reference = ""
}) {
  const currentUser = requireUser();
  const amount = parseAmount(amountInput);

  if (!PHONE_REGEX.test(recipientPhone)) {
    throw new Error("Enter a valid Bangladesh mobile number.");
  }

  // 1. Sender's profile and PIN
  const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};

  if (!profile.hasPin) {
    throw new Error("Set your transaction PIN from the Profile page first.");
  }

  if (!PIN_REGEX.test(pin)) {
    throw new Error("Enter your PIN.");
  }

  if (!(await verifyPin(pin))) {
    throw new Error("Incorrect PIN.");
  }

  // 2. Find the receiver by mobile number
  if (profile.phone && profile.phone === recipientPhone) {
    throw new Error("You can't send money to your own number.");
  }

  const phoneSnap = await getDoc(doc(db, "phoneNumbers", recipientPhone));

  if (!phoneSnap.exists()) {
    throw new Error(
      "No NextPay account uses this number. The receiver must register and add this number first."
    );
  }

  const receiverId = phoneSnap.data().uid;

  if (receiverId === currentUser.uid) {
    throw new Error("You can't send money to yourself.");
  }

  // 3. Move the money. Everything below succeeds together or not at all.
  const senderWalletRef = doc(db, "wallets", currentUser.uid);
  const receiverWalletRef = doc(db, "wallets", receiverId);
  const txRef = doc(collection(db, "transactions"));

  return runTransaction(db, async (tx) => {
    const senderSnap = await tx.get(senderWalletRef);
    const receiverSnap = await tx.get(receiverWalletRef);

    const sender = { ...emptyWallet(), ...(senderSnap.exists() ? senderSnap.data() : {}) };
    const receiver = { ...emptyWallet(), ...(receiverSnap.exists() ? receiverSnap.data() : {}) };

    if (sender.balance < amount) {
      throw new Error("Insufficient balance.");
    }

    const senderNewBalance = sender.balance - amount;
    const receiverNewBalance = receiver.balance + amount;

    tx.set(txRef, {
      userId: currentUser.uid,
      type: "send_money",
      amount,
      currency: "BDT",

      senderName: profile.name || currentUser.displayName || "",
      senderPhone: profile.phone || "",

      receiverId,
      recipient: recipientName.trim(),
      phone: recipientPhone,

      reference,

      oldBalanceOrg: sender.balance,
      newBalanceOrig: senderNewBalance,
      oldBalanceDest: receiver.balance,
      newBalanceDest: receiverNewBalance,

      status: "COMPLETED",
      fraudStatus: "PENDING",
      source: "NextPay Web",
      createdAt: serverTimestamp()
    });

    tx.set(senderWalletRef, {
      ...sender,
      balance: senderNewBalance,
      lastTxId: txRef.id,
      updatedAt: serverTimestamp()
    });

    tx.set(receiverWalletRef, {
      ...receiver,
      balance: receiverNewBalance,
      lastTxId: txRef.id,
      updatedAt: serverTimestamp()
    });

    return { id: txRef.id, amount, newBalance: senderNewBalance };
  });
}
