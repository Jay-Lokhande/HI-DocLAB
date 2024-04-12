 "use client"
import React, { useState } from 'react';

interface DocSection {
  title: string;
  content: string;
}

const Page = () => {
  const [selectedSection, setSelectedSection] = useState<DocSection | null>(null);

  const sections: DocSection[] = [
    { title: 'Getting Started', content: 'This is the getting started guide for our library.' },
    { title: 'Usage', content: 'Learn how to use our library with examples and explanations.' },
    // Add more sections as needed
  ];

  const handleSectionClick = (section: DocSection) => {
    setSelectedSection(section);
  };

  return (
    <div>
      <h1>Documentation</h1>
      <div>
        {sections.map((section, index) => (
          <button key={index} onClick={() => handleSectionClick(section)}>
            {section.title}
          </button>
        ))}
      </div>
      <div>
        {selectedSection && (
          <>
            <h2>{selectedSection.title}</h2>
            <p>{selectedSection.content}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Page;
