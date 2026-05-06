import { useState, useCallback } from "react";

const STORAGE_KEY = "stinkrz_blocked_users";

function getBlocked() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState(getBlocked);

  const blockUser = useCallback((email) => {
    const updated = [...new Set([...getBlocked(), email])];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBlockedUsers(updated);
  }, []);

  const unblockUser = useCallback((email) => {
    const updated = getBlocked().filter((e) => e !== email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBlockedUsers(updated);
  }, []);

  const isBlocked = useCallback((email) => blockedUsers.includes(email), [blockedUsers]);

  return { blockedUsers, blockUser, unblockUser, isBlocked };
}