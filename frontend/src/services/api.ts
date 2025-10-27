const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Debug logging
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }

  // Auth endpoints
  async register(userData: { name: string; email: string; password: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: { email: string; password: string }) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', response.data.token);
      console.log('Token stored in localStorage:', response.data.token.substring(0, 20) + '...');
    } else {
      console.log('Login failed or no token received:', response);
    }
    
    return response;
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // File endpoints
  async getUserFiles() {
    return this.request('/files');
  }
  async uploadFile(file: File, metadata: { name: string; price: number; description?: string; isPublic?: boolean }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    formData.append('price', metadata.price.toString());
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    if (metadata.isPublic !== undefined) {
      formData.append('isPublic', metadata.isPublic.toString());
    }

    // Get the latest token from localStorage
    const token = localStorage.getItem('auth_token');
    console.log('Upload token check:', token ? 'Token found' : 'No token');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
    
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log('Making upload request to:', `${this.baseURL}/files/upload`);
    console.log('Request headers:', headers);
    
    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    console.log('Upload response status:', response.status);
    console.log('Upload response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('Upload error data:', errorData);
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    const responseData = await response.json();
    console.log('Upload response data:', responseData);
    return responseData;
  }

  async getFiles() {
    return this.request('/files');
  }

  async getFile(id: string) {
    return this.request(`/files/${id}`);
  }

  async getEmbeddedPreview(id: string) {
    return this.request(`/files/${id}/embed`);
  }

  async generateShareablePreview(id: string) {
    return this.request(`/files/${id}/share`);
  }

  async getPublicPreview(id: string, token: string) {
    return this.request(`/files/${id}/public-preview?token=${token}`);
  }

  // Payment endpoints
  async createPaymentOrder(fileId: string) {
    return this.request('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }

  async verifyPaymentStatus(orderId: string) {
    return this.request(`/payments/verify/${orderId}`);
  }

  async getUserPayments() {
    return this.request('/payments/user');
  }

  async getCreatorEarnings() {
    return this.request('/payments/earnings');
  }

  async getPaymentStats(days: number = 30) {
    return this.request(`/payments/stats?days=${days}`);
  }

  async getDownloadUrl(fileId: string) {
    return this.request(`/files/${fileId}/download`);
  }

  // Analytics endpoints
  async getAnalytics() {
    return this.request('/analytics');
  }
}

export const apiService = new ApiService();
export default apiService;
