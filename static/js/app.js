const { createApp } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

function statusClass(s) {
  if (s === 'Approved' || s === 'Selected') return 'success';
  if (s === 'Pending' || s === 'Applied' || s === 'Shortlisted') return s === 'Shortlisted' ? 'info' : 'warning';
  return 'danger';
}


const LoginPage = {
  async mounted() {
    try {
      const r = await API.getMe();
      if (r && r.user) this.$router.replace('/dashboard');
    } catch (_) {}
  },
  template: `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card shadow">
          <div class="card-body p-4">
            <h4 class="card-title mb-4 text-center">Login</h4>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <form @submit.prevent="login">
              <div class="mb-3">
                <label class="form-label">Role</label>
                <select v-model="role" class="form-select" required>
                  <option value="student">Student</option>
                  <option value="company">Company</option>
                  <option value="admin">Admin (Institute)</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input v-model="username" type="text" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input v-model="password" type="password" class="form-control" required>
              </div>
              <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
            <hr>
            <p class="text-center mb-0 small">
              New user? <router-link to="/register/company">Register as Company</router-link> |
              <router-link to="/register/student">Register as Student</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { username: '', password: '', role: 'student', error: '' };
  },
  methods: {
    async login() {
      this.error = '';
      try {
        await API.login(this.username, this.password, this.role);
        this.$router.replace('/dashboard');
        window.location.reload();
      } catch (e) {
        this.error = e.data?.error || e.message;
      }
    }
  }
};

const RegisterCompany = {
  template: `
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card shadow">
          <div class="card-body p-4">
            <h4 class="card-title mb-4 text-center">Company Registration</h4>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <form @submit.prevent="register">
              <div class="mb-3"><label class="form-label">Company Name *</label><input v-model="form.company_name" type="text" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Username *</label><input v-model="form.username" type="text" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Password *</label><input v-model="form.password" type="password" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">HR Contact *</label><input v-model="form.hr_contact" type="text" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Email *</label><input v-model="form.email" type="email" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Website</label><input v-model="form.website" type="url" class="form-control" placeholder="https://"></div>
              <div class="mb-3"><label class="form-label">Address</label><textarea v-model="form.address" class="form-control" rows="2"></textarea></div>
              <button type="submit" class="btn btn-primary w-100">Register</button>
            </form>
            <p class="text-center mt-3 mb-0 small"><router-link to="/login">Already have an account? Login</router-link></p>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { form: { company_name: '', username: '', password: '', hr_contact: '', email: '', website: '', address: '' }, error: '' };
  },
  methods: {
    async register() {
      this.error = '';
      try {
        await API.registerCompany(this.form);
        this.$router.replace('/login');
        alert('Registration successful. Wait for admin approval to log in.');
      } catch (e) {
        this.error = e.data?.error || e.message;
      }
    }
  }
};

const RegisterStudent = {
  template: `
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card shadow">
          <div class="card-body p-4">
            <h4 class="card-title mb-4 text-center">Student Registration</h4>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <form @submit.prevent="register">
              <div class="mb-3"><label class="form-label">Username *</label><input v-model="form.username" type="text" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Password *</label><input v-model="form.password" type="password" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Full Name *</label><input v-model="form.full_name" type="text" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Email *</label><input v-model="form.email" type="email" class="form-control" required></div>
              <div class="mb-3"><label class="form-label">Contact</label><input v-model="form.contact" type="text" class="form-control"></div>
              <div class="row">
                <div class="col-md-6 mb-3"><label class="form-label">CGPA</label><input v-model.number="form.cgpa" type="number" step="0.01" class="form-control" min="0" max="10"></div>
                <div class="col-md-6 mb-3"><label class="form-label">Graduation Year</label><input v-model.number="form.graduation_year" type="number" class="form-control"></div>
              </div>
              <div class="mb-3"><label class="form-label">Department</label><input v-model="form.department" type="text" class="form-control"></div>
              <button type="submit" class="btn btn-primary w-100">Register</button>
            </form>
            <p class="text-center mt-3 mb-0 small"><router-link to="/login">Already have an account? Login</router-link></p>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { form: { username: '', password: '', full_name: '', email: '', contact: '', cgpa: null, department: '', graduation_year: null }, error: '' };
  },
  methods: {
    async register() {
      this.error = '';
      try {
        await API.registerStudent(this.form);
        this.$router.replace('/login');
        alert('Registration successful! You can now log in.');
      } catch (e) {
        this.error = e.data?.error || e.message;
      }
    }
  }
};

const AdminDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Admin Dashboard</h2>
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="card stat-card border-primary"><div class="card-body"><h6 class="text-muted">Total Students</h6><h3>{{ stats.students }}</h3><router-link to="/admin/students" class="btn btn-sm btn-outline-primary">View</router-link></div></div></div>
        <div class="col-md-3"><div class="card stat-card border-success"><div class="card-body"><h6 class="text-muted">Total Companies</h6><h3>{{ stats.companies }}</h3><router-link to="/admin/companies" class="btn btn-sm btn-outline-success">View</router-link></div></div></div>
        <div class="col-md-3"><div class="card stat-card border-info"><div class="card-body"><h6 class="text-muted">Placement Drives</h6><h3>{{ stats.drives }}</h3><router-link to="/admin/drives" class="btn btn-sm btn-outline-info">View</router-link></div></div></div>
        <div class="col-md-3"><div class="card stat-card border-warning"><div class="card-body"><h6 class="text-muted">Applications</h6><h3>{{ stats.applications }}</h3><router-link to="/admin/applications" class="btn btn-sm btn-outline-warning">View</router-link></div></div></div>
      </div>
      <div class="card"><div class="card-body"><h5>Quick Actions</h5><div class="d-flex flex-wrap gap-2">
        <router-link to="/admin/companies" class="btn btn-primary">Manage Companies</router-link>
        <router-link to="/admin/students" class="btn btn-primary">Manage Students</router-link>
        <router-link to="/admin/drives" class="btn btn-primary">Manage Drives</router-link>
        <router-link to="/admin/applications" class="btn btn-primary">View Applications</router-link>
      </div></div></div>
    </div>
  `,
  data() { return { stats: { students: 0, companies: 0, drives: 0, applications: 0 } }; },
  async mounted() { this.stats = await API.adminDashboard(); }
};

const AdminCompanies = {
  template: `
    <div>
      <h2 class="mb-4">Companies</h2>
      <div class="mb-3 d-flex gap-2">
        <input v-model="search" type="text" class="form-control" placeholder="Search by name or ID" @keyup.enter="load">
        <button class="btn btn-primary" @click="load">Search</button>
      </div>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>ID</th><th>Company Name</th><th>HR Contact</th><th>Email</th><th>Approval</th><th>Drives</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="c in companies" :key="c.id">
          <td>{{ c.id }}</td><td>{{ c.company_name }}</td><td>{{ c.hr_contact }}</td><td>{{ c.email }}</td>
          <td><span :class="'badge bg-' + (c.approval_status === 'Approved' ? 'success' : c.approval_status === 'Pending' ? 'warning' : 'danger')">{{ c.approval_status }}</span>
            <span v-if="c.is_blacklisted" class="badge bg-dark">Blacklisted</span></td>
          <td>{{ c.drive_count || 0 }}</td>
          <td>
            <template v-if="c.approval_status === 'Pending'"><button class="btn btn-sm btn-success" @click="act(c.id,'approve')">Approve</button> <button class="btn btn-sm btn-danger" @click="act(c.id,'reject')">Reject</button></template>
            <button v-if="!c.is_blacklisted" class="btn btn-sm btn-warning" @click="act(c.id,'blacklist')">Blacklist</button>
            <button v-else class="btn btn-sm btn-info" @click="act(c.id,'unblacklist')">Unblacklist</button>
            <button class="btn btn-sm btn-outline-danger" @click="act(c.id,'delete')">Delete</button>
          </td>
        </tr>
        <tr v-if="!companies.length"><td colspan="7" class="text-center">No companies found.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { companies: [], search: '' }; },
  async mounted() { await this.load(); },
  methods: {
    async load() { this.companies = await API.adminCompanies(this.search); },
    async act(id, action) { if (action === 'delete' && !confirm('Delete this company?')) return; await API.adminCompanyAction(id, action); await this.load(); }
  }
};

const AdminStudents = {
  template: `
    <div>
      <h2 class="mb-4">Students</h2>
      <div class="mb-3 d-flex gap-2">
        <input v-model="search" type="text" class="form-control" placeholder="Search by name, ID, email or contact" @keyup.enter="load">
        <button class="btn btn-primary" @click="load">Search</button>
      </div>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>CGPA</th><th>Applications</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="s in students" :key="s.id" :class="{'table-warning': s.is_blacklisted}">
          <td>{{ s.id }}</td><td>{{ s.full_name }}</td><td>{{ s.email }}</td><td>{{ s.department || '-' }}</td><td>{{ s.cgpa || '-' }}</td><td>{{ s.app_count || 0 }}</td>
          <td><span :class="'badge bg-' + (s.is_blacklisted ? 'dark' : 'success')">{{ s.is_blacklisted ? 'Blacklisted' : 'Active' }}</span></td>
          <td>
            <button v-if="!s.is_blacklisted" class="btn btn-sm btn-warning" @click="act(s.id,'blacklist')">Blacklist</button>
            <button v-else class="btn btn-sm btn-info" @click="act(s.id,'unblacklist')">Unblacklist</button>
            <button class="btn btn-sm btn-outline-danger" @click="act(s.id,'delete')">Delete</button>
          </td>
        </tr>
        <tr v-if="!students.length"><td colspan="8" class="text-center">No students found.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { students: [], search: '' }; },
  async mounted() { await this.load(); },
  methods: {
    async load() { this.students = await API.adminStudents(this.search); },
    async act(id, action) { if (action === 'delete' && !confirm('Delete this student?')) return; await API.adminStudentAction(id, action); await this.load(); }
  }
};

const AdminDrives = {
  template: `
    <div>
      <h2 class="mb-4">Placement Drives</h2>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>ID</th><th>Company</th><th>Job Title</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="d in drives" :key="d.id">
          <td>{{ d.id }}</td><td>{{ d.company_name }}</td><td>{{ d.job_title }}</td><td>{{ d.application_deadline || '-' }}</td>
          <td><span :class="'badge bg-' + statusClass(d.status)">{{ d.status }}</span></td>
          <td>
            <template v-if="d.status === 'Pending'"><button class="btn btn-sm btn-success" @click="act(d.id,'approve')">Approve</button> <button class="btn btn-sm btn-danger" @click="act(d.id,'reject')">Reject</button></template>
            <button class="btn btn-sm btn-outline-danger" @click="act(d.id,'delete')">Delete</button>
          </td>
        </tr>
        <tr v-if="!drives.length"><td colspan="6" class="text-center">No placement drives.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { drives: [] }; },
  async mounted() { this.drives = await API.adminDrives(); },
  methods: {
    statusClass(s) { return statusClass(s); },
    async act(id, action) { if (action === 'delete' && !confirm('Delete this drive?')) return; await API.adminDriveAction(id, action); this.drives = await API.adminDrives(); }
  }
};

const AdminApplications = {
  template: `
    <div>
      <h2 class="mb-4">All Applications</h2>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>ID</th><th>Student</th><th>Company / Job</th><th>Date</th><th>Status</th></tr></thead><tbody>
        <tr v-for="a in applications" :key="a.id">
          <td>{{ a.id }}</td><td>{{ a.student_name }} <small class="text-muted">({{ a.student_email }})</small></td><td>{{ a.company_name }} - {{ a.job_title }}</td><td>{{ a.application_date }}</td>
          <td><span :class="'badge bg-' + statusClass(a.status)">{{ a.status }}</span></td>
        </tr>
        <tr v-if="!applications.length"><td colspan="5" class="text-center">No applications.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { applications: [] }; },
  async mounted() { this.applications = await API.adminApplications(); },
  methods: { statusClass(s) { return statusClass(s); } }
};

const CompanyDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Welcome, {{ company.company_name }}</h2>
      <div class="card mb-4"><div class="card-header">Company Details</div><div class="card-body">
        <p><strong>HR Contact:</strong> {{ company.hr_contact }}</p>
        <p><strong>Email:</strong> {{ company.email }}</p>
        <p><strong>Website:</strong> {{ company.website || '-' }}</p>
        <p><strong>Approval Status:</strong> <span :class="'badge bg-' + (company.approval_status === 'Approved' ? 'success' : 'warning')">{{ company.approval_status }}</span></p>
      </div></div>
      <h4 class="mb-3">Your Placement Drives</h4>
      <div v-if="company.approval_status !== 'Approved'" class="alert alert-warning">Your company must be approved by admin to create placement drives.</div>
      <router-link v-else to="/company/drive/new" class="btn btn-primary mb-3">Create New Drive</router-link>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>ID</th><th>Job Title</th><th>Deadline</th><th>Status</th><th>Applicants</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="d in drives" :key="d.id">
          <td>{{ d.id }}</td><td>{{ d.job_title }}</td><td>{{ d.application_deadline || '-' }}</td>
          <td><span :class="'badge bg-' + statusClass(d.status)">{{ d.status }}</span></td><td>{{ d.applicant_count || 0 }}</td>
          <td>
            <router-link :to="'/company/drive/' + d.id + '/applications'" class="btn btn-sm btn-info">View Applications</router-link>
            <router-link v-if="d.status === 'Approved'" :to="'/company/drive/' + d.id + '/edit'" class="btn btn-sm btn-outline-primary">Edit</router-link>
            <button v-if="d.status === 'Approved'" class="btn btn-sm btn-outline-secondary" @click="close(d.id)">Close</button>
            <button v-if="d.status === 'Pending'" class="btn btn-sm btn-outline-danger" @click="del(d.id)">Delete</button>
          </td>
        </tr>
        <tr v-if="!drives.length"><td colspan="6" class="text-center">No placement drives yet.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { company: {}, drives: [] }; },
  async mounted() { const r = await API.companyDashboard(); this.company = r.company; this.drives = r.drives; },
  methods: {
    statusClass(s) { return statusClass(s); },
    async close(id) { await API.companyDriveAction(id, 'close'); const r = await API.companyDashboard(); this.drives = r.drives; },
    async del(id) { if (!confirm('Delete this drive?')) return; await API.companyDriveAction(id, 'delete'); const r = await API.companyDashboard(); this.drives = r.drives; }
  }
};

const CompanyProfile = {
  template: `
    <div>
      <h2 class="mb-4">Company Profile</h2>
      <div v-if="msg" class="alert alert-success">{{ msg }}</div>
      <div class="card"><div class="card-body">
        <form @submit.prevent="save">
          <div class="mb-3"><label class="form-label">Company Name *</label><input v-model="form.company_name" type="text" class="form-control" required></div>
          <div class="mb-3"><label class="form-label">HR Contact *</label><input v-model="form.hr_contact" type="text" class="form-control" required></div>
          <div class="mb-3"><label class="form-label">Email *</label><input v-model="form.email" type="email" class="form-control" required></div>
          <div class="mb-3"><label class="form-label">Website</label><input v-model="form.website" type="url" class="form-control"></div>
          <div class="mb-3"><label class="form-label">Address</label><textarea v-model="form.address" class="form-control" rows="2"></textarea></div>
          <div class="mb-3"><label class="form-label">New Password (leave blank to keep current)</label><input v-model="form.password" type="password" class="form-control"></div>
          <button type="submit" class="btn btn-primary">Update Profile</button>
        </form>
      </div></div>
    </div>
  `,
  data() { return { form: {}, msg: '' }; },
  async mounted() { this.form = { ...await API.companyProfile() }; },
  methods: {
    async save() { this.msg = ''; await API.companyProfile(this.form); this.msg = 'Profile updated.'; }
  }
};

const CompanyDrives = {
  template: `
    <div>
      <h2 class="mb-4">My Placement Drives</h2>
      <router-link v-if="can_create" to="/company/drive/new" class="btn btn-primary mb-3">Create New Drive</router-link>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>ID</th><th>Job Title</th><th>Deadline</th><th>Status</th><th>Applicants</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="d in drives" :key="d.id">
          <td>{{ d.id }}</td><td>{{ d.job_title }}</td><td>{{ d.application_deadline || '-' }}</td>
          <td><span :class="'badge bg-' + statusClass(d.status)">{{ d.status }}</span></td><td>{{ d.applicant_count || 0 }}</td>
          <td>
            <router-link :to="'/company/drive/' + d.id + '/applications'" class="btn btn-sm btn-info">View Applications</router-link>
            <router-link v-if="d.status === 'Approved'" :to="'/company/drive/' + d.id + '/edit'" class="btn btn-sm btn-outline-primary">Edit</router-link>
            <button v-if="d.status === 'Approved'" class="btn btn-sm btn-outline-secondary" @click="close(d.id)">Close</button>
            <button v-if="d.status === 'Pending'" class="btn btn-sm btn-outline-danger" @click="del(d.id)">Delete</button>
          </td>
        </tr>
        <tr v-if="!drives.length"><td colspan="6" class="text-center">No placement drives.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { drives: [], can_create: false }; },
  async mounted() { const r = await API.companyDrives(); this.drives = r.drives; this.can_create = r.can_create; },
  methods: {
    statusClass(s) { return statusClass(s); },
    async close(id) { await API.companyDriveAction(id, 'close'); const r = await API.companyDrives(); this.drives = r.drives; },
    async del(id) { if (!confirm('Delete?')) return; await API.companyDriveAction(id, 'delete'); const r = await API.companyDrives(); this.drives = r.drives; }
  }
};

const CompanyDriveForm = {
  template: `
    <div>
      <h2 class="mb-4">{{ driveId === 'new' ? 'Create' : 'Edit' }} Placement Drive</h2>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div class="card"><div class="card-body">
        <form @submit.prevent="save">
          <div class="mb-3"><label class="form-label">Job Title *</label><input v-model="form.job_title" type="text" class="form-control" required></div>
          <div class="mb-3"><label class="form-label">Job Description</label><textarea v-model="form.job_description" class="form-control" rows="4"></textarea></div>
          <div class="mb-3"><label class="form-label">Eligibility Criteria</label><textarea v-model="form.eligibility_criteria" class="form-control" rows="2"></textarea></div>
          <div class="row">
            <div class="col-md-4 mb-3"><label class="form-label">Application Deadline</label><input v-model="form.application_deadline" type="date" class="form-control"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Package Offered</label><input v-model="form.package_offered" type="text" class="form-control" placeholder="e.g. 10 LPA"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Location</label><input v-model="form.location" type="text" class="form-control"></div>
          </div>
          <button type="submit" class="btn btn-primary">{{ driveId === 'new' ? 'Create' : 'Update' }} Drive</button>
          <router-link to="/company/drives" class="btn btn-secondary">Cancel</router-link>
        </form>
      </div></div>
    </div>
  `,
  props: ['driveId'],
  data() { return { form: { job_title: '', job_description: '', eligibility_criteria: '', application_deadline: '', package_offered: '', location: '' }, error: '' }; },
  async mounted() {
    if (this.driveId !== 'new') {
      const d = await API.companyGetDrive(parseInt(this.driveId));
      this.form = { job_title: d.job_title, job_description: d.job_description || '', eligibility_criteria: d.eligibility_criteria || '', application_deadline: d.application_deadline || '', package_offered: d.package_offered || '', location: d.location || '' };
    }
  },
  methods: {
    async save() {
      this.error = '';
      try {
        if (this.driveId === 'new') {
          await API.companyCreateDrive(this.form);
        } else {
          await API.companyUpdateDrive(parseInt(this.driveId), this.form);
        }
        this.$router.push('/company/drives');
      } catch (e) { this.error = e.data?.error || e.message; }
    }
  }
};

const CompanyDriveApplications = {
  template: `
    <div>
      <h2 class="mb-4">Applications for {{ drive.job_title }}</h2>
      <p class="text-muted">{{ drive.company_name }} | {{ applications.length }} applicant(s)</p>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Student</th><th>Email</th><th>Contact</th><th>CGPA</th><th>Department</th><th>Status</th><th>Update Status</th></tr></thead><tbody>
        <tr v-for="a in applications" :key="a.id">
          <td>{{ a.full_name }}</td><td>{{ a.email }}</td><td>{{ a.contact || '-' }}</td><td>{{ a.cgpa || '-' }}</td><td>{{ a.department || '-' }}</td>
          <td><span :class="'badge bg-' + statusClass(a.status)">{{ a.status }}</span></td>
          <td>
            <select v-model="statuses[a.id]" class="form-select form-select-sm d-inline-block w-auto">
              <option value="Applied">Applied</option><option value="Shortlisted">Shortlisted</option><option value="Selected">Selected</option><option value="Rejected">Rejected</option>
            </select>
            <button class="btn btn-sm btn-primary" @click="updateStatus(a.id)">Update</button>
            <a v-if="a.resume_path" :href="'/api/company/application/' + a.id + '/resume'" class="btn btn-sm btn-outline-secondary" target="_blank">Resume</a>
          </td>
        </tr>
        <tr v-if="!applications.length"><td colspan="7" class="text-center">No applications yet.</td></tr>
      </tbody></table></div></div>
      <router-link to="/company/drives" class="btn btn-secondary mt-3">Back to Drives</router-link>
    </div>
  `,
  props: ['driveId'],
  data() { return { drive: {}, applications: [], statuses: {} }; },
  async mounted() {
    const r = await API.companyDriveApplications(parseInt(this.driveId));
    this.drive = r.drive;
    this.applications = r.applications;
    this.applications.forEach(a => { this.statuses[a.id] = a.status; });
  },
  methods: {
    statusClass(s) { return statusClass(s); },
    async updateStatus(appId) { await API.companyUpdateApplicationStatus(appId, this.statuses[appId]); const r = await API.companyDriveApplications(parseInt(this.driveId)); this.applications = r.applications; }
  }
};

const StudentDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Welcome, {{ user?.username }}</h2>
      <h5 class="mb-3">Available Placement Drives</h5>
      <div class="row g-3 mb-4">
        <div v-for="d in available_drives" :key="d.id" class="col-md-6"><div class="card h-100"><div class="card-body">
          <h5 class="card-title">{{ d.job_title }}</h5><p class="text-muted mb-2">{{ d.company_name }}</p>
          <p class="card-text small">{{ (d.job_description || '').slice(0,150) }}{{ (d.job_description || '').length > 150 ? '...' : '' }}</p>
          <p class="small mb-2">Deadline: {{ d.application_deadline || 'Not specified' }}</p>
          <button class="btn btn-primary btn-sm" @click="apply(d.id)">Apply</button>
        </div></div></div>
        <div v-if="!available_drives.length" class="col-12"><p class="text-muted">No available placement drives at the moment.</p></div>
      </div>
      <h5 class="mb-3">My Applications</h5>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Job Title</th><th>Company</th><th>Status</th></tr></thead><tbody>
        <tr v-for="a in applied_drives" :key="a.drive_id"><td>{{ a.job_title }}</td><td>{{ a.company_name }}</td><td><span :class="'badge bg-' + statusClass(a.status)">{{ a.status }}</span></td></tr>
        <tr v-if="!applied_drives.length"><td colspan="3" class="text-center">You haven't applied to any drives yet.</td></tr>
      </tbody></table></div></div>
      <p class="mt-2"><router-link to="/student/applications">View all applications and status</router-link></p>
    </div>
  `,
  data() { return { user: null, available_drives: [], applied_drives: [] }; },
  async mounted() {
    this.user = (await API.getMe()).user;
    const r = await API.studentDashboard();
    this.available_drives = r.available_drives;
    this.applied_drives = r.applied_drives;
  },
  methods: {
    statusClass(s) { return statusClass(s); },
    async apply(id) { try { await API.studentApply(id); const r = await API.studentDashboard(); this.available_drives = r.available_drives; this.applied_drives = r.applied_drives; } catch (e) { alert(e.data?.error || e.message); } }
  }
};

const StudentProfile = {
  template: `
    <div>
      <h2 class="mb-4">My Profile</h2>
      <div v-if="msg" class="alert alert-success">{{ msg }}</div>
      <div class="card"><div class="card-body">
        <form @submit.prevent="save" enctype="multipart/form-data">
          <div class="mb-3"><label class="form-label">Full Name *</label><input v-model="form.full_name" type="text" class="form-control" required></div>
          <div class="mb-3"><label class="form-label">Email *</label><input v-model="form.email" type="email" class="form-control" required></div>
          <div class="mb-3"><label class="form-label">Contact</label><input v-model="form.contact" type="text" class="form-control"></div>
          <div class="row">
            <div class="col-md-4 mb-3"><label class="form-label">CGPA</label><input v-model.number="form.cgpa" type="number" step="0.01" class="form-control" min="0" max="10"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Graduation Year</label><input v-model.number="form.graduation_year" type="number" class="form-control"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Department</label><input v-model="form.department" type="text" class="form-control"></div>
          </div>
          <div class="mb-3">
            <label class="form-label">Resume</label>
            <p v-if="form.resume_path" class="small text-muted">Current: {{ form.resume_path }} <a :href="'/api/student/resume/' + form.resume_path" target="_blank">Download</a></p>
            <input ref="resumeInput" type="file" class="form-control" accept=".pdf,.doc,.docx">
            <small class="text-muted">PDF, DOC or DOCX. Leave empty to keep current resume.</small>
          </div>
          <div class="mb-3"><label class="form-label">New Password (leave blank to keep current)</label><input v-model="form.password" type="password" class="form-control"></div>
          <button type="submit" class="btn btn-primary">Update Profile</button>
        </form>
      </div></div>
    </div>
  `,
  data() { return { form: {}, msg: '' }; },
  async mounted() { this.form = { ...await API.studentProfile() }; },
  methods: {
    async save() {
      this.msg = '';
      const fd = new FormData();
      fd.append('full_name', this.form.full_name);
      fd.append('email', this.form.email);
      fd.append('contact', this.form.contact || '');
      fd.append('cgpa', this.form.cgpa || '');
      fd.append('graduation_year', this.form.graduation_year || '');
      fd.append('department', this.form.department || '');
      if (this.form.password) fd.append('password', this.form.password);
      const file = this.$refs.resumeInput?.files?.[0];
      if (file) fd.append('resume', file);
      await API.studentProfile(fd);
      this.msg = 'Profile updated.';
    }
  }
};

const StudentDrives = {
  template: `
    <div>
      <h2 class="mb-4">Approved Placement Drives</h2>
      <div class="row g-3">
        <div v-for="d in drives" :key="d.id" class="col-md-6 col-lg-4"><div class="card h-100"><div class="card-body">
          <h5 class="card-title">{{ d.job_title }}</h5><p class="text-muted mb-2">{{ d.company_name }}</p>
          <p class="card-text small">{{ (d.job_description || 'No description').slice(0,120) }}{{ (d.job_description || '').length > 120 ? '...' : '' }}</p>
          <p class="small mb-2"><strong>Eligibility:</strong> {{ (d.eligibility_criteria || 'Not specified').slice(0,80) }}{{ (d.eligibility_criteria || '').length > 80 ? '...' : '' }}</p>
          <p class="small mb-2">Deadline: {{ d.application_deadline || 'Not specified' }}</p>
          <span v-if="applied[d.id]" :class="'badge bg-' + statusClass(applied[d.id])">{{ applied[d.id] }}</span>
          <button v-else class="btn btn-primary btn-sm" @click="apply(d.id)">Apply</button>
        </div></div></div>
        <div v-if="!drives.length" class="col-12"><p class="text-muted">No approved placement drives at the moment.</p></div>
      </div>
    </div>
  `,
  data() { return { drives: [], applied: {} }; },
  async mounted() { const r = await API.studentDrives(); this.drives = r.drives; this.applied = r.applied; },
  methods: {
    statusClass(s) { return statusClass(s); },
    async apply(id) { try { await API.studentApply(id); const r = await API.studentDrives(); this.applied = r.applied; } catch (e) { alert(e.data?.error || e.message); } }
  }
};

const StudentApplications = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0">My Applications</h2>
        <button class="btn btn-outline-primary btn-sm" @click="exportCsv">Export Applications as CSV</button>
      </div>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Job Title</th><th>Company</th><th>Application Date</th><th>Status</th></tr></thead><tbody>
        <tr v-for="a in applications" :key="a.id"><td>{{ a.job_title }}</td><td>{{ a.company_name }}</td><td>{{ a.application_date }}</td><td><span :class="'badge bg-' + statusClass(a.status)">{{ a.status }}</span></td></tr>
        <tr v-if="!applications.length"><td colspan="4" class="text-center">No applications yet.</td></tr>
      </tbody></table></div></div>
      <div v-if="export_files.length" class="card mt-3"><div class="card-body">
        <h6 class="mb-2">Recent exports</h6><ul class="mb-0">
          <li v-for="f in export_files" :key="f"><a :href="'/api/student/exports/' + encodeURIComponent(f)" target="_blank">{{ f }}</a></li>
        </ul>
        <p class="text-muted small mt-2 mb-0">If you don't see a new file yet, wait a few seconds and refresh after the export job completes.</p>
      </div></div>
    </div>
  `,
  data() { return { applications: [], export_files: [] }; },
  async mounted() { const r = await API.studentApplications(); this.applications = r.applications; this.export_files = r.export_files || []; },
  methods: {
    statusClass(s) { return statusClass(s); },
    async exportCsv() {
        const res = await API.studentExportApplications();
        alert(res.message || 'Export complete.');
        const r = await API.studentApplications();
        this.export_files = r.export_files || [];
      }
  }
};

const StudentHistory = {
  template: `
    <div>
      <h2 class="mb-4">Placement History</h2>
      <p class="text-muted">Records of drives where you were selected.</p>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Job Title</th><th>Company</th><th>Package</th><th>Location</th><th>Date</th></tr></thead><tbody>
        <tr v-for="p in placements" :key="p.id"><td>{{ p.job_title }}</td><td>{{ p.company_name }}</td><td>{{ p.package_offered || '-' }}</td><td>{{ p.location || '-' }}</td><td>{{ p.application_date }}</td></tr>
        <tr v-if="!placements.length"><td colspan="5" class="text-center">No placements yet.</td></tr>
      </tbody></table></div></div>
    </div>
  `,
  data() { return { placements: [] }; },
  async mounted() { this.placements = await API.studentHistory(); }
};

// routers
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginPage },
  { path: '/register/company', component: RegisterCompany },
  { path: '/register/student', component: RegisterStudent },
  { path: '/dashboard', component: { template: '<div>Redirecting...</div>', async mounted() { const r = await API.getMe(); const u = r.user; if (!u) { this.$router.replace('/login'); return; } const role = u.role; if (role === 'admin') this.$router.replace('/admin/dashboard'); else if (role === 'company') this.$router.replace('/company/dashboard'); else this.$router.replace('/student/dashboard'); } } },
  { path: '/admin/dashboard', component: AdminDashboard },
  { path: '/admin/companies', component: AdminCompanies },
  { path: '/admin/students', component: AdminStudents },
  { path: '/admin/drives', component: AdminDrives },
  { path: '/admin/applications', component: AdminApplications },
  { path: '/company/dashboard', component: CompanyDashboard },
  { path: '/company/profile', component: CompanyProfile },
  { path: '/company/drives', component: CompanyDrives },
  { path: '/company/drive/new', component: CompanyDriveForm, props: { driveId: 'new' } },
  { path: '/company/drive/:driveId/edit', component: CompanyDriveForm, props: true },
  { path: '/company/drive/:driveId/applications', component: CompanyDriveApplications, props: true },
  { path: '/student/dashboard', component: StudentDashboard },
  { path: '/student/profile', component: StudentProfile },
  { path: '/student/drives', component: StudentDrives },
  { path: '/student/applications', component: StudentApplications },
  { path: '/student/history', component: StudentHistory },
];

const router = createRouter({ history: createWebHashHistory(), routes });

// appppp
const App = {
  template: `
    <div>
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
          <router-link class="navbar-brand" to="/">Placement Portal</router-link>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"><span class="navbar-toggler-icon"></span></button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
              <template v-if="user?.role === 'admin'">
                <li class="nav-item"><router-link class="nav-link" to="/admin/dashboard">Dashboard</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/admin/companies">Companies</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/admin/students">Students</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/admin/drives">Drives</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/admin/applications">Applications</router-link></li>
              </template>
              <template v-else-if="user?.role === 'company'">
                <li class="nav-item"><router-link class="nav-link" to="/company/dashboard">Dashboard</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/company/profile">Profile</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/company/drives">My Drives</router-link></li>
              </template>
              <template v-else-if="user?.role === 'student'">
                <li class="nav-item"><router-link class="nav-link" to="/student/dashboard">Dashboard</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/student/profile">Profile</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/student/drives">Drives</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/student/applications">Applications</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/student/history">Placement History</router-link></li>
              </template>
            </ul>
            <ul class="navbar-nav">
              <li v-if="user?.username" class="nav-item"><span class="nav-link">{{ user.username }}</span></li>
              <li v-if="user" class="nav-item"><a class="nav-link" href="#" @click.prevent="logout">Logout</a></li>
              <template v-else>
                <li class="nav-item"><router-link class="nav-link" to="/login">Login</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/register/company">Register Company</router-link></li>
                <li class="nav-item"><router-link class="nav-link" to="/register/student">Register Student</router-link></li>
              </template>
            </ul>
          </div>
        </div>
      </nav>
      <main class="container">
        <div v-if="flash" :class="'alert alert-' + flash.type + ' alert-dismissible fade show'" role="alert">
          {{ flash.msg }}<button type="button" class="btn-close" @click="flash=null"></button>
        </div>
        <router-view></router-view>
      </main>
      <footer class="bg-light py-3 mt-auto"><div class="container text-center text-muted small">Placement Portal &copy; 2026</div></footer>
    </div>
  `,
  data() { return { user: null, flash: null }; },
  async mounted() { await this.loadUser(); },
  methods: {
    async loadUser() { const r = await API.getMe(); this.user = r.user; },
    async logout() { await API.logout(); this.user = null; this.$router.push('/login'); }
  },
  watch: { $route: { handler() { this.loadUser(); }, immediate: false } }
};

createApp(App).use(router).mount('#app');
