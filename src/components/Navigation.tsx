'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Disc3, Library, Heart, Search, ShoppingBag, BarChart3, Menu, X } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Collection', icon: Library },
  { href: '/wantlist', label: 'Wantlist', icon: Heart },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <nav
        className={`fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 p-6 z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-4 right-4 text-zinc-400 hover:text-white p-2"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-10">
          <Disc3 className="w-10 h-10 text-purple-500" />
          <div>
            <h1 className="text-xl font-bold">VinylVault</h1>
            <p className="text-xs text-zinc-500">Matt's Collection</p>
          </div>
        </div>

        <ul className="space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-500">
            <p>Powered by Discogs API</p>
            <p className="text-purple-400">@mattpaine</p>
          </div>
        </div>
      </nav>
    </>
  );
}
