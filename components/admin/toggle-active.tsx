"use client";

import { useState, useTransition } from "react";
import { setBranchActiveAction, setUserActiveAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

interface ToggleActiveProps {
  kind: "branch" | "user";
  id: string;
  name: string;
  isActive: boolean;
}

export function ToggleActive({ kind, id, name, isActive }: ToggleActiveProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (isActive && kind === "user" && !window.confirm(`Deactivate ${name}? They will be signed out immediately.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    if (!isActive) fd.set("isActive", "on");
    startTransition(async () => {
      const result = await (kind === "branch" ? setBranchActiveAction(fd) : setUserActiveAction(fd));
      setError(result.ok ? null : result.error.message);
    });
  }

  return (
    <div>
      <Button variant={isActive ? "outline" : "tonal"} onClick={toggle} disabled={pending} aria-label={`${isActive ? "Deactivate" : "Activate"} ${name}`}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <p role="alert" className={error ? "mt-1 text-sm font-medium text-danger" : "hidden"}>
        {error}
      </p>
    </div>
  );
}