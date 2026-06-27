import React, { createContext, useContext, useState, useCallback } from "react";

const ConfirmContext = createContext(null);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children, t }) {
  const [state, setState] = useState({ open: false, message: "", confirmLabel: "Delete", onConfirm: null, onCancel: null });

  const confirm = useCallback((message, confirmLabel = "Delete") => {
    return new Promise((resolve) => {
      setState({
        open: true,
        message,
        confirmLabel,
        onConfirm: () => { setState((s) => ({ ...s, open: false })); resolve(true); },
        onCancel: () => { setState((s) => ({ ...s, open: false })); resolve(false); },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", animation: "vault-overlayIn 0.2s ease" }}>
          <div onClick={state.onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "24px 20px",
            maxWidth: 340,
            width: "90%",
            animation: "vault-scaleIn 0.25s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>Confirm</div>
            <div style={{ fontSize: 13, color: t.textDim, lineHeight: 1.5, marginBottom: 20 }}>{state.message}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={state.onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={state.onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: t.red, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
