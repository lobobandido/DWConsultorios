import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { verifySameOrigin } from "./verify-same-origin";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/appointments", {
    method: "POST",
    headers,
  });
}

describe("verifySameOrigin", () => {
  it("acepta cuando Origin coincide con el host", () => {
    const req = makeRequest({ origin: "http://localhost:3000", host: "localhost:3000" });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it("rechaza cuando Origin es de otro host", () => {
    const req = makeRequest({ origin: "https://evil.example.com", host: "localhost:3000" });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("usa Referer como respaldo si no hay Origin", () => {
    const req = makeRequest({ referer: "http://localhost:3000/calendar/new", host: "localhost:3000" });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it("rechaza si no hay Origin ni Referer", () => {
    const req = makeRequest({ host: "localhost:3000" });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("rechaza si el Origin es una URL malformada", () => {
    const req = makeRequest({ origin: "no-es-una-url", host: "localhost:3000" });
    expect(verifySameOrigin(req)).toBe(false);
  });
});
