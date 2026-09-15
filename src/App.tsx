/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import UserDashboard from './pages/user/UserDashboard';
import EventDetail from './pages/user/EventDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import Login from './pages/Login';
import Validation from './pages/Validation';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/validate/:certId" element={<Validation />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="event/:eventId" element={<EventDetail />} />
          
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}
