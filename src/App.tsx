import React from "react";
import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { HeroBooking } from "./components/HeroBooking";
import { InstitutesSection } from "./components/InstitutesSection";
import { InstituteDetail } from "./components/InstituteDetail";
import { Footer } from "./components/Footer";
import { AboutSection } from "./components/AboutSection";
import { GallerySection } from "./components/GallerySection";
import { ContactSection } from "./components/ContactSection";
import { BookingFormPage } from "./components/BookingFormPage";
import AdminLogin from "./components/AdminLogin";
import AdminPage from "./components/AdminPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="app-root">
        <Header />
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <HeroBooking />
                  <InstitutesSection />
                </>
              }
            />
            <Route path="/about" element={<AboutSection />} />
            <Route path="/institutes" element={<InstitutesSection />} />
            <Route path="/institute/:id" element={<InstituteDetail />} />
            <Route path="/gallery" element={<GallerySection />} />
            <Route path="/contact" element={<ContactSection />} />
            <Route path="/booking" element={<BookingFormPage />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
};

export default App;


