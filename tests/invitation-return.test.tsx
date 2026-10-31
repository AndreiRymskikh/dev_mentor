import { test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { readInvitationReturn, useInvitationReturn } from "../packages/app/src/auth/invitation-return";
const path = `/invitation/${"a".repeat(43)}`, key = "devmentor.invitation-return";
function setup(query = "") {
  const dom = new JSDOM("<div id='root'></div>", { url: `https://app.test/login${query}` });
  vi.stubGlobal("window", dom.window); vi.stubGlobal("document", dom.window.document); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  return dom;
}
test("only exact single invitation paths are retained; poisoned, expired or malformed state fails closed", () => {
  const dom = setup();
  try {
    expect(readInvitationReturn()).toBeNull();
    for (const stored of ["broken", "null", "false", "4", '"text"', "[]", JSON.stringify({path}), JSON.stringify({path:4}), JSON.stringify({path:"https://evil.test"}), JSON.stringify({path,expires:"forever"}), JSON.stringify({path,expires:Date.now()-1}), JSON.stringify({path,expires:Date.now()+3600000})]) {
      dom.window.localStorage.setItem(key, stored); expect(readInvitationReturn()).toBeNull(); expect(dom.window.localStorage.getItem(key)).toBeNull();
    }
    for (const value of ["https://evil.test", "//evil.test", "/account", `${path}?x=1`, `${path}/`, "/invitation/short", `${path}#fragment`]) {
      dom.window.history.replaceState(null,"",`/login?returnTo=${encodeURIComponent(value)}`); expect(readInvitationReturn()).toBeNull();
    }
    dom.window.history.replaceState(null,"",`/login?returnTo=${encodeURIComponent(path)}&returnTo=${encodeURIComponent(path)}`);expect(readInvitationReturn()).toBeNull();
    dom.window.history.replaceState(null,"",`/login?returnTo=${encodeURIComponent(path)}`); expect(readInvitationReturn()).toBe(path);
    dom.window.history.replaceState(null,"","/verify-email"); expect(readInvitationReturn()).toBe(path);
    vi.spyOn(dom.window.Storage.prototype,"getItem").mockImplementation(()=>{throw new Error("denied");}); expect(readInvitationReturn()).toBeNull();
    dom.window.history.replaceState(null,"",`/login?returnTo=${encodeURIComponent(path)}`);vi.spyOn(dom.window.Storage.prototype,"removeItem").mockImplementation(()=>{throw new Error("denied");});expect(readInvitationReturn()).toBe(path);
    dom.window.history.replaceState(null,"","/login?returnTo=bad");expect(readInvitationReturn()).toBeNull();
    dom.window.history.replaceState(null,"","/login");expect(readInvitationReturn()).toBeNull();
  } finally { dom.window.close(); vi.unstubAllGlobals(); }
});
test("auth links preserve continuation and successful login consumes storage, including storage denial", async () => {
  const dom=setup(`?returnTo=${encodeURIComponent(path)}`), host=dom.window.document.getElementById("root")!,root=createRoot(host);
  let complete!:()=>string|null;
  function Consumer() {const invitation=useInvitationReturn();complete=invitation.complete;return <a href={invitation.href("/register")}>Register</a>;}
  try {
    await act(async()=>root.render(<Consumer/>));expect(host.querySelector("a")!.getAttribute("href")).toBe(`/register?returnTo=${encodeURIComponent(path)}`);
    dom.window.history.replaceState(null,"","/login");expect(complete()).toBe(path);expect(dom.window.localStorage.getItem(key)).toBeNull();expect(complete()).toBeNull();
    dom.window.history.replaceState(null,"",`/login?returnTo=${encodeURIComponent(path)}`);vi.spyOn(dom.window.Storage.prototype,"removeItem").mockImplementation(()=>{throw new Error("denied");});expect(complete()).toBe(path);
  } finally {await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}
});
