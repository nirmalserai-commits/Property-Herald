import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { MagazinePage } from './pages/MagazinePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TokenPurchasePage } from './pages/TokenPurchasePage';
import { InvoicePage } from './pages/InvoicePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminListings } from './pages/admin/AdminListings';
import { AdminTokenSettings } from './pages/admin/AdminTokenSettings';
import { AdminVerifications } from './pages/admin/AdminVerifications';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminBroadcast } from './pages/admin/AdminBroadcast';
import { AdminAmbassadors } from './pages/admin/AdminAmbassadors';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminSbiAds } from './pages/admin/AdminSbiAds';
import { EmiCalculatorPage } from './pages/EmiCalculatorPage';
import { NriPortalPage } from './pages/NriPortalPage';
import { BuyerPassportPage } from './pages/BuyerPassportPage';
import PropertyJourneyPage from './pages/PropertyJourneyPage';
import { SavedSearchesPage } from './pages/SavedSearchesPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ReferralPage } from './pages/ReferralPage';
import { MarketReportsPage } from './pages/MarketReportsPage';
import { PartnersPage } from './pages/PartnersPage';
import { LiveEventsPage } from './pages/LiveEventsPage';
import { AdminLiveEvents } from './pages/admin/AdminLiveEvents';
import { AdminPartners } from './pages/admin/AdminPartners';
import { AdminBoardroom } from './pages/admin/AdminBoardroom';
import { AdminDigestLog } from './pages/admin/AdminDigestLog';
import { AdminNoraChat } from './pages/admin/AdminNoraChat';
import { AdminNitaChat } from './pages/admin/AdminNitaChat';
import { BuyerRegisterPage } from './pages/BuyerRegisterPage';
import { ListingsPage } from './pages/ListingsPage';
import { PricingPage } from './pages/PricingPage';
import { SubmitListingPage } from './pages/SubmitListingPage';
import { HomeLoansPage } from './pages/HomeLoansPage';
import { BoardroomPage } from './pages/BoardroomPage';
import { AmbassadorsPage } from './pages/AmbassadorsPage';
import { AdminPublicAmbassadors } from './pages/admin/AdminPublicAmbassadors';
import { GreetingsVouchersPage } from './pages/GreetingsVouchersPage';
import { NakshaReportPage } from './pages/NakshaReportPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { HallOfFamePage } from './pages/HallOfFamePage';
import { TermsPage } from './pages/TermsPage';
import { FoundingPartnerPage, FoundingAgencyPage } from './pages/FoundingPages';
import { DubaiPage } from './pages/DubaiPage';
import { DeveloperDashboardPage } from './pages/DeveloperDashboardPage';
import { AdminHallOfFame } from './pages/admin/AdminHallOfFame';
import { AdminAssets } from './pages/admin/AdminAssets';
import { AdminLocations } from './pages/admin/AdminLocations';
import { AdminRegistrations } from './pages/admin/AdminRegistrations';
import { AdminDaughterPictures } from './pages/admin/AdminDaughterPictures';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const ADMIN_EMAIL = 'nirmalserai@gmail.com';

function useSiteFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({ maintenance_mode: false, nora_rest_mode: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('site_flags').select('flag_name, flag_value').then(({ data }) => {
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((f: { flag_name: string; flag_value: boolean }) => { map[f.flag_name] = f.flag_value; });
        setFlags(map);
      }
      setLoaded(true);
    });
  }, []);

  return { flags, loaded };
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const { flags, loaded } = useSiteFlags();
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!loaded) return null;

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginPage = location.pathname === '/login';
  const isMaintenance = flags.maintenance_mode;

  // Maintenance mode: only admin can access, everyone else sees maintenance
  if (isMaintenance && !isAdmin) {
    return <MaintenancePage />;
  }

  // Admin routes: only admin can access
  if (isAdminRoute && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/buyer" element={<BuyerRegisterPage />} />
      <Route path="/listings" element={<Layout><ListingsPage /></Layout>} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/developer-dashboard" element={<DeveloperDashboardPage />} />
      <Route path="/tokens" element={<TokenPurchasePage />} />
      <Route path="/invoice/:id" element={<InvoicePage />} />
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/directory" element={<Layout><DirectoryPage /></Layout>} />
      <Route path="/directory/:citySlug" element={<Layout><DirectoryPage /></Layout>} />
      <Route path="/magazine" element={<Layout><MagazinePage /></Layout>} />
      <Route path="/emi-calculator" element={<EmiCalculatorPage />} />
      <Route path="/nri-portal" element={<NriPortalPage />} />
      <Route path="/buyer-passport" element={<BuyerPassportPage />} />
      <Route path="/my-journey" element={<PropertyJourneyPage />} />
      <Route path="/saved-searches" element={<SavedSearchesPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="/referral" element={<ReferralPage />} />
      <Route path="/market-reports" element={<MarketReportsPage />} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route path="/live-events" element={<LiveEventsPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/submit-listing" element={<SubmitListingPage />} />
      <Route path="/home-loans" element={<HomeLoansPage />} />
      <Route path="/ambassadors" element={<AmbassadorsPage />} />
      <Route path="/dubai" element={<Layout><DubaiPage /></Layout>} />
      <Route path="/naksha-report" element={<NakshaReportPage />} />
      <Route path="/greetings" element={<GreetingsVouchersPage />} />
      <Route path="/hall-of-fame" element={<HallOfFamePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/founding-partner" element={<FoundingPartnerPage />} />
      <Route path="/founding-agency" element={<FoundingAgencyPage />} />
      <Route path="/boardroom" element={<BoardroomPage persona="neena" />} />
      <Route path="/boardroom/nora" element={<BoardroomPage persona="nora" />} />
      <Route path="/boardroom/nita" element={<BoardroomPage persona="nita" />} />
      {/* Admin routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/registrations" element={<AdminRegistrations />} />
      <Route path="/admin/listings" element={<AdminListings />} />
      <Route path="/admin/token-settings" element={<AdminTokenSettings />} />
      <Route path="/admin/verifications" element={<AdminVerifications />} />
      <Route path="/admin/locations" element={<AdminLocations />} />
      <Route path="/admin/hall-of-fame" element={<AdminHallOfFame />} />
      <Route path="/admin/daughter-pictures" element={<AdminDaughterPictures />} />
      <Route path="/admin/assets" element={<AdminAssets />} />
      <Route path="/admin/analytics" element={<AdminAnalytics />} />
      <Route path="/admin/broadcast" element={<AdminBroadcast />} />
      <Route path="/admin/ambassadors" element={<AdminAmbassadors />} />
      <Route path="/admin/public-ambassadors" element={<AdminPublicAmbassadors />} />
      <Route path="/admin/banners" element={<AdminBanners />} />
      <Route path="/admin/sbi-ads" element={<AdminSbiAds />} />
      <Route path="/admin/live-events" element={<AdminLiveEvents />} />
      <Route path="/admin/partners" element={<AdminPartners />} />
      <Route path="/admin/boardroom" element={<AdminBoardroom />} />
      <Route path="/admin/nora" element={<AdminNoraChat />} />
      <Route path="/admin/nita" element={<AdminNitaChat />} />
      <Route path="/admin/digest-log" element={<AdminDigestLog />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
