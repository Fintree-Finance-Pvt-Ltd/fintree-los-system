import { Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Dealers from './pages/Dealers';
import Customers from './pages/Customers';
import Docs from './pages/Docs';
import DealersList from './pages/DealersList';
import DealerAdd from './pages/DealerAdd';
import ProtectedRoute from './auth/ProtectedRoute';
import NotAuthorized from './pages/NotAuthorized';
import AdminUsers from './pages/AdminUsers';
import AdminRoles from './pages/AdminRoles';
import FinList from './pages/FinList';
import FinAdd from './pages/FinAdd';
import FinDocs from './pages/FinDocs';

import LandlordList from './pages/LandlordList';
import LandlordAdd from './pages/LandlordAdd';
import LandlordDocs from './pages/LandlordDocs';
import AdminFields from './pages/AdminFields';
import DealerDocs from './pages/DealerDocs';
import { PERMS } from './auth/perms';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route path="/403" element={<NotAuthorized/>} />

      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><Dashboard/></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/dealers" element={
  <ProtectedRoute need={PERMS.DEALERS_READ}>
    <AppLayout><DealersList/></AppLayout>
  </ProtectedRoute>
} />

<Route path="/dealers/new" element={
  <ProtectedRoute need={PERMS.DEALERS_WRITE}>
    <AppLayout><DealerAdd/></AppLayout>
  </ProtectedRoute>
} />

<Route path="/fin" element={<ProtectedRoute need={PERMS.FIN_READ}><AppLayout><FinList/></AppLayout></ProtectedRoute>} />
<Route path="/fin/new" element={<ProtectedRoute need={PERMS.FIN_WRITE}><AppLayout><FinAdd/></AppLayout></ProtectedRoute>} />
<Route path="/fin/:id/docs" element={<ProtectedRoute need={PERMS.DOCS_READ}><AppLayout><FinDocs/></AppLayout></ProtectedRoute>} />

<Route path="/landlords" element={<ProtectedRoute need={PERMS.LAND_READ}><AppLayout><LandlordList/></AppLayout></ProtectedRoute>} />
<Route path="/landlords/new" element={<ProtectedRoute need={PERMS.LAND_WRITE}><AppLayout><LandlordAdd/></AppLayout></ProtectedRoute>} />
<Route path="/landlords/:id/docs" element={<ProtectedRoute need={PERMS.DOCS_READ}><AppLayout><LandlordDocs/></AppLayout></ProtectedRoute>} />

<Route path="/admin/fields" element={
  <ProtectedRoute need={PERMS.FIELDS_MANAGE}>
    <AppLayout><AdminFields/></AppLayout>
  </ProtectedRoute>
} />

<Route
  path="/dealers/:id/docs"
  element={
    <ProtectedRoute need={PERMS.DOCS_READ}>
      <AppLayout><DealerDocs/></AppLayout>
    </ProtectedRoute>
  }
/>

      <Route path="/customers" element={
        <ProtectedRoute need={PERMS.CUSTOMERS_READ}>
          <AppLayout><Customers/></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/docs" element={
        <ProtectedRoute need={PERMS.DOCS_READ}>
          <AppLayout><Docs/></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
   <ProtectedRoute need={PERMS.RBAC_MANAGE}>
     <AppLayout><AdminUsers/></AppLayout>
   </ProtectedRoute>
} />

<Route path="/admin/roles" element={
  <ProtectedRoute need={PERMS.RBAC_MANAGE}>
    <AppLayout><AdminRoles/></AppLayout>
  </ProtectedRoute>
} />
    </Routes>
  );
}
