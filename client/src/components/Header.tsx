import { useState } from "react";
import { format } from "date-fns";
import AddTransactionModal from "./AddTransactionModal";

interface HeaderProps {
  title: string;
  userId: number;
}

const Header = ({ title, userId }: HeaderProps) => {
  const [showModal, setShowModal] = useState(false);
  const currentDate = new Date();
  const monthYear = format(currentDate, "MMMM yyyy");

  return (
    <>
      <header className="bg-[#1E1E1E] sticky top-0 z-10 border-b border-[#2D2D2D]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <span className="ml-4 bg-[#2D2D2D] text-[#CCCCCC] text-xs px-2 py-1 rounded">
              {monthYear}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="bg-[#2D2D2D] hover:bg-[#1E1E1E] text-[#CCCCCC] p-2 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 01-3.46 0"></path>
              </svg>
            </button>
            
            <button 
              className="bg-[#FFD700] hover:bg-yellow-600 text-[#121212] font-medium px-4 py-2 rounded-lg transition-colors flex items-center"
              onClick={() => setShowModal(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      </header>

      {showModal && (
        <AddTransactionModal 
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userId={userId}
        />
      )}
    </>
  );
};

export default Header;
