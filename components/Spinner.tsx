import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <div 
        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" 
        style={{ 
          animationDuration: '0.8s', 
          borderWidth: '3px',
          borderStyle: 'solid',
          borderTopColor: '#3B82F6',
          borderRightColor: 'transparent',
          borderBottomColor: '#3B82F6',
          borderLeftColor: 'transparent'
        }}
      ></div>
    </div>
  );
};

export default Spinner;
