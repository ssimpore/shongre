import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";
import { useAuth } from "../../app/providers/AuthProvider";
import { useDataMode } from "../../app/providers/DataModeProvider";
import { routes } from "../../configuration/routes";

const STAFF_NEUTRAL_PUBLIC_PATHS = new Set([
  "/conditions-utilisation",
  "/terms",
  "/confidentialite",
  "/privacy",
  "/cookies",
  "/mentions-legales",
  "/accessibilite",
  "/aide",
  "/support",
  "/securite",
  "/contact",
  "/securite-interne",
]);

export function isStaffNeutralPublicPath(pathname: string): boolean {
  return STAFF_NEUTRAL_PUBLIC_PATHS.has(pathname);
}

type StaffCustomerSurfaceAction =
  | "allow"
  | "pending"
  | "exit-demo-staff"
  | "redirect-admin"
  | "redirect-contact";

type EntryStaffState = "pending" | "staff" | "non-staff";

export function resolveStaffCustomerSurfaceAction({
  isRestoring,
  isStaff,
  staffStatus,
  dataMode,
  pathname,
  allowNeutralPublicPaths,
  exitDemoStaffAtRoot,
  enteredAtRoot,
  entryStaffState,
  demoExitFailed,
}: {
  isRestoring: boolean;
  isStaff: boolean;
  staffStatus?: string;
  dataMode: "demo" | "api";
  pathname: string;
  allowNeutralPublicPaths: boolean;
  exitDemoStaffAtRoot: boolean;
  enteredAtRoot: boolean;
  entryStaffState: EntryStaffState;
  demoExitFailed: boolean;
}): StaffCustomerSurfaceAction {
  if (
    isRestoring ||
    (exitDemoStaffAtRoot &&
      enteredAtRoot &&
      dataMode === "demo" &&
      entryStaffState === "pending")
  ) {
    return "pending";
  }
  if (!isStaff) return "allow";
  if (allowNeutralPublicPaths && isStaffNeutralPublicPath(pathname)) {
    return "allow";
  }
  if (
    exitDemoStaffAtRoot &&
    enteredAtRoot &&
    entryStaffState === "staff" &&
    dataMode === "demo" &&
    pathname === "/" &&
    !demoExitFailed
  ) {
    return "exit-demo-staff";
  }
  return staffStatus === "active" ? "redirect-admin" : "redirect-contact";
}

/**
 * Keeps customer acquisition and marketplace surfaces out of Staff sessions.
 * Backend permissions remain authoritative; this boundary prevents disclosure
 * and dead-end customer controls before any adapter request is made.
 */
export function StaffCustomerSurfaceBoundary({
  children,
  allowNeutralPublicPaths = false,
  exitDemoStaffAtRoot = false,
}: {
  children: ReactNode;
  allowNeutralPublicPaths?: boolean;
  exitDemoStaffAtRoot?: boolean;
}) {
  const { currentUser, isRestoring, switchDemoUser } = useAuth();
  const { mode } = useDataMode();
  const location = useLocation();
  const exitAttemptedRef = useRef(false);
  const isStaff = isStaffSeparatedSubject(currentUser);
  // Capture only the identity restored for this route entry. A later persona
  // selection is an explicit user action and must keep its configured target.
  const [enteredAtRoot] = useState(() => location.pathname === "/");
  const [entryStaffState, setEntryStaffState] =
    useState<EntryStaffState>("pending");
  const [demoExitFailed, setDemoExitFailed] = useState(false);
  const action = resolveStaffCustomerSurfaceAction({
    isRestoring,
    isStaff,
    staffStatus: currentUser?.staffStatus,
    dataMode: mode,
    pathname: location.pathname,
    allowNeutralPublicPaths,
    exitDemoStaffAtRoot,
    enteredAtRoot,
    entryStaffState,
    demoExitFailed,
  });

  useEffect(() => {
    if (
      !exitDemoStaffAtRoot ||
      !enteredAtRoot ||
      mode !== "demo" ||
      isRestoring ||
      entryStaffState !== "pending"
    ) {
      return;
    }
    setEntryStaffState(isStaff ? "staff" : "non-staff");
  }, [
    enteredAtRoot,
    entryStaffState,
    exitDemoStaffAtRoot,
    isRestoring,
    isStaff,
    mode,
  ]);

  useEffect(() => {
    if (action !== "exit-demo-staff") {
      exitAttemptedRef.current = false;
      return;
    }
    if (exitAttemptedRef.current) return;

    exitAttemptedRef.current = true;
    void switchDemoUser("guest")
      .then(() => setEntryStaffState("non-staff"))
      .catch(() => setDemoExitFailed(true));
  }, [action, switchDemoUser]);

  if (action === "pending" || action === "exit-demo-staff") return null;
  if (action === "allow") return <>{children}</>;
  return (
    <Navigate
      replace
      to={
        action === "redirect-admin" ? routes.admin.overview() : routes.contact()
      }
    />
  );
}
