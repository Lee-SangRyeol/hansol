/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'img1.kakaocdn.net',
      't1.kakaocdn.net',
      'k.kakaocdn.net'
    ],
  },
};

module.exports = nextConfig;
