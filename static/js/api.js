const API = {
  base: '',

  async request(path, opts = {}) {
    const url = this.base + path;
    const options = {
      credentials: 'include',
      headers: opts.headers || {},
      ...opts
    };
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
      options.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      if (res.status === 401 && !path.includes('/auth/')) {
        window.location.hash = '#/login';
      }
      const err = new Error(data?.error || `Request failed: ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  // Auth
  async getMe() {
    return this.request('/api/auth/me');
  },
  async login(username, password, role) {
    return this.request('/api/auth/login', { method: 'POST', body: { username, password, role } });
  },
  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },
  async registerCompany(data) {
    return this.request('/api/auth/register/company', { method: 'POST', body: data });
  },
  async registerStudent(data) {
    return this.request('/api/auth/register/student', { method: 'POST', body: data });
  },

  // Admin
  async adminDashboard() { return this.request('/api/admin/dashboard'); },
  async adminCompanies(search) {
    return this.request('/api/admin/companies' + (search ? '?search=' + encodeURIComponent(search) : ''));
  },
  async adminCompanyAction(id, action) {
    return this.request(`/api/admin/company/${id}/${action}`, { method: 'POST' });
  },
  async adminStudents(search) {
    return this.request('/api/admin/students' + (search ? '?search=' + encodeURIComponent(search) : ''));
  },
  async adminStudentAction(id, action) {
    return this.request(`/api/admin/student/${id}/${action}`, { method: 'POST' });
  },
  async adminDrives() { return this.request('/api/admin/drives'); },
  async adminDriveAction(id, action) {
    return this.request(`/api/admin/drive/${id}/${action}`, { method: 'POST' });
  },
  async adminApplications() { return this.request('/api/admin/applications'); },

  // Company
  async companyDashboard() { return this.request('/api/company/dashboard'); },
  async companyProfile(data) {
    if (data) {
      return this.request('/api/company/profile', { method: 'POST', body: data });
    }
    return this.request('/api/company/profile');
  },
  async companyDrives() { return this.request('/api/company/drives'); },
  async companyCreateDrive(data) {
    return this.request('/api/company/drive', { method: 'POST', body: data });
  },
  async companyGetDrive(id) { return this.request(`/api/company/drive/${id}`); },
  async companyUpdateDrive(id, data) {
    return this.request(`/api/company/drive/${id}`, { method: 'PUT', body: data });
  },
  async companyDriveAction(id, action) {
    return this.request(`/api/company/drive/${id}/${action}`, { method: 'POST' });
  },
  async companyDriveApplications(id) {
    return this.request(`/api/company/drive/${id}/applications`);
  },
  async companyUpdateApplicationStatus(appId, status) {
    return this.request(`/api/company/application/${appId}/status`, {
      method: 'POST',
      body: { status }
    });
  },
  resumeUrl(appId) {
    return this.base + `/api/company/application/${appId}/resume`;
  },

  // Student
  async studentDashboard() { return this.request('/api/student/dashboard'); },
  async studentProfile(data) {
    if (data instanceof FormData) {
      return this.request('/api/student/profile', { method: 'POST', body: data, headers: {} });
    }
    if (data) {
      return this.request('/api/student/profile', { method: 'POST', body: data });
    }
    return this.request('/api/student/profile');
  },
  async studentDrives() { return this.request('/api/student/drives'); },
  async studentApply(driveId) {
    return this.request(`/api/student/drive/${driveId}/apply`, { method: 'POST' });
  },
  async studentApplications() { return this.request('/api/student/applications'); },
  async studentExportApplications() {
    return this.request('/api/student/applications/export', { method: 'POST' });
  },
  exportDownloadUrl(filename) {
    return this.base + `/api/student/exports/${encodeURIComponent(filename)}`;
  },
  async studentHistory() { return this.request('/api/student/history'); },
};
