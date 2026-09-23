import { Notice } from "@/components/ui/notice";

/** Candidates apply through a link from their organizer; there is no contest search. */
export function AskOrganizer() {
  return (
    <Notice tone="info" className="text-base">
      Ask your organizer for the application link for your contest. It opens the form to apply.
    </Notice>
  );
}
