/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-project-dev" : ".next-project",
  allowedDevOrigins: ["10.0.2.2"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

if (process.env.VERCEL === "1") {
  nextConfig.distDir = ".next";
}

export default nextConfig;
