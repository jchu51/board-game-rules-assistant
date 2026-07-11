export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export const ACTOR_HEADERS = {
  "x-user-id": import.meta.env.VITE_LOCAL_USER_ID ?? "11111111-1111-4111-8111-111111111111",
};
