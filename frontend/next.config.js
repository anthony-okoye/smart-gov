/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export if you want a fully static site
  // output: 'export',
  // trailingSlash: true,
  
  // Configure Turbopack root to silence the warning
  turbo: {
    root: '../'
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  },
  
  // Image optimization (disable for static export)
  images: {
    unoptimized: false
  }
}

module.exports = nextConfig