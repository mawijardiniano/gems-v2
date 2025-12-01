'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jwt from 'jsonwebtoken';
import Navbar from './components/layout/navbar';
import Sidebar from './components/layout/sidebar';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const decoded = jwt.decode(token);

      if (!decoded || decoded.role.toLowerCase() !== 'user') {
        router.replace('/not-authorized');
        return;
      }

      setIsAuthorized(true);
    } catch (err) {
      router.replace('/');
    }
  }, [router]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} />
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="mt-16 px-6">{children}</main>
      </div>
    </div>
  );
}
