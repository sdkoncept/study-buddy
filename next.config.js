/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Avoid "Object.defineProperty called on non-object" when parsing PDFs in API routes (pdf-parse uses pdfjs-dist)
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "pdf-to-img"],
  },
};

module.exports = nextConfig;
