/**
 * @module feedbackPrompt
 * @description Builds the prompt for generating a comprehensive end-of-interview
 * feedback report via the LLM.
 */

/**
 * Builds the feedback generation prompt from aggregated answer data.
 *
 * @param {Object} params
 * @param {Array}  params.answers    — Array of { questionId, topic, transcript, score, evaluation, coaching }
 * @param {string} params.language   — 'en' | 'hi' | 'de'
 * @param {number} params.duration   — Interview duration in seconds
 * @returns {string}
 */
export function buildFeedbackPrompt({ answers, language, duration }) {
  const answerSummaries = answers.map((a, i) => {
    return `Question ${i + 1} (${a.topic}):
  Score: ${a.score}/10 — ${a.evaluation}
  Candidate said: "${a.transcript}"
  ${a.coaching ? `Coaching given: "${a.coaching}"` : ''}`;
  }).join('\n\n');

  return `You are an expert interview coach reviewing a completed Software Engineer screening interview.

=== INTERVIEW RESULTS ===
Duration: ${Math.round(duration / 60)} minutes
Language: ${language}
Total Questions: ${answers.length}

${answerSummaries}

=== TASK ===
Generate a comprehensive feedback report. Respond with valid JSON only:

{
  "overallScore": <number 0-100>,
  "communicationScore": <number 0-10>,
  "technicalScore": <number 0-10>,
  "problemSolvingScore": <number 0-10>,
  "strengths": ["<string>", ...],
  "weaknesses": ["<string>", ...],
  "recommendations": ["<string>", ...],
  "summary": "<2-3 sentence overall assessment>"
}

Be specific and actionable. Reference actual answers. Do not be generic.
Respond with valid JSON only. No additional text.`;
}
