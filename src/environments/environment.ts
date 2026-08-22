export const environment = {
  production: false,
  apiUrl:
    window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api'
      : 'https://tickkk.softrateglobal.com/api',
  trackingApiUrl: 'https://visitor-tracking-api.vercel.app/api/visit',
  hrmsApiUrl:
    window.location.hostname === 'localhost'
      ? 'http://localhost:5001'
      : 'https://peoplesoft.softrateglobal.com/hrms-api'
};
