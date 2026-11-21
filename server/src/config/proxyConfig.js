// Reads TRUST_PROXY_HOPS: how many proxies sit between the visitor and this server. A pure function (no process.env inside)
// so every rule can be unit tested; config/env.js calls it once at startup and app.js hands the answer to Express.
//
// WHY IT EXISTS: behind a host's proxy, Express sees the PROXY's address as the connection. The rate limiters would then count
// every visitor as one person. The proxies write the real address into the X-Forwarded-For header, and `trust proxy` tells
// Express how many of them to believe. Too few: everyone shares one counter. Too many: a visitor can forge their address
// by sending their own header. So the number must be exactly right for the deployment, and it is a setting, not a guess in code.
//   0 (default)  no proxy: local development
//   1, 2 ...     that many proxies in front (for example Vercel -> Render's load balancer is 2)
const MAX_HOPS = 5; // anything above this is almost certainly a typo, and a large number is the unsafe direction

export function resolveTrustProxyHops(value) {
    if (value === undefined || value === null || value === "") return 0;

    const hops = Number(value);

    if (!Number.isInteger(hops) || hops < 0 || hops > MAX_HOPS) {
        throw new Error(`TRUST_PROXY_HOPS must be a whole number from 0 to ${MAX_HOPS} (it is "${value}").`);
    }

    return hops;
}
