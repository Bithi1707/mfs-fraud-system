import { useEffect } from "react";
import {
  Bell,
  ArrowDownLeft,
  Plus,
  X,
  Inbox
} from "lucide-react";
import "./NotificationModal.css";

export default function NotificationModal({
  isOpen,
  onClose,
  notifications = [],
  onDelete,
  onClearAll
}) {
  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="notif-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="notif-popup"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-title">
            <div className="notif-header-icon">
              <Bell size={18} />
            </div>
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <span className="notif-count-badge">{notifications.length}</span>
            )}
          </div>

          <div className="notif-header-actions">
            {notifications.length > 0 && (
              <button
                type="button"
                className="notif-action-btn"
                onClick={onClearAll}
                title="Clear all notifications"
              >
                Clear all
              </button>
            )}

            <button
              type="button"
              className="notif-close-btn"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* List of notifications */}
        <div className="notif-body">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <Inbox size={36} />
              </div>
              <h4>No notifications yet</h4>
              <p>When someone sends or pays money to your account, alerts will appear here.</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((item) => {
                const isReceived = item.type === "money_received";

                return (
                  <div
                    key={item.id}
                    className={`notif-item ${item.read ? "read" : "unread"}`}
                  >
                    <div className={`notif-icon-box ${isReceived ? "received" : "cashin"}`}>
                      {isReceived ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </div>

                    <div className="notif-details">
                      <div className="notif-details-top">
                        <span className="notif-title">{item.title}</span>
                        <span className="notif-time">{item.timeFormatted}</span>
                      </div>

                      <p className="notif-message">{item.message}</p>

                      {item.reference && (
                        <span className="notif-reference">
                          Note: {item.reference}
                        </span>
                      )}
                    </div>

                    {/* Cross button beside the notification to delete it */}
                    <button
                      type="button"
                      className="notif-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
