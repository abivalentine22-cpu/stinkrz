import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, X, MessageCircle, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { parseServerTimestamp } from "@/lib/timestamps";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

function notificationTime(value) {
  const date = parseServerTimestamp(value);
  return Number.isFinite(date.getTime()) ? format(date, "MMM d · h:mm a") : "Time unavailable";
}

export default function NotificationCenter({ userEmail }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Real-time subscribe — the secureClient channel's initial refresh provides
    // the full snapshot, so no separate fetch is needed on mount.
  useEffect(() => {
    if (!userEmail) return;

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data.user_email === userEmail) {
        setNotifications(prev => [event.data, ...prev.filter(n => n.id !== event.id)].sort((a,b) => b.created_date.localeCompare(a.created_date)).slice(0, 50));
      } else if (event.type === "update") {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === "delete") {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return unsub;
  }, [userEmail]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    base44.entities.Notification.update(notificationId, { read: true });
  };

  const dismiss = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    base44.entities.Notification.delete(notificationId);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.type === "new_message") {
      setOpen(false);
      const target = notification.actor_email
        ? `/messages?with=${encodeURIComponent(notification.actor_email)}`
        : "/messages";
      navigate(target);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Bell icon */}
      <PopoverTrigger asChild>
      <button
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      </PopoverTrigger>

      {/* Dropdown panel */}
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="w-96 max-w-[calc(100vw-24px)] p-0 bg-card border-border rounded-2xl shadow-xl shadow-black/30 max-h-[min(500px,var(--radix-popover-content-available-height))] overflow-y-auto overflow-x-hidden"
        aria-label="Notifications"
      >
              {/* Header */}
              <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
                <h3 className="font-heading font-semibold">Notifications</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notifications list */}
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="font-heading text-sm font-semibold text-foreground mb-1">You're all caught up</p>
                  <p className="font-body text-xs">No new notifications right now</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        !notif.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm">
                          {notif.actor_avatar ? (
                            <img
                              src={notif.actor_avatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "🤙"
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-semibold text-foreground break-words">
                            {notif.title}
                          </p>
                          {notif.description && (
                            <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2 break-words">
                              {notif.description}
                            </p>
                          )}
                          <p className="font-body text-[10px] text-muted-foreground/70 mt-1">
                            {notificationTime(notif.created_date)}
                          </p>
                        </div>

                        {/* Icon & unread dot */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {notif.type === "new_message" ? (
                            <MessageCircle className="w-4 h-4 text-primary" />
                          ) : (
                            <Zap className="w-4 h-4 text-accent" />
                          )}
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notif.id);
                        }}
                        className="mt-2 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
      </PopoverContent>
    </Popover>
  );
}