'use client';

import React from 'react';

interface Topic {
  id: string;
  label: string;
  count: number;
}

interface TopicNavigationProps {
  topics: Topic[];
  onTopicSelect: (topicId: string) => void;
}

export const TopicNavigation: React.FC<TopicNavigationProps> = ({ topics, onTopicSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 p-4 border-b bg-gray-50">
      {topics.map(topic => (
        <button
          key={topic.id}
          onClick={() => onTopicSelect(topic.id)}
          className="px-3 py-1 rounded-full text-sm bg-white text-gray-700 hover:bg-gray-100"
        >
          {topic.label} ({topic.count})
        </button>
      ))}
    </div>
  );
};
