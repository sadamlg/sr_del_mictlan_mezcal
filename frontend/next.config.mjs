/** @type {import('next').NextConfig} */
const mediaBaseUrl = new URL(process.env.MEDIA_BASE_URL || 'http://localhost:3000');
const mediaBasePath = mediaBaseUrl.pathname.replace(/\/+$/, '');
const mediaRemotePattern = new URL(`${mediaBaseUrl.origin}${mediaBasePath}/**`);

const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [mediaRemotePattern],
  },
  allowedDevOrigins: process.env.NEXT_ALLOWED_DEV_ORIGIN
    ? [process.env.NEXT_ALLOWED_DEV_ORIGIN]
    : [],
  turbopack: {
    rules: {
      "*.css": {
        condition: { path: /src\/app\/globals\.css$/ },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
