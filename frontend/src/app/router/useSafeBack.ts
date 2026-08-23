import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Browser Back with an intentional in-app fallback for direct entries.
 *
 * React Router stores an `idx` for history entries it owns. A direct visit has
 * no previous in-app entry, so blindly navigating to -1 can close the app or
 * return to an unrelated origin. In that case we replace with the supplied
 * safe destination instead.
 */
export const useSafeBack = (fallback: string) => {
  const navigate = useNavigate();

  return useCallback(() => {
    const index = window.history.state?.idx;
    if (typeof index === "number" && index > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [fallback, navigate]);
};
