"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  endpoint: string;
  redirectTo: string;
  label?: string;
  itemName: string;
  className?: string;
};

export function DeleteButton({
  endpoint,
  redirectTo,
  label = "Delete",
  itemName,
  className = "btn btn-danger",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (confirming) {
      setLoading(true);
      fetch(endpoint, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) return res.json().then((d) => Promise.reject(d?.error ?? res.statusText));
          router.push(redirectTo);
          router.refresh();
        })
        .catch((err) => {
          alert(typeof err === "string" ? err : "Failed to delete. Try again.");
          setLoading(false);
          setConfirming(false);
        });
      return;
    }
    const ok = window.confirm(`Delete “${itemName}”? This cannot be undone.`);
    if (ok) setConfirming(true);
  };

  if (confirming) {
    return (
      <>
        <button
          type="button"
          className={className}
          style={{ padding: "0.4rem 0.8rem" }}
          onClick={handleClick}
          disabled={loading}
        >
          {loading ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: "0.4rem 0.8rem" }}
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={{ padding: "0.4rem 0.8rem" }}
      onClick={handleClick}
      disabled={loading}
    >
      {label}
    </button>
  );
}
