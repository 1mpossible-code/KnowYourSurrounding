'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  AVOID_TOPIC_OPTIONS,
  buildProfilePatchFromOnboarding,
  COUNTRY_OPTIONS,
  createInitialOnboardingForm,
  getAvoidSelectionLabels,
  getHelpSelectionLabels,
  HELP_OPTIONS,
  LANGUAGE_LEVEL_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  LOCAL_USER_ID_KEY,
  OnboardingFormData,
  TOPIC_OPTIONS,
  getSelectedLabels,
} from '@/lib/onboarding';
import { emptyProfileResponse } from '@/lib/profile-api';
import { createBrowserUuid } from '@/lib/browser-uuid';
import { buildStarterModulePayload, selectStarterGuides, writeStoredStarterGuideJobs } from '@/lib/starter-modules';

const STEPS = [
  {
    eyebrow: 'Welcome',
    title: 'Set up your cultural orientation profile',
    description: 'A few short steps will shape guidance around your real context and the way you like to learn.',
  },
  {
    eyebrow: 'Your route',
    title: 'Where are you coming from, and where are you adapting to?',
    description: "We'll use this to frame examples, tone, and expectations in a way that feels grounded.",
  },
  {
    eyebrow: 'Language comfort',
    title: 'How comfortable do you feel with the local language?',
    description: "Choose the level that feels most honest today — this can always be refined later.",
  },
  {
    eyebrow: 'Priority topics',
    title: 'What matters most to you right now?',
    description: 'Everything starts selected so you can narrow only if you want a tighter focus.',
  },
  {
    eyebrow: 'Learning style',
    title: 'How would you like guidance to feel?',
    description: "Pick the format that's easiest to absorb when life gets busy or unfamiliar.",
  },
  {
    eyebrow: 'Support areas',
    title: 'What would you like help with in daily life?',
    description: 'These guide which kinds of modules and explanations appear first.',
  },
  {
    eyebrow: 'Boundaries',
    title: 'Are there topics you would rather avoid?',
    description: 'Leave everything unselected if nothing feels sensitive right now.',
  },
  {
    eyebrow: 'Review',
    title: 'Check your profile before we save it',
    description: 'This is your starting point — simple now, easy to expand later.',
  },
] as const;

function ProgressSidebar({ currentStep }: { currentStep: number }) {
  const total = STEPS.length;
  const current = STEPS[currentStep];
  const next = STEPS[currentStep + 1];
  const percent = ((currentStep + 1) / total) * 100;

  return (
    <aside className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--surface-card)] p-5 shadow-[6px_6px_0_var(--royal-gold)] xl:sticky xl:top-6">
      {/* Brand + step count */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-serif text-2xl font-medium text-[var(--regal-navy)]">Amparo</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Profile setup</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--lemon-chiffon)] px-3 py-1 text-sm font-semibold text-[var(--regal-navy)]">
          {currentStep + 1}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--lemon-chiffon)]"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${currentStep + 1} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-[var(--royal-gold)] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="mt-4 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < currentStep
                ? 'bg-[var(--sandy-brown)]'
                : i === currentStep
                  ? 'bg-[var(--regal-navy)]'
                  : 'bg-[var(--lemon-chiffon)]'
            }`}
          />
        ))}
      </div>

      {/* Current step info */}
      <div className="mt-5 rounded-2xl border border-[var(--border-faint)] bg-[var(--lemon-chiffon)] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Current</p>
        <p className="mt-2 font-serif text-lg font-medium leading-snug text-[var(--regal-navy)]">{current.eyebrow}</p>
        <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">{current.description}</p>
      </div>

      {/* Next step preview */}
      {next ? (
        <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Up next</p>
          <p className="mt-2 font-semibold text-[var(--regal-navy)]">{next.eyebrow}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{next.title}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-soft)] p-4 text-sm leading-6 text-[var(--text-muted)]">
          Final step. Once this looks right, we'll save your profile and start your first guide.
        </div>
      )}
    </aside>
  );
}

function StepHeader({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <div>
      <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--lemon-chiffon)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">
        {step.eyebrow}
      </span>
      <h1 className="mt-4 font-serif text-3xl font-medium leading-snug text-[var(--regal-navy)] md:text-4xl">
        {step.title}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--text-muted)] md:text-base md:leading-8">
        {step.description}
      </p>
    </div>
  );
}

function ChoiceCard({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[var(--sandy-brown)] active:scale-[0.98] ${
        selected
          ? 'border-[var(--regal-navy)] bg-[var(--royal-gold)] shadow-[3px_3px_0_var(--regal-navy)]'
          : 'border-[var(--border-soft)] bg-[var(--surface-card)] hover:border-[var(--regal-navy)] hover:bg-[var(--lemon-chiffon)]'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] transition-all ${
            selected
              ? 'border-[var(--regal-navy)] bg-[var(--regal-navy)] text-white'
              : 'border-[var(--border-soft)] bg-white'
          }`}
        >
          {selected ? '✓' : ''}
        </span>
        <span className="text-sm font-semibold text-[var(--regal-navy)] md:text-base">{label}</span>
      </span>
    </button>
  );
}

function SectionActions({ onSelectAll, onClearAll }: { onSelectAll: () => void; onClearAll: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSelectAll}
        className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)] hover:border-[var(--regal-navy)]"
      >
        Select all
      </button>
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)] hover:border-[var(--regal-navy)]"
      >
        Clear all
      </button>
    </div>
  );
}

type StepProps = {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

function NameStep({ form, setForm }: StepProps) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">
          What should we call you?
        </span>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="For example: Mila"
          className="mt-3 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-sunken)] px-5 py-3.5 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--sandy-brown)] focus:ring-2 focus:ring-[var(--sandy-brown)]/20 placeholder:text-[var(--text-muted)]"
        />
      </label>
      <p className="text-sm leading-7 text-[var(--text-muted)]">
        A first name is enough. We only use it to make the experience feel more personal.
      </p>
    </div>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2.5 block text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-sunken)] px-5 py-3.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--sandy-brown)] focus:ring-2 focus:ring-[var(--sandy-brown)]/20"
      >
        <option value="">Choose one</option>
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
    </label>
  );
}

function CountryStep({ form, setForm }: StepProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField
        label="Origin country"
        value={form.originCountry}
        onChange={(value) => setForm((current) => ({ ...current, originCountry: value }))}
      />
      <SelectField
        label="Destination country"
        value={form.destinationCountry}
        onChange={(value) => setForm((current) => ({ ...current, destinationCountry: value }))}
      />
    </div>
  );
}

function SingleChoiceStep({
  options,
  value,
  onSelect,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onSelect: (next: string) => void;
}) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          selected={value === option.value}
          label={option.label}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </div>
  );
}

function MultiChoiceStep({
  options,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="space-y-4">
      <SectionActions onSelectAll={onSelectAll} onClearAll={onClearAll} />
      <div className="grid gap-2.5 md:grid-cols-2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            selected={selected.includes(option.value)}
            label={option.label}
            onClick={() => onToggle(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryStep({ form }: { form: OnboardingFormData }) {
  const rows = [
    ['Name', form.name],
    ['Route', `${form.originCountry} → ${form.destinationCountry}`],
    ['Language level', form.languageLevel || 'Not selected'],
    ['Learning style', form.preferredLearningStyle || 'Not selected'],
    ['Priority topics', getSelectedLabels(form.priorityTopics).join(', ')],
    ['Help with', getHelpSelectionLabels(form.wantsHelpWith).join(', ')],
    ['Topics to avoid', form.avoidTopics.length > 0 ? getAvoidSelectionLabels(form.avoidTopics).join(', ') : 'None selected'],
  ];

  return (
    <div className="space-y-2.5">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[var(--border-faint)] bg-[var(--surface-sunken)] px-4 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">{label}</p>
          <p className="mt-1.5 text-sm leading-6 text-[var(--foreground)] md:text-base">{value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

function isStepValid(step: number, form: OnboardingFormData) {
  if (step === 0) return form.name.trim().length > 0;
  if (step === 1) return Boolean(form.originCountry && form.destinationCountry && form.originCountry !== form.destinationCountry);
  if (step === 2) return Boolean(form.languageLevel);
  if (step === 3) return form.priorityTopics.length > 0;
  if (step === 4) return Boolean(form.preferredLearningStyle);
  if (step === 5) return form.wantsHelpWith.length > 0;
  return true;
}

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function renderStep(step: number, form: OnboardingFormData, setForm: StepProps['setForm']) {
  if (step === 0) return <NameStep form={form} setForm={setForm} />;
  if (step === 1) return <CountryStep form={form} setForm={setForm} />;
  if (step === 2) {
    return (
      <SingleChoiceStep
        options={LANGUAGE_LEVEL_OPTIONS}
        value={form.languageLevel}
        onSelect={(value) => setForm((current) => ({ ...current, languageLevel: value as OnboardingFormData['languageLevel'] }))}
      />
    );
  }
  if (step === 3) {
    return (
      <MultiChoiceStep
        options={TOPIC_OPTIONS}
        selected={form.priorityTopics}
        onToggle={(value) =>
          setForm((current) => ({
            ...current,
            priorityTopics: toggleArrayValue(current.priorityTopics, value) as OnboardingFormData['priorityTopics'],
          }))
        }
        onSelectAll={() =>
          setForm((current) => ({
            ...current,
            priorityTopics: TOPIC_OPTIONS.map((option) => option.value) as OnboardingFormData['priorityTopics'],
          }))
        }
        onClearAll={() => setForm((current) => ({ ...current, priorityTopics: [] }))}
      />
    );
  }
  if (step === 4) {
    return (
      <SingleChoiceStep
        options={LEARNING_STYLE_OPTIONS}
        value={form.preferredLearningStyle}
        onSelect={(value) =>
          setForm((current) => ({
            ...current,
            preferredLearningStyle: value as OnboardingFormData['preferredLearningStyle'],
          }))
        }
      />
    );
  }
  if (step === 5) {
    return (
      <MultiChoiceStep
        options={HELP_OPTIONS}
        selected={form.wantsHelpWith}
        onToggle={(value) =>
          setForm((current) => ({ ...current, wantsHelpWith: toggleArrayValue(current.wantsHelpWith, value) }))
        }
        onSelectAll={() =>
          setForm((current) => ({ ...current, wantsHelpWith: HELP_OPTIONS.map((option) => option.value) }))
        }
        onClearAll={() => setForm((current) => ({ ...current, wantsHelpWith: [] }))}
      />
    );
  }
  if (step === 6) {
    return (
      <MultiChoiceStep
        options={AVOID_TOPIC_OPTIONS}
        selected={form.avoidTopics}
        onToggle={(value) =>
          setForm((current) => ({ ...current, avoidTopics: toggleArrayValue(current.avoidTopics, value) }))
        }
        onSelectAll={() =>
          setForm((current) => ({ ...current, avoidTopics: AVOID_TOPIC_OPTIONS.map((option) => option.value) }))
        }
        onClearAll={() => setForm((current) => ({ ...current, avoidTopics: [] }))}
      />
    );
  }
  return <SummaryStep form={form} />;
}

export function OnboardingFlow() {
  const router = useRouter();
  const [form, setForm] = useState(createInitialOnboardingForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftUserId, setDraftUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!storedUserId) {
      Promise.resolve().then(() => setCheckingSession(false));
      return;
    }

    fetch(`/api/profile/${encodeURIComponent(storedUserId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load profile.');
        if (data.profile?.exists) {
          router.replace('/');
          return;
        }
        setDraftUserId(storedUserId);
        setCheckingSession(false);
      })
      .catch(() => {
        window.localStorage.removeItem(LOCAL_USER_ID_KEY);
        setCheckingSession(false);
      });
  }, [router]);

  const step = STEPS[currentStep];
  const canContinue = useMemo(() => isStepValid(currentStep, form), [currentStep, form]);

  function handleNext() {
    if (!canContinue || currentStep === STEPS.length - 1) return;
    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (currentStep === 0) return;
    setCurrentStep((s) => s - 1);
  }

  async function handleFinish() {
    if (!canContinue) return;
    setSubmitting(true);
    setError('');

    try {
      const userId = draftUserId || createBrowserUuid();
      const patch = buildProfilePatchFromOnboarding(form);
      const response = await fetch(`/api/profile/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save your profile.');

      const profile = {
        ...emptyProfileResponse(userId),
        ...data.profile,
        exists: true,
      };
      const starterGuides = selectStarterGuides(profile.wantsHelpWith).slice(0, 1);
      const storedJobs: Array<{ specId: string; jobId: string }> = [];

      for (const spec of starterGuides) {
        const starterResponse = await fetch('/api/modules/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildStarterModulePayload(profile, userId, spec)),
        });
        const starterData = await starterResponse.json();
        if (!starterResponse.ok) {
          throw new Error(starterData.error || `Failed to start ${spec.titleHint}.`);
        }
        if (starterData.jobId) {
          storedJobs.push({ specId: spec.id, jobId: starterData.jobId });
        }
      }

      writeStoredStarterGuideJobs(storedJobs);
      window.localStorage.setItem(LOCAL_USER_ID_KEY, userId);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your profile.');
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin-slow rounded-full border-2 border-[var(--regal-navy)] border-t-[var(--royal-gold)]" />
            <p className="mt-4 text-sm text-[var(--text-muted)]">Checking your session…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:px-6 md:py-10">
      <div className="mx-auto grid max-w-6xl gap-5 md:gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <ProgressSidebar currentStep={currentStep} />

        {/* Main step panel */}
        <section className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--surface-card)] p-5 shadow-[6px_6px_0_var(--sandy-brown)] md:rounded-[2rem] md:p-8 md:shadow-[8px_8px_0_var(--sandy-brown)] animate-fade-in">
          <StepHeader step={step} />
          <div className="mt-7">{renderStep(currentStep, form, setForm)}</div>

          {/* Error messages */}
          {error ? (
            <p className="mt-5 rounded-2xl border border-[var(--tomato)]/30 bg-[var(--tomato)]/8 px-4 py-3 text-sm text-[var(--tomato)]">
              {error}
            </p>
          ) : null}
          {currentStep === 1 && form.originCountry === form.destinationCountry && form.originCountry ? (
            <p className="mt-5 rounded-2xl border border-[var(--tomato)]/30 bg-[var(--tomato)]/8 px-4 py-3 text-sm text-[var(--tomato)]">
              Choose two different countries so the adaptation route is clear.
            </p>
          ) : null}

          {/* Navigation */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border-faint)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0 || submitting}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)] hover:border-[var(--regal-navy)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              ← Back
            </button>

            {currentStep === STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={submitting || !canContinue}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-6 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--sandy-brown)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
                    Creating your profile…
                  </>
                ) : (
                  'Save my profile →'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canContinue}
                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-6 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--sandy-brown)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
              >
                Continue →
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
