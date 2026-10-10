import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/contracts의 TS 소스를 빌드 없이 그대로 가져다 쓴다.
  transpilePackages: ["@kit/contracts"],
};

export default nextConfig;
