import type { NextConfig } from "next";

const markdownPaths = [
  "/",
  "/skills",
  "/cli",
  "/agent-skill",
  "/about",
  "/contact",
  "/privacy",
  "/llms.txt",
];

const nextConfig: NextConfig = {
  transpilePackages: ["@txtskills/ui"],
  async rewrites() {
    return {
      beforeFiles: [
        ...markdownPaths.map((path) => ({
          source: path,
          has: [
            {
              type: "header" as const,
              key: "accept",
              value: "(.*)text/markdown(.*)",
            },
          ],
          destination: path === "/" ? "/api/markdown/__home" : `/api/markdown${path}`,
        })),
        {
          source: "/:path*",
          has: [
            {
              type: "header" as const,
              key: "accept",
              value: "(.*)text/markdown(.*)",
            },
          ],
          destination: "/api/markdown/:path*",
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Vary", value: "Accept, Accept-Encoding" }],
      },
    ];
  },
};

export default nextConfig;
