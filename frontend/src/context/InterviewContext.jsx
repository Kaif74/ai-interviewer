/**
 * @module InterviewContext
 * @description Global interview state management using React Context + useReducer.
 * Provides a centralized store for interview session data, recordings,
 * and UI state across all pages.
 */

import { createContext, useContext, useReducer } from 'react';

/** @enum {string} Interview status phases */
export const Status = {
  LANDING: 'landing',
  STARTING: 'starting',
  INTERVIEW: 'interview',
  PROCESSING: 'processing',
  FEEDBACK_LOADING: 'feedback_loading',
  FEEDBACK: 'feedback',
  ERROR: 'error',
};

const initialState = {
  /** Session */
  interviewId: null,
  language: 'en',
  status: Status.LANDING,
  error: null,

  /** Current question */
  currentQuestion: '',
  questionNumber: 0,
  totalQuestions: 10,

  /** Recording & processing */
  isRecording: false,
  isProcessing: false,
  transcript: '',
  aiReply: '',
  aiAudio: '',

  /** Scores (per-question, accumulated during interview) */
  scores: [],

  /** Feedback report (populated at end) */
  feedback: null,

  /** Whether interview is completed */
  completed: false,
};

/**
 * Reducer for interview state transitions.
 * @param {Object} state
 * @param {Object} action — { type, payload }
 * @returns {Object} New state
 */
function interviewReducer(state, action) {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };

    case 'START_INTERVIEW':
      return {
        ...state,
        status: Status.STARTING,
        error: null,
      };

    case 'INTERVIEW_STARTED':
      return {
        ...state,
        status: Status.INTERVIEW,
        interviewId: action.payload.interviewId,
        currentQuestion: action.payload.question,
        questionNumber: action.payload.questionNumber,
        totalQuestions: action.payload.totalQuestions,
        aiAudio: action.payload.audio || '',
        aiReply: action.payload.question,
        transcript: '',
        scores: [],
        isProcessing: false,

      };

    case 'SET_RECORDING':
      return { ...state, isRecording: action.payload };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
        status: action.payload ? Status.PROCESSING : Status.INTERVIEW,
      };

    case 'RESPONSE_RECEIVED':
      return {
        ...state,
        isProcessing: false,
        status: Status.INTERVIEW,
        transcript: action.payload.transcript,
        aiReply: action.payload.reply,
        aiAudio: action.payload.audio || '',
        questionNumber: action.payload.questionNumber,
        currentQuestion: action.payload.reply,
        scores: [
          ...state.scores,
          {
            questionNumber: action.payload.questionNumber,
            score: action.payload.score,
            evaluation: action.payload.evaluation,
          },
        ],
      };

    case 'INTERVIEW_COMPLETE':
      return {
        ...state,
        isProcessing: false,
        status: Status.INTERVIEW,
        transcript: action.payload.transcript,
        aiReply: action.payload.reply,
        aiAudio: action.payload.audio || '',
        completed: true,
      };

    case 'LOADING_FEEDBACK':
      return {
        ...state,
        status: Status.FEEDBACK_LOADING,
      };

    case 'FEEDBACK_RECEIVED':
      return {
        ...state,
        status: Status.FEEDBACK,
        feedback: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        status: Status.ERROR,
        error: action.payload,
        isProcessing: false,
        isRecording: false,
      };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

const InterviewContext = createContext(null);

/**
 * Provider component wrapping the app with interview state.
 */
export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  return (
    <InterviewContext.Provider value={{ state, dispatch }}>
      {children}
    </InterviewContext.Provider>
  );
}

/**
 * Hook to access interview state and dispatch.
 * @returns {{ state: Object, dispatch: Function }}
 */
export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within InterviewProvider');
  }
  return context;
}
