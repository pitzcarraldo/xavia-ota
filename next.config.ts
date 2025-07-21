import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

// Initialize OpenNext Cloudflare for development
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    '@emotion/react',
    '@emotion/styled',
    '@emotion/cache',
    '@emotion/utils',
    '@emotion/use-insertion-effect-with-fallbacks',
    'pg',
    'pg-cloudflare',
    'isows',
  ],
};

export default nextConfig;
