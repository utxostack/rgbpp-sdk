/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: function (config, options) {
    config.experiments = {
      layers: true,
    };
    return config;
  }
};

export default nextConfig;
