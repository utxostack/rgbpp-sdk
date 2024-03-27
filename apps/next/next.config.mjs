/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: function (config, options) {
    config.experiments = {
      layers: true,
    };
    config.resolve = {
      fallback: {
        net: false,
        tls: false,
      },
    };

    return config;
  }
};

export default nextConfig;
