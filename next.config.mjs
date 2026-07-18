/** @type {import('next').NextConfig} */
const nextConfig = {
  // 리디자인: 통합·삭제된 페이지의 옛 경로를 새 위치로 영구 리다이렉트.
  async redirects() {
    return [
      { source: "/central", destination: "/", permanent: true },
      { source: "/items", destination: "/inventory", permanent: true },
      { source: "/imports", destination: "/data", permanent: true },
    ];
  },
};

export default nextConfig;
