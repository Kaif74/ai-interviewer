/**
 * @module evaluationPrompt
 * @description Builds the dynamic user-message prompt for evaluating a
 * candidate's answer. Injects question context, ideal answer, key points,
 * conversation history, and the candidate's latest transcript.
 */

/**
 * @typedef {Object} EvaluationContext
 * @property {Object} question       — Current question object from dataset
 * @property {string} transcript     — Candidate's spoken answer (STT output)
 * @property {Array}  history        — Conversation history [{role, content}]
 * @property {string} language       — 'en' | 'hi' | 'de'
 * @property {boolean} isFollowUp    — Whether this is evaluating a follow-up answer
 * @property {string} [nextQuestionText] — Text of the next question to ask (if moving on)
 */

/**
 * Builds the evaluation prompt injected as the user message.
 *
 * @param {EvaluationContext} ctx
 * @returns {string}
 */
export function buildEvaluationPrompt(ctx) {
  const { question, transcript, history, language, isFollowUp } = ctx;

  const historyBlock = history.length > 0
    ? history.map((h) => `${h.role}: ${h.content}`).join('\n')
    : '(No prior conversation)';

  return `=== INTERVIEW CONTEXT ===

CURRENT QUESTION:
"${question.question[language]}"

TOPIC: ${question.topic}

IDEAL ANSWER SUMMARY:
${question.ideal_answer_summary}

KEY POINTS TO EVALUATE AGAINST:
${question.key_points.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

FOLLOW-UP PROBE (use only if follow-up is needed):
"${question.follow_up_probe[language]}"

COACHING NOTE:
${question.coaching_note}

=== CONVERSATION HISTORY ===
${historyBlock}

=== CANDIDATE'S LATEST RESPONSE ===
"${transcript}"

=== INSTRUCTIONS ===
${isFollowUp
    ? `This is a FOLLOW-UP answer. Evaluate it in the context of both the original and follow-up questions. Do NOT ask another follow-up. Set followUpNeeded to false.`
    : `Evaluate the candidate's answer against the key points above. If the answer is weak (score below 7) and no follow-up has been asked yet, set followUpNeeded to true and provide the follow-up probe as followUpQuestion.`
}

CRITICAL: Your "interviewerReply" must ONLY address the candidate's CURRENT answer.
- Give brief acknowledgment or feedback on what they said.
- If followUpNeeded is true, ask the follow-up probe naturally.
- Do NOT mention, reveal, or transition to any next question. The system handles question transitions automatically.
- Keep interviewerReply to 2-3 sentences focused on the current answer.

LANGUAGE: Respond in the interview language (${language}).
Respond with valid JSON only. No additional text.`;
}
