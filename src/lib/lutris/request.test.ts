import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request";

describe("mutation request guard", () => {
  const check = (headers: Record<string, string>) => isSameOriginRequest(new Request("http://localhost:5000/api/library/refresh", { headers }));
  it("accepts same-origin browser and local CLI requests", () => {
    expect(check({ origin: "http://localhost:5000", "sec-fetch-site": "same-origin" })).toBe(true);
    expect(check({})).toBe(true);
  });
  it.each<Record<string, string>>([
    { origin: "https://attacker.example" },
    { origin: "http://localhost:3001" },
    { origin: "null" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
  ])("rejects cross-origin writes: %j", (headers) => {
    expect(check(headers)).toBe(false);
  });
  it("supports proxies that preserve the original host", () => {
    expect(check({ origin: "https://library.example", host: "library.example" })).toBe(true);
  });
});
