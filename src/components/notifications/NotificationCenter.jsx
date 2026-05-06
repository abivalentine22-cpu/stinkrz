import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function NotificationCenter({ userEmail }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userEmail],
    queryFn: () =>
      base44.entities.Notification.filter(
        { user_email: userEmail },
        "-created_date",
        50
      ),
    enabled: !!userEmail,
    refetchInterval: 5000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  return (
    <div className="relative">
      {/* Bell icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-96 bg-card border border-border rounded-2xl shadow-xl shadow-black/30 z-50 max-h-[500px] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
                <h3 className="font-heading font-semibold">Notifications</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notifications list */}
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="font-body text-sm">No notifications yet</p>
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
                          <p className="font-body text-sm font-semibold text-foreground">
                            {notif.title}
                          </p>
                          {notif.description && (
                            <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.description}
                            </p>
                          )}
                          <p className="font-body text-[10px] text-muted-foreground/70 mt-1">
                            {format(new Date(notif.created_date), "h:mm a")}
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
                          deleteMutation.mutate(notif.id);
                        }}
                        className="mt-2 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}