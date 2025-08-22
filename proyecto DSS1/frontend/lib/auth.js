// /frontend/lib/auth.js
import { useEffect, useState } from "react";
import api from "./api";
import { getAccessToken } from "./tokens";

export function useAuthGuard(roles = []) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const tk = getAccessToken();
      if (!tk) {
        if (typeof window !== "undefined" && !location.pathname.endsWith("/login")) {
          location.href = "/login";
        }
        if (mounted) setReady(true);
        return;
      }

      try {
        // Asegúrate de que este endpoint exista en tu backend
        const { data } = await api.get("/api/auth/me/");
        if (!mounted) return;

        setUser(data);

        if (roles.length) {
          const role = (data.role || "").toLowerCase();
          const ok = roles.map((r) => r.toLowerCase()).includes(role);
          if (!ok) {
            if (typeof window !== "undefined") location.href = "/";
            return;
          }
        }
      } catch (_e) {
        if (typeof window !== "undefined" && !location.pathname.endsWith("/login")) {
          location.href = "/login";
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, [roles.join(",")]);

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.clear();
      location.href = "/login";
    }
  }

  return { ready, user, logout };
}
