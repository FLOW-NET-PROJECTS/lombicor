import { Navigate, Route, Routes } from 'react-router-dom'
import Apply from './pages/Apply'
import Admin from './pages/Admin'
import AdminGate from './pages/AdminGate'

function ProtectedAdminRoute() {
  const unlocked = typeof window !== 'undefined' && window.localStorage.getItem('lombicor-admin-unlocked') === 'true'
  return unlocked ? <Admin /> : <Navigate to="/admin-login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Apply />} />
      <Route path="/admin-login" element={<AdminGate />} />
      <Route path="/admin" element={<ProtectedAdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
