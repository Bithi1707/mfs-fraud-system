import { transactionTime } from "../hooks/useTransactions";

export function formatTaka(amount) {
  return Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatDateTime(item) {
  const date = new Date(transactionTime(item));
  const now = new Date();

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}, ${time}`;
}

// Turns a stored transaction into what the screen should show for THIS user.
// kind decides the icon: send | receive | cashout | payment
export function describeTransaction(item, uid) {
  switch (item.type) {
    case "send_money":
      if (item.receiverId === uid) {
        return {
          kind: "receive",
          direction: "in",
          title: `Received from ${item.senderName || "NextPay user"}`,
          detail: item.senderPhone ? `Send Money · ${item.senderPhone}` : "Send Money"
        };
      }

      return {
        kind: "send",
        direction: "out",
        title: item.recipient || "Send Money",
        detail: `Sent · ${item.phone || ""}`
      };

    case "cash_in":
      return {
        kind: "receive",
        direction: "in",
        title: "Cash In",
        detail: "Added to wallet"
      };

    case "payment":
      return {
        kind: "payment",
        direction: "out",
        title: item.merchant || "Payment",
        detail: "Merchant Payment"
      };

    case "cash_out":
      return { kind: "cashout", direction: "out", title: "Cash Out", detail: "Withdrawal" };

    case "mobile_recharge":
      return {
        kind: "cashout",
        direction: "out",
        title: "Mobile Recharge",
        detail: item.phone || ""
      };

    default:
      return { kind: "payment", direction: "out", title: "Transaction", detail: "" };
  }
}
