
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import {
  PHONE_REGEX,
  PIN_REGEX,
  verifyPin
} from "./profileService";

export const CASH_IN_MAX_AMOUNT = 15000;
export const CASH_IN_DAILY_LIMIT = 3;

/* ==========================================================
   HELPERS
========================================================== */

function requireUser() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please login first.");
  }

  return currentUser;
}

export function dhakaDayKey(date = new Date()) {
  const shifted = new Date(
    date.getTime() + 6 * 60 * 60 * 1000
  );

  return (
    shifted.getUTCFullYear() * 10000 +
    (shifted.getUTCMonth() + 1) * 100 +
    shifted.getUTCDate()
  );
}

function emptyWallet() {
  return {
    balance: 0,
    cashInDay: 0,
    cashInCount: 0
  };
}

function parseAmount(value) {
  const amount = Number(value);

  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new Error("Enter a whole amount of at least ৳1.");
  }

  return amount;
}

/* ==========================================================
   WALLET
========================================================== */

export async function createWallet(uid) {
  await setDoc(doc(db, "wallets", uid), {
    ...emptyWallet(),
    updatedAt: serverTimestamp()
  });
}

/* ==========================================================
   CASH IN
========================================================== */

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

    const wallet = {
      ...emptyWallet(),
      ...(walletSnap.exists() ? walletSnap.data() : {})
    };

    const countToday =
      wallet.cashInDay === today
        ? wallet.cashInCount
        : 0;

    if (countToday >= CASH_IN_DAILY_LIMIT) {
      throw new Error(
        "Daily limit reached. You can cash in 3 times per day."
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
      ...wallet,
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

/* ==========================================================
   SEND MONEY
========================================================== */

export async function sendMoney({
  recipientPhone,
  recipientName,
  amount: amountInput,
  pin,
  reference = ""
}) {
  const currentUser = requireUser();
  const amount = parseAmount(amountInput);

  if (!PHONE_REGEX.test(recipientPhone || "")) {
    throw new Error("Enter a valid Bangladesh mobile number.");
  }

  const profileSnap = await getDoc(
    doc(db, "users", currentUser.uid)
  );

  const profile = profileSnap.exists()
    ? profileSnap.data()
    : {};

  if (!profile.hasPin) {
    throw new Error(
      "Set your transaction PIN from the Profile page first."
    );
  }

  if (!PIN_REGEX.test(pin || "")) {
    throw new Error("Enter your PIN.");
  }

  if (!(await verifyPin(pin))) {
    throw new Error("Incorrect PIN.");
  }

  if (profile.phone === recipientPhone) {
    throw new Error("You can't send money to your own number.");
  }

  const phoneSnap = await getDoc(
    doc(db, "phoneNumbers", recipientPhone)
  );

  if (!phoneSnap.exists()) {
    throw new Error(
      "No NextPay account uses this number."
    );
  }

  const receiverId = phoneSnap.data().uid;

  if (!receiverId || receiverId === currentUser.uid) {
    throw new Error("Invalid receiver account.");
  }

  const senderWalletRef = doc(
    db,
    "wallets",
    currentUser.uid
  );

  const receiverWalletRef = doc(
    db,
    "wallets",
    receiverId
  );

  const txRef = doc(collection(db, "transactions"));

  return runTransaction(db, async (tx) => {
    const senderSnap = await tx.get(senderWalletRef);
    const receiverSnap = await tx.get(receiverWalletRef);

    const sender = {
      ...emptyWallet(),
      ...(senderSnap.exists() ? senderSnap.data() : {})
    };

    const receiver = {
      ...emptyWallet(),
      ...(receiverSnap.exists() ? receiverSnap.data() : {})
    };

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

      senderName:
        profile.name || currentUser.displayName || "",

      senderPhone: profile.phone || "",

      receiverId,
      recipient: (recipientName || "").trim(),
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

    return {
      id: txRef.id,
      amount,
      newBalance: senderNewBalance
    };
  });
}

/* ==========================================================
   CASH OUT
========================================================== */

export async function cashOut({
  mode = "submit",
  agentPhone,
  amount: amountInput,
  pin
}) {
  const currentUser = requireUser();

  if (!PHONE_REGEX.test(agentPhone || "")) {
    throw new Error(
      "Enter a valid Bangladesh agent mobile number."
    );
  }

  const agentRef = doc(db, "agents", agentPhone);

  if (mode === "verify") {
    const agentSnap = await getDoc(agentRef);

    if (!agentSnap.exists()) {
      throw new Error(
        "This number is not a registered NextPay agent."
      );
    }

    const agentData = agentSnap.data();

    if (agentData.active !== true) {
      throw new Error("This agent is currently inactive.");
    }

    return {
      agent: {
        name: agentData.name || "NextPay Agent",
        phone: agentPhone
      }
    };
  }

  if (mode !== "submit") {
    throw new Error("Invalid cash out request.");
  }

  const amount = parseAmount(amountInput);

  if (!PIN_REGEX.test(pin || "")) {
    throw new Error("Enter your transaction PIN.");
  }

  if (!(await verifyPin(pin))) {
    throw new Error("Incorrect transaction PIN.");
  }

  const walletRef = doc(db, "wallets", currentUser.uid);
  const txRef = doc(collection(db, "transactions"));

  return runTransaction(db, async (tx) => {
    const agentSnap = await tx.get(agentRef);
    const walletSnap = await tx.get(walletRef);

    if (!agentSnap.exists()) {
      throw new Error(
        "This agent is no longer registered."
      );
    }

    const agentData = agentSnap.data();

    if (agentData.active !== true) {
      throw new Error("This agent is currently inactive.");
    }

    const wallet = {
      ...emptyWallet(),
      ...(walletSnap.exists() ? walletSnap.data() : {})
    };

    if (wallet.balance < amount) {
      throw new Error("Insufficient balance.");
    }

    const newBalance = wallet.balance - amount;

    tx.set(txRef, {
      userId: currentUser.uid,
      type: "cash_out",
      amount,
      currency: "BDT",

      agentName: agentData.name || "NextPay Agent",
      agentPhone,

      reference: "Cash Out",

      oldBalanceOrg: wallet.balance,
      newBalanceOrig: newBalance,

      status: "COMPLETED",
      fraudStatus: "PENDING",
      source: "NextPay Web",
      createdAt: serverTimestamp()
    });

    tx.set(walletRef, {
      ...wallet,
      balance: newBalance,
      lastTxId: txRef.id,
      updatedAt: serverTimestamp()
    });

    return {
      id: txRef.id,
      amount,
      newBalance,
      agentName: agentData.name || "NextPay Agent",
      agentPhone,
      status: "COMPLETED"
    };
  });
}

/* ==========================================================
   MOBILE RECHARGE
========================================================== */

export const ALLOWED_OPERATORS = [
  "Grameenphone",
  "Robi",
  "Airtel",
  "Banglalink",
  "Teletalk"
];

/*
  Bangladesh mobile prefixes.

  016 is shared by Robi and Airtel.
  Therefore, both are accepted for 016 numbers.
*/

const OPERATOR_PREFIXES = {
  Grameenphone: ["017", "013"],
  Robi: ["018", "016"],
  Airtel: ["016"],
  Banglalink: ["019", "014"],
  Teletalk: ["015"]
};

/*
  Returns possible operators for a number.
  For 016, returns ["Robi", "Airtel"].
*/

export function detectOperator(phone) {
  if (!PHONE_REGEX.test(phone || "")) {
    return null;
  }

  const prefix = phone.substring(0, 3);

  const matchedOperators = ALLOWED_OPERATORS.filter(
    (operator) =>
      OPERATOR_PREFIXES[operator].includes(prefix)
  );

  if (matchedOperators.length === 0) {
    return null;
  }

  // For shared prefix 016, Robi is the default label.
  // Frontend/backend validation accepts both operators.
  return matchedOperators[0];
}

/*
  Checks whether the selected operator matches the number.
*/

export function isCompatibleOperator(phone, operator) {
  if (!PHONE_REGEX.test(phone || "")) {
    return false;
  }

  if (!ALLOWED_OPERATORS.includes(operator)) {
    return false;
  }

  const prefix = phone.substring(0, 3);

  return OPERATOR_PREFIXES[operator].includes(prefix);
}

/*
  Performs demo mobile recharge.
  Wallet deduction and transaction creation are atomic.
*/

export async function mobileRecharge({
  phone,
  operator,
  connectionType,
  amount: amountInput,
  pin
}) {
  const currentUser = requireUser();
  const amount = parseAmount(amountInput);

  // 1. Validate mobile number.
  if (!PHONE_REGEX.test(phone || "")) {
    throw new Error(
      "Enter a valid 11-digit Bangladesh mobile number."
    );
  }

  // 2. Validate operator.
  if (!ALLOWED_OPERATORS.includes(operator)) {
    throw new Error("Please select a valid mobile operator.");
  }

  // 3. Validate operator against mobile prefix.
  if (!isCompatibleOperator(phone, operator)) {
    const detectedOperator = detectOperator(phone);

    throw new Error(
      `Operator mismatch. Detected operator: ${detectedOperator || "Unknown"}.`
    );
  }

  // 4. Validate connection type.
  if (!["Prepaid", "Postpaid"].includes(connectionType)) {
    throw new Error("Select Prepaid or Postpaid.");
  }

  // 5. Validate PIN.
  if (!PIN_REGEX.test(pin || "")) {
    throw new Error("Enter your 5-digit transaction PIN.");
  }

  if (!(await verifyPin(pin))) {
    throw new Error("Incorrect transaction PIN.");
  }

  // 6. Prepare Firestore references.
  const walletRef = doc(db, "wallets", currentUser.uid);
  const txRef = doc(collection(db, "transactions"));

  // 7. Atomic recharge transaction.
  return runTransaction(db, async (tx) => {
    const walletSnap = await tx.get(walletRef);

    const wallet = {
      ...emptyWallet(),
      ...(walletSnap.exists() ? walletSnap.data() : {})
    };

    if (wallet.balance < amount) {
      throw new Error("Insufficient wallet balance.");
    }

    const newBalance = wallet.balance - amount;

    // Create transaction record.
    tx.set(txRef, {
      userId: currentUser.uid,
      type: "mobile_recharge",

      phone,
      operator,
      connectionType,

      amount,
      currency: "BDT",

      reference: "Mobile Recharge",

      oldBalanceOrg: wallet.balance,
      newBalanceOrig: newBalance,

      status: "COMPLETED",
      fraudStatus: "PENDING",

      rechargeMode: "DEMO",
      source: "NextPay Web",

      createdAt: serverTimestamp()
    });

    // Update wallet balance.
    tx.set(walletRef, {
      ...wallet,
      balance: newBalance,
      lastTxId: txRef.id,
      updatedAt: serverTimestamp()
    });

    return {
      id: txRef.id,
      phone,
      operator,
      connectionType,
      amount,
      newBalance,
      status: "COMPLETED",
      rechargeMode: "DEMO"
    };
  });
}
