import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/app/vehicles',
        destination: '/app/garage',
        permanent: true, // HTTP 308 (permanent redirect)
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // mapbox-gl est client-only — l'exclure du bundle serveur
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...externals, 'mapbox-gl'];
    }
    return config;
  },
};

export default nextConfig;
