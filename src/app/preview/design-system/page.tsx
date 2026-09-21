import type { Metadata } from "next";
import { DesignSystemPreview } from "./preview";

export const metadata: Metadata = {
  title: "Design system · Balotly",
  robots: { index: false, follow: false },
};

/**
 * FE-01 in one place: tokens, both type families, button states, input
 * states and the skeleton pattern. Not linked from anywhere; it exists so
 * the primitives can be checked at 360px before any real screen uses them.
 */
export default function DesignSystemPage() {
  return <DesignSystemPreview />;
}
