export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    const base = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    return `${base}${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // When hosted on Netlify, Vercel, or any remote SSL domain, default directly to live Render backend
    if (hostname.includes('netlify.app') || hostname.includes('vercel.app') || window.location.protocol === 'https:') {
      return `https://aisetu.onrender.com${cleanPath}`;
    }
    return `${window.location.protocol}//${hostname}:4000${cleanPath}`;
  }

  return `http://localhost:4000${cleanPath}`;
};
