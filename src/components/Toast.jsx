import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children, t }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, type = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, exiting: true } : x)));
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 300);
    }, 2500);
  }, []);

  const colors = { success: t.green, error: t.red, info: t.gold };
  const icons = { success: "✓", error: "✗", info: "ℹ" };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 8, pointerEvents: "none", maxWidth: 420, width: "90%" }}>
        {toasts.map((item) => (
          <div
            key={item.id}
            style={{
              background: t.bgElev,
              border: `1px solid ${colors[item.type] || t.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              animation: item.exiting ? "vault-toastOut 0.3s ease forwards" : "vault-toastIn 0.3s ease",
              pointerEvents: "auto",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: colors[item.type], flexShrink: 0 }}>{icons[item.type]}</span>
            <span style={{ fontSize: 13, color: t.text }}>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
