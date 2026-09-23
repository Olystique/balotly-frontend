import { forwardAuth } from "../session";

export function POST(request: Request) {
  return forwardAuth("/auth/login", request);
}
