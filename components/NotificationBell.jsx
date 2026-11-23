"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";
import { useSelector } from "react-redux";
import { socketMethods } from "@/utils/socket";

function formatRelativeDate(dateInput) {
  if (!dateInput) return "";

  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const userId = useSelector((state) => state.auth.userId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const unreadIds = useMemo(
    () => new Set(notifications.filter((n) => !n.isRead).map((n) => n._id)),
    [notifications],
  );

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch notifications");
      }

      setNotifications(Array.isArray(data.data) ? data.data : []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (err) {
      console.error("Notification fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (notificationId) => {
    if (!notificationId || !unreadIds.has(notificationId)) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to mark notification as read");
      }
    } catch (err) {
      console.error("Mark read failed:", err);
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item?._id) return;

    await markRead(item._id);
    setOpen(false);

    /* Events deep-link first: an event linked to a GPB carries a projectId, but
       the recipient wants the event, not the plan. */
    const eventId = item?.metadata?.event_id;

    if (eventId) {
      router.push(`/events-list/${eventId}`);
      return;
    }

    const year = item?.metadata?.year;

    if (year) {
      router.push(`/gpb/${year}`);
      return;
    }

    if (item?.projectId) {
      router.push(`/gpb/dump/${item.projectId}`);
      return;
    }

    if (item?.type === "profile_missing_fields") {
      router.push("/dashboard/personal-information");
      return;
    }

    if (item?.type === "password_not_changed") {
      router.push(`/settings`);
      return;
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  useEffect(() => {
    const onNewNotification = (payload) => {
      if (!payload || String(payload.recipientId) !== String(userId)) return;
      const incoming = payload.notification;
      if (!incoming?._id) return;

      setNotifications((prev) => {
        if (prev.some((item) => item._id === incoming._id)) {
          return prev;
        }
        return [incoming, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    socketMethods.on("notification:new", onNewNotification);

    return () => {
      socketMethods.off("notification:new", onNewNotification);
    };
  }, [userId]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!userId) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) fetchNotifications();
        }}
        className="touch-target relative p-2 rounded-full hover:bg-muted text-fg-3"
        title="Notifications"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
      >
        <FaBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-danger-solid text-white text-2xs leading-5 text-center font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute right-4 sm:right-0 mt-2 w-96 max-w-[calc(100vw-32px)] sm:max-w-[90vw] bg-white border border-line rounded-xl shadow-lg z-50">
          <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
            <h4 className="font-semibold text-fg-2">Notifications</h4>
            <span className="text-xs text-fg-muted">{unreadCount} unread</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-fg-muted">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-fg-muted">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full text-left px-4 py-3 border-b border-line-faint hover:bg-subtle ${
                    item.isRead ? "bg-white" : "bg-secondary-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-fg-2">
                      {item.title}
                    </p>
                    <span className="text-xs text-fg-muted shrink-0">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-fg-4 mt-1">{item.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}