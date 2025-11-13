
import React, { useState, useCallback } from 'react';
import UniversityPortal from './pages/University';
import StudentWallet from './pages/StudentWallet';
import EmployerVerifier from './pages/EmployerVerifier';

type Page = 'university' | 'student' | 'employer';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('university');

  const NavButton = useCallback(({ activePage, targetPage, children }: { activePage: Page, targetPage: Page, children: React.ReactNode }) => {
    const isActive = activePage === targetPage;
    const baseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200";
    const activeClasses = "bg-indigo-600 text-white";
    const inactiveClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";

    return (
      <button
        onClick={() => setPage(targetPage)}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      >
        {children}
      </button>
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="bg-gray-800 shadow-lg">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            AcademiChain
          </h1>
          <div className="flex space-x-4">
            <NavButton activePage={page} targetPage="university">University Issuer</NavButton>
            <NavButton activePage={page} targetPage="student">Student Wallet</NavButton>
            <NavButton activePage={page} targetPage="employer">Employer Verifier</NavButton>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-6 py-8">
        {page === 'university' && <UniversityPortal />}
        {page === 'student' && <StudentWallet />}
        {page === 'employer' && <EmployerVerifier />}
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>AcademiChain MVP - Demo Environment</p>
      </footer>
    </div>
  );
};

export default App;
