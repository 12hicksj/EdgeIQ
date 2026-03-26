/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@edgeiq/db", "@edgeiq/models", "@edgeiq/ai", "@edgeiq/ingestion"],
};

module.exports = nextConfig;
