import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

export default function AdminAccountsPage() {
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadStudents = async () => {
    try {
      const { data } = await api.get('/auth/students');
      setStudents(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student accounts');
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/students', { email, password });
      setSuccess(`Student account for ${email} created successfully.`);
      setEmail('');
      setPassword('');
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create student account');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id, studentEmail) => {
    if (!window.confirm(`Are you sure you want to revoke and delete the account for ${studentEmail}? This will immediately terminate their access to learning materials.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await api.delete(`/auth/students/${id}`);
      setSuccess(`Account for ${studentEmail} has been successfully revoked.`);
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke student account');
    }
  };

  return (
    <div className="space-y-12">
      
      {/* Page Title */}
      <div className="border-b border-paper-border pb-5">
        <h2 className="text-3xl font-bold text-ink-900 tracking-tight">
          Manage Student Accounts
        </h2>
        <p className="mt-2 text-sm text-ink-500 font-light">
          Grant and revoke student access credentials for the lab learning portal. Revoked student accounts lose access immediately.
        </p>
      </div>

      {/* Message Notifications */}
      {error && <ErrorText message={error} />}
      {success && (
        <div className="border border-ink-900 bg-paper-sunken px-4 py-3 text-sm text-ink-900 font-medium">
          {success}
        </div>
      )}

      {/* Account Creation Card */}
      <div className="border border-paper-border p-6 sm:p-8 bg-paper-raised">
        <h3 className="text-lg font-bold text-ink-900 mb-6">Create Student Access</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">
                Student Email <span className="text-signal-danger">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full border border-paper-border py-3 px-4 text-ink-900 focus:border-ink-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="student@lab.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">
                Access Password <span className="text-signal-danger">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border border-paper-border py-3 px-4 text-ink-900 focus:border-ink-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center px-6 py-3 text-xs font-bold uppercase tracking-widest text-paper bg-ink-900 hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>

      {/* Accounts Directory */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-ink-900">Active Students Directory ({students.length})</h3>
        
        <div className="border-t border-ink-900 overflow-x-auto">
          <table className="min-w-full divide-y divide-paper-border text-left">
            <thead>
              <tr className="bg-paper-sunken/50">
                <th className="py-4 pl-4 pr-4 text-xs font-bold uppercase tracking-widest text-ink-500">Student Email</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-ink-500">Access Granted On</th>
                <th className="py-4 pl-4 pr-4 text-right text-xs font-bold uppercase tracking-widest text-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-paper-raised">
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-paper-sunken/50 transition-colors">
                  <td className="py-4 pl-4 pr-4">
                    <span className="text-sm font-semibold text-ink-900">{student.email}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-light text-ink-500">
                      {new Date(student.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="py-4 pl-4 pr-4 text-right">
                    <button
                      onClick={() => handleRevoke(student._id, student.email)}
                      className="inline-flex px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-signal-danger hover:text-signal-danger hover:bg-signal-dangerSoft transition-colors"
                    >
                      Revoke Access →
                    </button>
                  </td>
                </tr>
              ))}

              {students.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-ink-500 font-light text-sm">
                    No active student accounts. Use the form above to grant access.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
