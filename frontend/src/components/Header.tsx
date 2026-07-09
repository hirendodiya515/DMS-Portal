import { useState, useEffect, useRef } from 'react';
import { Bell, Search, LogOut, Check, FileText, Settings, Target, AlertTriangle, Monitor, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ProfileModal from './ProfileModal';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  documentId?: string;
}

interface SearchResult {
  id: string;
  title: string;
  category: string;
  route: string;
  subtitle?: string;
}

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
      setShowSearchSuggestions(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = (route: string) => {
    navigate(route);
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Document': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'Equipment': return <Settings className="w-4 h-4 text-orange-500" />;
      case 'Objective': return <Target className="w-4 h-4 text-green-500" />;
      case 'Risk': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'Setting': return <Settings className="w-4 h-4 text-slate-500" />;
      case 'Page': return <Monitor className="w-4 h-4 text-purple-500" />;
      default: return <ExternalLink className="w-4 h-4 text-slate-400" />;
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 sticky top-0 z-20 shadow-soft">
      <div className="flex items-center gap-4 flex-1">
        <div className="mr-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                DMS - BRL
            </h1>
        </div>
        <div className="relative w-96" ref={searchRef}>
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
          <input 
            type="text" 
            placeholder="Search documents, screens, risks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSearchSuggestions(true)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100/50 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
          />

          {showSearchSuggestions && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-premium border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-[min(80vh,400px)] overflow-y-auto custom-scrollbar">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.id}-${index}`}
                    onClick={() => handleSuggestionClick(result.route)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                  >
                    <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg">
                      {getCategoryIcon(result.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800 truncate">{result.title}</p>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {result.category}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{result.subtitle}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSearchSuggestions && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-6 text-center animate-in fade-in slide-in-from-top-2 duration-200">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition hover:scale-105 active:scale-95"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-premium border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-800 leading-snug">{notification.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="text-slate-400 hover:text-blue-600 self-start"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button 
            onClick={() => setShowProfileModal(true)}
            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform active:scale-95"
            title="View Profile"
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-450 hover:text-red-650 hover:bg-red-50 rounded-xl transition ml-2 hover:scale-105 active:scale-95"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </header>
  );
}
