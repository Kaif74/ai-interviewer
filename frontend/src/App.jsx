/**
 * @module App
 * @description Root application component with React Router and InterviewContext.
 * Routes: / (Landing), /interview, /feedback
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { InterviewProvider } from './context/InterviewContext';
import LandingPage from './pages/LandingPage';
import InterviewPage from './pages/InterviewPage';
import FeedbackPage from './pages/FeedbackPage';
import QuestionsManagePage from './pages/QuestionsManagePage';

export default function App() {
  return (
    <InterviewProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/manage-questions" element={<QuestionsManagePage />} />
        </Routes>
      </BrowserRouter>
    </InterviewProvider>
  );
}
