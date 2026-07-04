import dns from 'node:dns'

// This environment resolves the Canton DevNet host to a NAT64 IPv6 address
// that isn't actually routable (only IPv4 works here). Node's fetch tries
// IPv6 first and stalls/times out before falling back, causing intermittent
// "fetch failed" errors on every /api/canton/* route. Forcing IPv4-first
// DNS resolution avoids the dead IPv6 attempt entirely.
dns.setDefaultResultOrder('ipv4first')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
};

export default nextConfig;
