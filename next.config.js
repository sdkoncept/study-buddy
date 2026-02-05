/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Avoid "Object.defineProperty called on non-object" when parsing PDFs in API routes (pdf-parse uses pdfjs-dist)
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "pdf-to-img"],
    // Workaround: use single-threaded compilation to avoid jest-worker child process crashes
    // (fixes "libnode.so.109: cannot open shared object" after Node 18→20 upgrade)
    workerThreads: false,
    cpus: 1,
  },
};

module.exports = nextConfig;
