import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Interceptor to automatically attach JWT token to all requests
api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const user = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;
