/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@betting/db", "@betting/models", "@betting/ai"],
};

module.exports = nextConfig;
