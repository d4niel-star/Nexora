// Quick connectivity test — raw TCP + TLS to Render PostgreSQL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import * as net from "net";
import * as tls from "tls";

const dbUrl = process.env.DATABASE_URL!;
const match = dbUrl.match(/@([^:/]+):?(\d+)?\//);
if (!match) { console.error("Can't parse host from DATABASE_URL"); process.exit(1); }

const host = match[1];
const port = parseInt(match[2] || "5432", 10);

// Also try external hostname
const extHost = host.replace("-a.", "-a.external.");

async function testConnection(h: string, p: number): Promise<void> {
  return new Promise((resolve) => {
    console.log(`Testing ${h}:${p}...`);
    const socket = net.createConnection({ host: h, port: p, timeout: 5000 }, () => {
      console.log(`  ✅ TCP connected to ${h}:${p}`);
      // Try TLS upgrade
      const tlsSocket = tls.connect({ socket, rejectUnauthorized: false, servername: h }, () => {
        console.log(`  ✅ TLS handshake OK`);
        tlsSocket.destroy();
        resolve();
      });
      tlsSocket.on("error", (e) => {
        console.log(`  ❌ TLS error: ${e.message}`);
        socket.destroy();
        resolve();
      });
    });
    socket.on("timeout", () => { console.log(`  ❌ TCP timeout`); socket.destroy(); resolve(); });
    socket.on("error", (e) => { console.log(`  ❌ TCP error: ${e.message}`); resolve(); });
  });
}

(async () => {
  await testConnection(host, port);
  await testConnection(extHost, port);
})();
