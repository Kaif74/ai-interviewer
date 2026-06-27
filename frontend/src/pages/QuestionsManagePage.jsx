/**
 * @module QuestionsManagePage
 * @description Admin page for managing the interview question set.
 * Full CRUD operations — create, read, update, delete — with a premium
 * glassmorphism UI matching the rest of the application.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../services/api';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  BookOpen,
} from 'lucide-react';

/** Blank question template for the create form */
const EMPTY_QUESTION = {
  topic: '',
  question: { en: '', hi: '', de: '' },
  key_points: [''],
  ideal_answer_summary: '',
  follow_up_probe: { en: '', hi: '', de: '' },
  coaching_note: '',
};

/** Topic color mapping */
const TOPIC_COLORS = {
  background: '#8b5cf6',
  data_structures: '#06b6d4',
  system_design: '#f59e0b',
  algorithms: '#ef4444',
  databases: '#10b981',
  problem_solving: '#ec4899',
  concurrency: '#f97316',
  api_design: '#6366f1',
  devops: '#14b8a6',
  behavioral: '#a855f7',
  general: '#64748b',
};

export default function QuestionsManagePage() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Expanded question (inline detail view)
  const [expandedId, setExpandedId] = useState(null);

  // Edit mode
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Create mode
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_QUESTION });

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  // ─── Data Loading ──────────────────────────────────────────────

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestions();
      setQuestions(data.questions);
      setMeta(data.meta);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // ─── CRUD Handlers ─────────────────────────────────────────────

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      // Clean empty key_points
      const cleaned = {
        ...createForm,
        key_points: createForm.key_points.filter((kp) => kp.trim() !== ''),
      };
      await createQuestion(cleaned);
      setIsCreating(false);
      setCreateForm({ ...EMPTY_QUESTION, key_points: [''] });
      setSuccessMsg('Question created successfully!');
      await loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to create question');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    setError(null);
    try {
      const cleaned = {
        ...editForm,
        key_points: editForm.key_points.filter((kp) => kp.trim() !== ''),
      };
      await updateQuestion(editingId, cleaned);
      setEditingId(null);
      setEditForm(null);
      setSuccessMsg('Question updated successfully!');
      await loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError(null);
    try {
      await deleteQuestion(id);
      setDeleteConfirmId(null);
      if (expandedId === id) setExpandedId(null);
      if (editingId === id) { setEditingId(null); setEditForm(null); }
      setSuccessMsg('Question deleted successfully!');
      await loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to delete question');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (index) => {
    if (index <= 0) return;
    const q = questions[index];
    const prev = questions[index - 1];
    try {
      await updateQuestion(q.id, { order: prev.order });
      await updateQuestion(prev.id, { order: q.order });
      await loadQuestions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMoveDown = async (index) => {
    if (index >= questions.length - 1) return;
    const q = questions[index];
    const next = questions[index + 1];
    try {
      await updateQuestion(q.id, { order: next.order });
      await updateQuestion(next.id, { order: q.order });
      await loadQuestions();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditing = (q) => {
    setEditingId(q.id);
    setEditForm({
      topic: q.topic,
      question: { ...q.question },
      key_points: [...q.key_points, ''],
      ideal_answer_summary: q.ideal_answer_summary,
      follow_up_probe: { ...q.follow_up_probe },
      coaching_note: q.coaching_note,
    });
    setExpandedId(q.id);
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  // ─── Form Helpers ──────────────────────────────────────────────

  const updateFormField = (form, setForm, path, value) => {
    const newForm = { ...form };
    const keys = path.split('.');
    let obj = newForm;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = Array.isArray(obj[keys[i]]) ? [...obj[keys[i]]] : { ...obj[keys[i]] };
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setForm(newForm);
  };

  const addKeyPoint = (form, setForm) => {
    setForm({ ...form, key_points: [...form.key_points, ''] });
  };

  const removeKeyPoint = (form, setForm, index) => {
    const newKps = form.key_points.filter((_, i) => i !== index);
    setForm({ ...form, key_points: newKps.length > 0 ? newKps : [''] });
  };

  const updateKeyPoint = (form, setForm, index, value) => {
    const newKps = [...form.key_points];
    newKps[index] = value;
    setForm({ ...form, key_points: newKps });
  };

  // ─── Form Component ──────────────────────────────────────────

  const renderForm = (form, setForm, onSave, onCancel, saveLabel = 'Save') => (
    <div className="manage-form" style={{ padding: '1.5rem' }}>
      {/* Topic */}
      <div className="manage-form-group">
        <label className="manage-label">Topic</label>
        <input
          className="manage-input"
          value={form.topic}
          onChange={(e) => updateFormField(form, setForm, 'topic', e.target.value)}
          placeholder="e.g., system_design, algorithms, behavioral"
        />
      </div>

      {/* Question Text (all languages) */}
      <div className="manage-form-group">
        <label className="manage-label">Question Text</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['en', 'hi', 'de'].map((lang) => (
            <div key={lang} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
              <span className="manage-lang-badge">{lang.toUpperCase()}</span>
              <textarea
                className="manage-textarea"
                value={form.question[lang] || ''}
                onChange={(e) => updateFormField(form, setForm, `question.${lang}`, e.target.value)}
                placeholder={`Question text in ${lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'German'}${lang === 'en' ? ' (required)' : ' (optional)'}`}
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Key Points */}
      <div className="manage-form-group">
        <label className="manage-label">Key Points</label>
        {form.key_points.map((kp, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', minWidth: '1.5rem' }}>{i + 1}.</span>
            <input
              className="manage-input"
              value={kp}
              onChange={(e) => updateKeyPoint(form, setForm, i, e.target.value)}
              placeholder="Expected key point..."
              style={{ flex: 1 }}
            />
            <button
              className="manage-icon-btn manage-icon-btn-danger"
              onClick={() => removeKeyPoint(form, setForm, i)}
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button className="manage-add-btn" onClick={() => addKeyPoint(form, setForm)}>
          <Plus size={14} /> Add Key Point
        </button>
      </div>

      {/* Ideal Answer Summary */}
      <div className="manage-form-group">
        <label className="manage-label">Ideal Answer Summary</label>
        <textarea
          className="manage-textarea"
          value={form.ideal_answer_summary}
          onChange={(e) => updateFormField(form, setForm, 'ideal_answer_summary', e.target.value)}
          placeholder="Summary of what a strong answer looks like..."
          rows={3}
        />
      </div>

      {/* Follow-up Probe (all languages) */}
      <div className="manage-form-group">
        <label className="manage-label">Follow-Up Probe</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['en', 'hi', 'de'].map((lang) => (
            <div key={lang} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
              <span className="manage-lang-badge">{lang.toUpperCase()}</span>
              <textarea
                className="manage-textarea"
                value={form.follow_up_probe[lang] || ''}
                onChange={(e) => updateFormField(form, setForm, `follow_up_probe.${lang}`, e.target.value)}
                placeholder={`Follow-up probe in ${lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'German'}`}
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Coaching Note */}
      <div className="manage-form-group">
        <label className="manage-label">Coaching Note</label>
        <textarea
          className="manage-textarea"
          value={form.coaching_note}
          onChange={(e) => updateFormField(form, setForm, 'coaching_note', e.target.value)}
          placeholder="Brief coaching guidance for weak answers..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button className="manage-btn manage-btn-ghost" onClick={onCancel} disabled={saving}>
          <X size={16} /> Cancel
        </button>
        <button
          className="manage-btn manage-btn-primary"
          onClick={onSave}
          disabled={saving || !form.question.en?.trim() || !form.topic?.trim()}
        >
          {saving ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
              Saving...
            </span>
          ) : (
            <><Save size={16} /> {saveLabel}</>
          )}
        </button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '960px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem',
          gap: '1.25rem',
        }}
      >
        {/* Page Header */}
        <div className="animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              <BookOpen size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Question Bank
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              {meta?.domain || 'Manage your interview questions'} · {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="manage-btn manage-btn-primary"
            onClick={() => {
              setIsCreating(!isCreating);
              setEditingId(null);
              setEditForm(null);
              setCreateForm({ ...EMPTY_QUESTION, key_points: [''] });
            }}
            id="add-question-btn"
          >
            <Plus size={18} /> Add Question
          </button>
        </div>

        {/* Success Toast */}
        {successMsg && (
          <div className="manage-toast manage-toast-success animate-fade-in-up">
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="manage-toast manage-toast-error animate-fade-in-up">
            <AlertTriangle size={18} /> {error}
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Create Form */}
        {isCreating && (
          <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--glass-border)',
              background: 'rgba(99, 102, 241, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Plus size={18} style={{ color: 'var(--color-primary-light)' }} />
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>New Question</span>
            </div>
            {renderForm(createForm, setCreateForm, handleCreate, () => setIsCreating(false), 'Create Question')}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        )}

        {/* Questions List */}
        {!loading && questions.map((q, index) => {
          const isExpanded = expandedId === q.id;
          const isEditing = editingId === q.id;
          const topicColor = TOPIC_COLORS[q.topic] || TOPIC_COLORS.general;

          return (
            <div
              key={q.id}
              className="glass-card animate-fade-in-up manage-question-card"
              style={{
                overflow: 'hidden',
                animationDelay: `${index * 0.04}s`,
                borderLeft: `3px solid ${topicColor}`,
              }}
            >
              {/* Question Row */}
              <div
                className="manage-question-row"
                onClick={() => {
                  if (!isEditing) setExpandedId(isExpanded ? null : q.id);
                }}
                style={{ cursor: isEditing ? 'default' : 'pointer' }}
              >
                {/* Reorder buttons */}
                <div className="manage-reorder-controls" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="manage-icon-btn"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {q.order}
                  </span>
                  <button
                    className="manage-icon-btn"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === questions.length - 1}
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                {/* Question text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span className="manage-topic-badge" style={{ background: `${topicColor}22`, color: topicColor, borderColor: `${topicColor}44` }}>
                      {q.topic.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{q.id}</span>
                  </div>
                  <p style={{
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: isExpanded ? 'normal' : 'nowrap',
                  }}>
                    {q.question.en}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="manage-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="manage-icon-btn manage-icon-btn-edit"
                    onClick={() => startEditing(q)}
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="manage-icon-btn manage-icon-btn-danger"
                    onClick={() => setDeleteConfirmId(q.id)}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === q.id && (
                <div className="manage-delete-confirm animate-fade-in-up">
                  <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                  <span>Delete this question? This cannot be undone.</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button className="manage-btn manage-btn-ghost" onClick={() => setDeleteConfirmId(null)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                      Cancel
                    </button>
                    <button
                      className="manage-btn manage-btn-danger"
                      onClick={() => handleDelete(q.id)}
                      disabled={saving}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      {saving ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded Detail / Edit Form */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--glass-border)' }}>
                  {isEditing ? (
                    renderForm(editForm, setEditForm, handleUpdate, cancelEditing, 'Save Changes')
                  ) : (
                    <div className="manage-details" style={{ padding: '1.25rem 1.5rem' }}>
                      {/* Multi-language questions */}
                      {(q.question.hi || q.question.de) && (
                        <div className="manage-detail-section">
                          <h4 className="manage-detail-title">Translations</h4>
                          {q.question.hi && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                              <span className="manage-lang-badge">HI</span> {q.question.hi}
                            </p>
                          )}
                          {q.question.de && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                              <span className="manage-lang-badge">DE</span> {q.question.de}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Key Points */}
                      <div className="manage-detail-section">
                        <h4 className="manage-detail-title">Key Points ({q.key_points.length})</h4>
                        <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                          {q.key_points.map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Ideal Answer */}
                      <div className="manage-detail-section">
                        <h4 className="manage-detail-title">Ideal Answer Summary</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                          {q.ideal_answer_summary}
                        </p>
                      </div>

                      {/* Follow-up Probe */}
                      <div className="manage-detail-section">
                        <h4 className="manage-detail-title">Follow-Up Probe</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                          {q.follow_up_probe.en}
                        </p>
                      </div>

                      {/* Coaching Note */}
                      <div className="manage-detail-section">
                        <h4 className="manage-detail-title">Coaching Note</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-accent)', fontStyle: 'italic' }}>
                          {q.coaching_note}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {!loading && questions.length === 0 && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <BookOpen size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>No questions yet.</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Click "Add Question" to create your first interview question.
            </p>
          </div>
        )}

        {/* Back button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2rem', paddingTop: '1rem' }}>
          <button
            className="manage-btn manage-btn-ghost"
            onClick={() => navigate('/')}
            style={{ fontSize: '0.9rem' }}
          >
            ← Back to Interview
          </button>
        </div>
      </main>
    </div>
  );
}
