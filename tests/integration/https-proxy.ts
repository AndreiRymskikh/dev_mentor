import { createServer } from "node:https";
import { request } from "node:http";

/** Owned local TLS boundary so browser Origin and Secure cookies match production. */
export async function httpsProxy(upstream: string, tls: { key: Buffer; cert: Buffer }) {
  const server = createServer(tls, (incoming, outgoing) => {
    const target = new URL(incoming.url!, upstream);
    const proxy = request(target, { method: incoming.method, headers: incoming.headers }, (response) => {
      outgoing.writeHead(response.statusCode!, response.headers);
      response.pipe(outgoing);
    });
    proxy.on("error", () => { outgoing.writeHead(502); outgoing.end(); });
    incoming.pipe(proxy);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("HTTPS proxy address unavailable");
  return {
    origin: `https://127.0.0.1:${address.port}`,
    async close() { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); },
  };
}
