import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Calendario from './pages/Calendario.jsx';
import Escala from './pages/Escala.jsx';
import Imports from './pages/Imports.jsx';
import Logs from './pages/Logs.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/meu-calendario" element={<Calendario />} />
        <Route path="/escala" element={<Escala />} />
        <Route
          path="/importacoes"
          element={
            <ProtectedRoute minRole="SUPERVISOR">
              <Imports />
            </ProtectedRoute>
          }
        />
        <Route path="/logs" element={<Logs />} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute minRole="ADMIN">
              <Users />
            </ProtectedRoute>
          }
        />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<div className="p-8">Pagina nao encontrada</div>} />
    </Routes>
  );
}
