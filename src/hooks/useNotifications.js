import { useCallback, useMemo, useState } from "react";
import { useTransactions } from "./useTransactions";
import { formatTaka } from "../utils/transactionView";

function getStorageKey(userId) {
  return `nextpay_notifications_state_${userId || "anon"}`;
}

function loadPersistedState(userId) {
  if (!userId) return { readIds: [], dismissedIds: [] };
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return { readIds: [], dismissedIds: [] };
    const parsed = JSON.parse(raw);
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : []
    };
  } catch {
    return { readIds: [], dismissedIds: [] };
  }
}

function savePersistedState(userId, state) {
  if (!userId) return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch (err) {
    console.error("Failed to persist notification state:", err);
  }
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return "Just now";
  const time = typeof timestamp === "number" ? timestamp : timestamp?.toMillis ? timestamp.toMillis() : Date.now();
  const diffMs = Date.now() - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  const date = new Date(time);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function useNotifications(userId) {
  const { transactions, loading: transactionsLoading } = useTransactions(userId);

  const [persisted, setPersisted] = useState(() => loadPersistedState(userId));
  const [prevUserId, setPrevUserId] = useState(userId);

  // Sync persisted state when userId changes without triggering useEffect setState warnings
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setPersisted(loadPersistedState(userId));
  }

  // Derive notifications from transactions
  const notifications = useMemo(() => {
    if (!userId || !transactions || transactions.length === 0) return [];

    const dismissedSet = new Set(persisted.dismissedIds);
    const readSet = new Set(persisted.readIds);

    const list = [];

    for (const tx of transactions) {
      if (dismissedSet.has(tx.id)) continue;

      // Primary: Incoming Send Money / Transfer to this user's account
      const isReceivedSendMoney = tx.type === "send_money" && tx.receiverId === userId;
      // Also notify for incoming Cash In
      const isCashIn = tx.type === "cash_in" && tx.userId === userId;

      if (isReceivedSendMoney) {
        const sender = tx.senderName || "NextPay user";
        const phone = tx.senderPhone ? ` (${tx.senderPhone})` : "";
        list.push({
          id: tx.id,
          type: "money_received",
          direction: "in",
          title: "Money Received",
          message: `৳${formatTaka(tx.amount)} received from ${sender}${phone}`,
          amount: tx.amount,
          reference: tx.reference || "",
          timestamp: tx.createdAt,
          timeFormatted: formatRelativeTime(tx.createdAt),
          read: readSet.has(tx.id)
        });
      } else if (isCashIn) {
        list.push({
          id: tx.id,
          type: "cash_in",
          direction: "in",
          title: "Cash In Successful",
          message: `৳${formatTaka(tx.amount)} was added to your wallet`,
          amount: tx.amount,
          reference: tx.reference || "",
          timestamp: tx.createdAt,
          timeFormatted: formatRelativeTime(tx.createdAt),
          read: readSet.has(tx.id)
        });
      }
    }

    return list;
  }, [userId, transactions, persisted]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const hasUnread = unreadCount > 0;

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (!userId || notifications.length === 0) return;
    setPersisted((prev) => {
      const allIds = Array.from(new Set([...prev.readIds, ...notifications.map((n) => n.id)]));
      const next = { ...prev, readIds: allIds };
      savePersistedState(userId, next);
      return next;
    });
  }, [userId, notifications]);

  // Delete an individual notification
  const deleteNotification = useCallback(
    (id) => {
      if (!userId || !id) return;
      setPersisted((prev) => {
        const dismissed = Array.from(new Set([...prev.dismissedIds, id]));
        const next = { ...prev, dismissedIds: dismissed };
        savePersistedState(userId, next);
        return next;
      });
    },
    [userId]
  );

  // Clear all active notifications
  const clearAllNotifications = useCallback(() => {
    if (!userId || notifications.length === 0) return;
    setPersisted((prev) => {
      const dismissed = Array.from(new Set([...prev.dismissedIds, ...notifications.map((n) => n.id)]));
      const next = { ...prev, dismissedIds: dismissed };
      savePersistedState(userId, next);
      return next;
    });
  }, [userId, notifications]);

  return {
    notifications,
    unreadCount,
    hasUnread,
    loading: transactionsLoading,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications
  };
}
