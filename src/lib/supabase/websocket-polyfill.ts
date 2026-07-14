import WebSocket from "ws";

/**
 * @supabase/supabase-js (realtime-js) espera un WebSocket global nativo,
 * disponible recién desde Node 22. En Node 18/20 hay que inyectarlo antes de
 * crear cualquier cliente, aunque no usemos Realtime.
 */
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}
