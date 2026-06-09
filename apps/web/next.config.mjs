/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@specboard/core", "@specboard/db", "@specboard/ui"],
  // Set NEXT_OUTPUT=standalone for the Docker image (infra/web.Dockerfile);
  // plain `next start` doesn't support standalone output.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
};

export default nextConfig;
