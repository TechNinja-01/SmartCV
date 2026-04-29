import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { usePuterStore } from '~/lib/puter';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { auth } = usePuterStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const handleLogout = () => {
    // This is correct: it calls the sign-out function from your store.
    auth.signOut(); 
  };

  useEffect(() => {
    const saved = localStorage.getItem('smartcv_theme');
    setIsDarkMode(saved === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartcv_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartcv_theme', 'light');
    }
  };

  return (
    <nav className='navbar dark:text-gray-100'>
      <Link to="/">
        <p className='text-2xl font-bold text-gradient'>SmartCV</p>
      </Link>

      <div className='flex gap-3 items-center max-md:hidden'>
        {/* Navigation Links */}
        <Link
          to="/upload"
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            currentPath === '/upload'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-200 dark:hover:text-white'
          }`}
        >
          ATS Review
        </Link>
        <Link
          to="/interview"
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            currentPath === '/interview'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-200 dark:hover:text-white'
          }`}
        >
          Interview Prep
        </Link>
        <Link
          to="/cover-letter"
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            currentPath === '/cover-letter'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-200 dark:hover:text-white'
          }`}
        >
          Cover Letter
        </Link>
        <Link
          to="/jobs"
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            currentPath === '/jobs'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-200 dark:hover:text-white'
          }`}
        >
          Job Search
        </Link>

        {/* ⭐ ADDED LOGOUT BUTTON FOR DESKTOP VIEW ⭐ */}
        {auth.isAuthenticated && (
          <button 
            onClick={handleLogout} 
            className="px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-all shadow-md"
          >
            Log Out
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className='md:hidden'>
        <select
          className='px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-medium text-gray-800 dark:text-gray-100'
          value={currentPath}
          onChange={(e) => navigate(e.target.value)}
        >
          <option value="/">Dashboard</option>
          <option value="/upload">ATS Review</option>
          <option value="/interview">Interview Prep</option>
          <option value="/cover-letter">Cover Letter</option>
          <option value="/jobs">Job Search</option>
        </select>
        
        {/* Existing Logout Button for Mobile View */}
        {auth.isAuthenticated && (
          <button 
            onClick={handleLogout} 
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-all shadow-md"
          >
            Log Out
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="mt-3 px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}

export default Navbar