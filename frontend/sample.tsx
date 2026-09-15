import React, { useState } from 'react';
import { Search, Menu, Bell, Home, FileText, Bookmark, User } from 'lucide-react';

const CourseCard = ({ image, title, rating, instructor, price, instructorAvatar }) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="relative">
        <img src={image} alt={title} className="w-full h-48 object-cover" />
        <button className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition">
          <Bookmark className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              <span className="text-sm font-medium text-gray-900">{rating}</span>
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">by</span>
              <img src={instructorAvatar} alt={instructor} className="w-4 h-4 rounded-full" />
              <span className="text-xs text-gray-700">{instructor}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">${price}</span>
            <span className="text-sm text-gray-500">.99</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('For you');
  const [activeNavItem, setActiveNavItem] = useState('home');

  const tabs = ['For you', 'Trending Now', 'Most Popular', 'See All'];

  const courses = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=300&fit=crop',
      title: 'Public Speaking',
      rating: '4.7',
      instructor: 'Bella Ariana',
      instructorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop',
      price: '34'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop',
      title: 'Digital Marketing',
      rating: '4.8',
      instructor: 'Marina Putri',
      instructorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop',
      price: '40'
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white px-5 pt-3 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="text-xs">9:41</div>
          <div className="flex gap-1">
            <div className="text-xs">⚡︎</div>
            <div className="text-xs">📶</div>
            <div className="text-xs">🔋</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <Menu className="w-6 h-6" />
          <h1 className="text-lg font-semibold">
            Something<span className="text-yellow-400">New</span>
          </h1>
          <div className="relative">
            <Bell className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search a course"
            className="w-full bg-transparent border border-white/30 rounded-md px-4 py-3 pl-10 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-2 px-5 py-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-5">
          {courses.map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveNavItem('home')}
            className={`flex flex-col items-center gap-1 transition ${
              activeNavItem === 'home' ? 'text-slate-700' : 'text-gray-400'
            }`}
          >
            <Home className="w-6 h-6" fill={activeNavItem === 'home' ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setActiveNavItem('files')}
            className={`flex flex-col items-center gap-1 transition ${
              activeNavItem === 'files' ? 'text-slate-700' : 'text-gray-400'
            }`}
          >
            <FileText className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveNavItem('bookmark')}
            className={`flex flex-col items-center gap-1 transition ${
              activeNavItem === 'bookmark' ? 'text-slate-700' : 'text-gray-400'
            }`}
          >
            <Bookmark className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveNavItem('profile')}
            className={`flex flex-col items-center gap-1 transition ${
              activeNavItem === 'profile' ? 'text-slate-700' : 'text-gray-400'
            }`}
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;