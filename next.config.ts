import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Initialize OpenNext Cloudflare for development
if (process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev();
}

import type { NextConfig } from 'next';

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
  ],
};

export default nextConfig;