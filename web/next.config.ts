import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // mapbox-gl est client-only — l'exclure du bundle serveur
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...externals, 'mapbox-gl'];
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
