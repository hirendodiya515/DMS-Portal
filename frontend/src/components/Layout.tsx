
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FloatingAiChat from './FloatingAiChat';

export default function Layout() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden ml-20 transition-all duration-300">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
            <FloatingAiChat />
        </div>
    );
}
