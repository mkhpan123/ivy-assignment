import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Listings } from "./pages/Listings";
import { ListingDetail } from "./pages/ListingDetail";
import { Rentals } from "./pages/Rentals";
import { RentalDetail } from "./pages/RentalDetail";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Favourites } from "./pages/Favourites";
import { Insights } from "./pages/Insights";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/listings" replace />} />
        <Route path="/listings" element={<ProtectedRoute><Listings /></ProtectedRoute>} />
        <Route path="/listings/:id" element={<ProtectedRoute><ListingDetail /></ProtectedRoute>} />
        <Route path="/rentals" element={<ProtectedRoute><Rentals /></ProtectedRoute>} />
        <Route path="/rentals/:id" element={<ProtectedRoute><RentalDetail /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
