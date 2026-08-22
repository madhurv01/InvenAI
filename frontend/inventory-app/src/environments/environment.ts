// Dynamic API host: works whether the app is opened via http://localhost:4200
// (dev, no camera needed) or https://<your-LAN-IP>:4200 (phone testing — camera
// access requires a secure context, so this path always uses https + the backend's
// HTTPS port). Whatever hostname the page was loaded on is reused for the API call.
const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl: isSecure ? `https://${hostname}:5001/api` : `http://${hostname}:5000/api`
};
