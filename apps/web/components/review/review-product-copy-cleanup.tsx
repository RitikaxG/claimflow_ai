"use client";

import { useEffect } from "react";

export function ReviewProductCopyCleanup() {
  useEffect(() => {
    const candidates = Array.from(document.querySelectorAll("p"));
    for (const node of candidates) {
      if (node.textContent?.includes("Week")) {
        node.textContent = "Human review workspace";
      }
    }
  }, []);

  return null;
}
