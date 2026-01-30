import * as React from "react";
import { isBrowser } from "@/utils/isBrowser";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Désactiver le responsive mobile - toujours retourner false (desktop)
  return false;
}
