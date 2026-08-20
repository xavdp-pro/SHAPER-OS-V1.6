#!/usr/bin/env node
/**
 * Automate Cloudflare Tunnel creation and DNS mapping for ia.szde.fr
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'GzRejy4FLxeaaIRcaYIYcANVCxN8U5glc9oug6Aq';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'b2cc670177cfa83dc058e83375a4df49';
const ZONE_ID = process.env.CLOUDFLARE_ZONE_SZDE_FR || 'e006e87aa529f7f5cacbb31bc66b625c';
const TUNNEL_NAME = process.env.TUNNEL_NAME || 'univ8-ia';
const HOSTNAME = process.env.HOSTNAME || 'ia.szde.fr';
const TARGET_SERVICE = process.env.TARGET_SERVICE || 'http://127.0.0.1:8650';

const CF_API = 'https://api.cloudflare.com/client/v4';

function headers() {
  return {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function main() {
  console.log(`[cloudflare-setup] Checking tunnels in account ${ACCOUNT_ID}...`);
  const listRes = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/cfd_tunnel?is_deleted=false`, {
    headers: headers(),
  });
  const listData = await listRes.json();
  if (!listData.success) {
    throw new Error(`Failed to list tunnels: ${JSON.stringify(listData.errors)}`);
  }

  let tunnel = listData.result.find((t) => t.name === TUNNEL_NAME);
  if (!tunnel) {
    console.log(`[cloudflare-setup] Tunnel '${TUNNEL_NAME}' not found. Creating...`);
    const createRes = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/cfd_tunnel`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: TUNNEL_NAME,
        config_src: 'cloudflare',
      }),
    });
    const createData = await createRes.json();
    if (!createData.success) {
      throw new Error(`Failed to create tunnel: ${JSON.stringify(createData.errors)}`);
    }
    tunnel = createData.result;
    console.log(`[cloudflare-setup] Created tunnel: ${tunnel.id} (${tunnel.name})`);
  } else {
    console.log(`[cloudflare-setup] Found existing tunnel: ${tunnel.id} (${tunnel.name})`);
  }

  // Fetch tunnel token
  const tokenRes = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/cfd_tunnel/${tunnel.id}/token`, {
    headers: headers(),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.success) {
    throw new Error(`Failed to get tunnel token: ${JSON.stringify(tokenData.errors)}`);
  }
  const token = tokenData.result;
  console.log(`[cloudflare-setup] Got token for tunnel ${tunnel.id}`);

  // Set remote tunnel ingress configuration
  console.log(`[cloudflare-setup] Configuring remote ingress for ${HOSTNAME} → ${TARGET_SERVICE}...`);
  const configRes = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/cfd_tunnel/${tunnel.id}/configurations`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      config: {
        ingress: [
          {
            hostname: HOSTNAME,
            service: TARGET_SERVICE,
          },
          {
            service: 'http_status:404',
          },
        ],
      },
    }),
  });
  const configData = await configRes.json();
  if (!configData.success) {
    console.warn(`[cloudflare-setup] Warning setting configuration: ${JSON.stringify(configData.errors)}`);
  } else {
    console.log(`[cloudflare-setup] Remote ingress configuration applied.`);
  }

  // Configure DNS record in Zone szde.fr
  console.log(`[cloudflare-setup] Checking DNS records for ${HOSTNAME} in zone ${ZONE_ID}...`);
  const dnsListRes = await fetch(`${CF_API}/zones/${ZONE_ID}/dns_records?name=${HOSTNAME}`, {
    headers: headers(),
  });
  const dnsListData = await dnsListRes.json();
  if (!dnsListData.success) {
    throw new Error(`Failed to query DNS records: ${JSON.stringify(dnsListData.errors)}`);
  }

  const cnameTarget = `${tunnel.id}.cfargotunnel.com`;
  const existingRecord = dnsListData.result.find((r) => r.name === HOSTNAME && r.type === 'CNAME');

  if (existingRecord) {
    console.log(`[cloudflare-setup] Updating DNS record ${existingRecord.id} → ${cnameTarget}...`);
    const updateRes = await fetch(`${CF_API}/zones/${ZONE_ID}/dns_records/${existingRecord.id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        type: 'CNAME',
        name: HOSTNAME,
        content: cnameTarget,
        proxied: true,
        ttl: 1,
      }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success) {
      throw new Error(`Failed to update DNS: ${JSON.stringify(updateData.errors)}`);
    }
    console.log(`[cloudflare-setup] DNS record updated successfully.`);
  } else {
    console.log(`[cloudflare-setup] Creating DNS CNAME record ${HOSTNAME} → ${cnameTarget}...`);
    const createDnsRes = await fetch(`${CF_API}/zones/${ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        type: 'CNAME',
        name: HOSTNAME,
        content: cnameTarget,
        proxied: true,
        ttl: 1,
      }),
    });
    const createDnsData = await createDnsRes.json();
    if (!createDnsData.success) {
      throw new Error(`Failed to create DNS: ${JSON.stringify(createDnsData.errors)}`);
    }
    console.log(`[cloudflare-setup] DNS record created successfully.`);
  }

  // Save token to file if requested
  const tokenOut = process.env.TOKEN_OUTPUT_FILE;
  if (tokenOut) {
    fs.mkdirSync(path.dirname(tokenOut), { recursive: true });
    fs.writeFileSync(tokenOut, token, { mode: 0o600 });
    console.log(`[cloudflare-setup] Saved token to ${tokenOut}`);
  }

  console.log(`[cloudflare-setup] SUCCESS: ${HOSTNAME} is mapped to tunnel ${tunnel.id} → ${TARGET_SERVICE}`);
  return { tunnelId: tunnel.id, token, hostname: HOSTNAME };
}

main().catch((err) => {
  console.error('[cloudflare-setup] ERROR:', err.message);
  process.exit(1);
});
