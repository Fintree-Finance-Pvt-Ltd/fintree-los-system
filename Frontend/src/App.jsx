// import { Routes, Route } from 'react-router-dom';
// import AppLayout from './layout/AppLayout';
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import Dealers from './pages/Dealers';
// import Customers from './pages/Customers';
// import Docs from './pages/Docs';
// import DealersList from './pages/DealersList';
// import DealerAdd from './pages/DealerAdd';
// import ProtectedRoute from './auth/ProtectedRoute';
// import NotAuthorized from './pages/NotAuthorized';
// import AdminUsers from './pages/AdminUsers';
// import AdminRoles from './pages/AdminRoles';
// import FinList from './pages/FinList';
// import FinAdd from './pages/FinAdd';
// import FinDocs from './pages/FinDocs';

// import LandlordList from './pages/LandlordList';
// import LandlordAdd from './pages/LandlordAdd';
// import LandlordDocs from './pages/LandlordDocs';
// import AdminFields from './pages/AdminFields';
// import DealerDocs from './pages/DealerDocs';
// import { PERMS } from './auth/perms';

// export default function App() {
//   return (
//     <Routes>
//       <Route path="/login" element={<Login/>} />
//       <Route path="/403" element={<NotAuthorized/>} />

//       <Route path="/" element={
//         <ProtectedRoute>
//           <AppLayout><Dashboard/></AppLayout>
//         </ProtectedRoute>
//       } />

//       <Route path="/dealers" element={
//   <ProtectedRoute need={PERMS.DEALERS_READ}>
//     <AppLayout><DealersList/></AppLayout>
//   </ProtectedRoute>
// } />

// <Route path="/dealers/new" element={
//   <ProtectedRoute need={PERMS.DEALERS_WRITE}>
//     <AppLayout><DealerAdd/></AppLayout>
//   </ProtectedRoute>
// } />

// <Route path="/fin" element={<ProtectedRoute need={PERMS.FIN_READ}><AppLayout><FinList/></AppLayout></ProtectedRoute>} />
// <Route path="/fin/new" element={<ProtectedRoute need={PERMS.FIN_WRITE}><AppLayout><FinAdd/></AppLayout></ProtectedRoute>} />
// <Route path="/fin/:id/docs" element={<ProtectedRoute need={PERMS.DOCS_READ}><AppLayout><FinDocs/></AppLayout></ProtectedRoute>} />

// <Route path="/landlords" element={<ProtectedRoute need={PERMS.LAND_READ}><AppLayout><LandlordList/></AppLayout></ProtectedRoute>} />
// <Route path="/landlords/new" element={<ProtectedRoute need={PERMS.LAND_WRITE}><AppLayout><LandlordAdd/></AppLayout></ProtectedRoute>} />
// <Route path="/landlords/:id/docs" element={<ProtectedRoute need={PERMS.DOCS_READ}><AppLayout><LandlordDocs/></AppLayout></ProtectedRoute>} />

// <Route path="/admin/fields" element={
//   <ProtectedRoute need={PERMS.FIELDS_MANAGE}>
//     <AppLayout><AdminFields/></AppLayout>
//   </ProtectedRoute>
// } />

// <Route
//   path="/dealers/:id/docs"
//   element={
//     <ProtectedRoute need={PERMS.DOCS_READ}>
//       <AppLayout><DealerDocs/></AppLayout>
//     </ProtectedRoute>
//   }
// />

//       <Route path="/customers" element={
//         <ProtectedRoute need={PERMS.CUSTOMERS_READ}>
//           <AppLayout><Customers/></AppLayout>
//         </ProtectedRoute>
//       } />

//       <Route path="/docs" element={
//         <ProtectedRoute need={PERMS.DOCS_READ}>
//           <AppLayout><Docs/></AppLayout>
//         </ProtectedRoute>
//       } />

//       <Route path="/admin/users" element={
//    <ProtectedRoute need={PERMS.RBAC_MANAGE}>
//      <AppLayout><AdminUsers/></AppLayout>
//    </ProtectedRoute>
// } />

// <Route path="/admin/roles" element={
//   <ProtectedRoute need={PERMS.RBAC_MANAGE}>
//     <AppLayout><AdminRoles/></AppLayout>
//   </ProtectedRoute>
// } />
//     </Routes>
//   );
// }

// src/App.jsx (updated)
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DealersList from './pages/DealersList';
import DealerAdd from './pages/DealerAdd';
import DealerDocs from './pages/DealerDocs';
import Customers from './pages/Customers';
import Docs from './pages/Docs';
import ProtectedRoute from './auth/ProtectedRoute';
import NotAuthorized from './pages/NotAuthorized';
import AdminUsers from './pages/AdminUsers';
import AdminRoles from './pages/AdminRoles';
import AdminFields from './pages/AdminFields';
import FinList from './pages/FinList';
import FinAdd from './pages/FinAdd';
import FinDocs from './pages/FinDocs';
import LandlordList from './pages/LandlordList';
import LandlordAdd from './pages/LandlordAdd';
import LandlordDocs from './pages/LandlordDocs';
import { PERMS } from './auth/perms';
import ModuleEntityDocs from './pages/ModuleEntityDocs';


// NEW
import ModuleLayout from './modules/ModuleLayout';
import LoanBooking from './modules/LoanBooking';
import LoansList from './modules/LoansList';

// Map URL module → permission segment
const PROD_KEY = { ev: 'EV', 'mobile-loan': 'MOBILE', 'education-loan': 'EDU' };
const LEND_KEY = { ev: 'EV', adikosh: 'ADIKOSH', 'gq-fsf': 'GQFSF', 'gq-nonfsf': 'GQNONFSF', bl: 'BL' };
function permFor(section, mod, action /* 'READ' | 'WRITE' */) {
  const seg = section === 'product' ? PROD_KEY[mod] : LEND_KEY[mod];
  if (!seg) return undefined;
  const key = `${section === 'product' ? 'PROD' : 'LEND'}_${seg}_${action}`; // e.g. PROD_EV_READ
  return PERMS[key]; // returns the string code (same as key)
}

function ModuleGuard({ section, action, children }) {
  const { module } = useParams();
  const need = permFor(section, module, action);
  return need ? (
    <ProtectedRoute need={need}>{children}</ProtectedRoute>
  ) : (
    <ProtectedRoute>{children}</ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<NotAuthorized />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Existing CRUD routes */}
      <Route
        path="/dealers"
        element={
          <ProtectedRoute need={PERMS.DEALERS_READ}>
            <AppLayout><DealersList /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dealers/new"
        element={
          <ProtectedRoute need={PERMS.DEALERS_WRITE}>
            <AppLayout><DealerAdd /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dealers/:id/docs"
        element={
          <ProtectedRoute need={PERMS.DOCS_READ}>
            <AppLayout><DealerDocs /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/fin"
        element={
          <ProtectedRoute need={PERMS.FIN_READ}>
            <AppLayout><FinList /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fin/new"
        element={
          <ProtectedRoute need={PERMS.FIN_WRITE}>
            <AppLayout><FinAdd /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fin/:id/docs"
        element={
          <ProtectedRoute need={PERMS.DOCS_READ}>
            <AppLayout><FinDocs /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/landlords"
        element={
          <ProtectedRoute need={PERMS.LAND_READ}>
            <AppLayout><LandlordList /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlords/new"
        element={
          <ProtectedRoute need={PERMS.LAND_WRITE}>
            <AppLayout><LandlordAdd /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlords/:id/docs"
        element={
          <ProtectedRoute need={PERMS.DOCS_READ}>
            <AppLayout><LandlordDocs /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/fields"
        element={
          <ProtectedRoute need={PERMS.FIELDS_MANAGE}>
            <AppLayout><AdminFields /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute need={PERMS.RBAC_MANAGE}>
            <AppLayout><AdminUsers /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute need={PERMS.RBAC_MANAGE}>
            <AppLayout><AdminRoles /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= MODULE ROUTES ================= */}
      {/* Product */}
      <Route
        path="/product/:module"
        element={
          <ModuleGuard section="product" action="READ">
            <AppLayout><ModuleLayout section="product" /></AppLayout>
          </ModuleGuard>
        }
      >
        <Route index element={<Navigate to="pending" replace />} />
        <Route
          path="booking"
          element={
            <ModuleGuard section="product" action="WRITE">
              <LoanBooking />
            </ModuleGuard>
          }
        />
        <Route path="pending"  element={<LoansList status="PENDING" />} />
        <Route path="approved" element={<LoansList status="APPROVED" />} />
        <Route path="login"    element={<LoansList status="LOGIN" />} />
        <Route path="rejected" element={<LoansList status="REJECTED" />} />
        <Route path="all"      element={<LoansList />} />
      </Route>

      <Route
  path="/product/:module/:id/docs"
  element={
    <ProtectedRoute need={PERMS.DOCS_READ}>
      <AppLayout><ModuleEntityDocs /></AppLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/lender/:module/:id/docs"
  element={
    <ProtectedRoute need={PERMS.DOCS_READ}>
      <AppLayout><ModuleEntityDocs /></AppLayout>
    </ProtectedRoute>
  }
/>

      {/* Lender */}
      <Route
        path="/lender/:module"
        element={
          <ModuleGuard section="lender" action="READ">
            <AppLayout><ModuleLayout section="lender" /></AppLayout>
          </ModuleGuard>
        }
      >
        <Route index element={<Navigate to="pending" replace />} />
        <Route
          path="booking"
          element={
            <ModuleGuard section="lender" action="WRITE">
              <LoanBooking />
            </ModuleGuard>
          }
        />
        <Route path="pending"  element={<LoansList status="PENDING" />} />
        <Route path="approved" element={<LoansList status="APPROVED" />} />
        <Route path="login"    element={<LoansList status="LOGIN" />} />
        <Route path="rejected" element={<LoansList status="REJECTED" />} />
        <Route path="all"      element={<LoansList />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<div style={{ padding: 24 }}>Not Found</div>} />
    </Routes>
  );
}
