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
import { buildStarterModulePayload, selectStarterGuides, writeStoredStarterGuideJobs } from '@/lib/starter-modules';

const STEPS = [
  {
    eyebrow: 'Welcome',
    title: 'Let’s set up your cultural orientation profile',
    description: 'A few short steps will help us shape guidance around your real context and the way you like to learn.',
  },
  {
    eyebrow: 'Your route',
    title: 'Tell us where you are coming from and where you are adapting to',
    description: 'We will use this to frame examples, tone, and everyday expectations in a way that feels grounded.',
  },
  {
    eyebrow: 'Language comfort',
    title: 'How comfortable do you feel with the local language?',
    description: 'Choose the level that feels most honest today. We can always refine this later.',
  },
  {
    eyebrow: 'Priority topics',
    title: 'What matters most to you right now?',
    description: 'Everything starts selected so you can narrow only if you want a tighter focus.',
  },
  {
    eyebrow: 'Learning style',
    title: 'How would you like guidance to feel?',
    description: 'Pick the format that feels easiest to absorb when life gets busy or unfamiliar.',
  },
  {
    eyebrow: 'Support areas',
    title: 'What would you like help with in daily life?',
    description: 'These areas guide what kinds of modules and explanations appear first.',
  },
  {
    eyebrow: 'Boundaries',
    title: 'Are there any topics you would rather avoid?',
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
    <aside className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--royal-gold)] md:rounded-[2rem] md:p-5 md:shadow-[10px_10px_0_var(--royal-gold)] xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)] md:text-sm">Profile setup</p>
          <p className="mt-2 text-2xl font-black leading-tight">Step {currentStep + 1}</p>
        </div>
        <div className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-3 py-1 text-sm font-bold">
          {currentStep + 1} / {total}
        </div>
      </div>

      <div
        className="mt-4 h-3 rounded-full bg-[var(--lemon-chiffon)]"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Onboarding step ${currentStep + 1} of ${total}`}
      >
        <div className="h-full rounded-full bg-[var(--royal-gold)] transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Current focus</p>
        <p className="mt-2 text-lg font-black leading-tight">{current.eyebrow}</p>
        <p className="mt-2 text-sm leading-6 opacity-80">{current.title}</p>
      </div>

      {next ? (
        <div className="mt-3 rounded-[1.5rem] border-2 border-dashed border-[var(--regal-navy)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Up next</p>
          <p className="mt-2 font-bold leading-6">{next.eyebrow}</p>
          <p className="mt-1 text-sm leading-6 opacity-75">{next.title}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-[1.5rem] border-2 border-dashed border-[var(--regal-navy)] bg-white p-4 text-sm leading-6 opacity-80">
          You’re at the final review. Once this looks right, we’ll save your profile and start your first guide.
        </div>
      )}
    </aside>
  );
}

function StepHeader({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <div>
      <div className="inline-flex rounded-full border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sandy-brown)] md:text-sm">
        {step.eyebrow}
      </div>
      <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">{step.title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 md:text-lg md:leading-8">{step.description}</p>
    </div>
  );
}

function ChoiceCard({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.5rem] border-2 px-4 py-4 text-left transition ${
        selected
          ? 'border-[var(--regal-navy)] bg-[var(--royal-gold)]'
          : 'border-[var(--regal-navy)] bg-white hover:bg-[var(--lemon-chiffon)]'
      }`}
    >
      <span className="text-sm font-bold leading-6 md:text-base">{label}</span>
    </button>
  );
}

function SectionActions({ onSelectAll, onClearAll }: { onSelectAll: () => void; onClearAll: () => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={onSelectAll} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 text-sm font-bold">
        Select all
      </button>
      <button type="button" onClick={onClearAll} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 text-sm font-bold">
        Clear all
      </button>
    </div>
  );
}

function NameStep({ form, setForm }: StepProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">What should we call you?</label>
      <input
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="For example: Mila"
        className="w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-5 py-4 text-lg outline-none focus:border-[var(--sandy-brown)]"
      />
      <p className="text-sm leading-7 opacity-80">A simple name is enough. We will only use it to make the experience feel more personal.</p>
    </div>
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

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-4 py-4 outline-none focus:border-[var(--sandy-brown)]"
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

function SingleChoiceStep({
  options,
  value,
  onSelect,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onSelect: (next: string) => void;
}) {
  return <div className="grid gap-3 md:grid-cols-2">{options.map((option) => <ChoiceCard key={option.value} selected={value === option.value} label={option.label} onClick={() => onSelect(option.value)} />)}</div>;
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
      <div className="grid gap-3 md:grid-cols-2">{options.map((option) => <ChoiceCard key={option.value} selected={selected.includes(option.value)} label={option.label} onClick={() => onToggle(option.value)} />)}</div>
    </div>
  );
}

type StepProps = {
  form: OnboardingFormData;
  setForm: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

function SummaryStep({ form }: { form: OnboardingFormData }) {
  const rows = [
    ['Name', form.name],
    ['Route', `${form.originCountry} → ${form.destinationCountry}`],
    ['Language level', form.languageLevel || 'Not selected'],
    ['Learning style', form.preferredLearningStyle || 'Not selected'],
    ['Priority topics', getSelectedLabels(form.priorityTopics).join(', ')],
    ['Help with', getHelpSelectionLabels(form.wantsHelpWith).join(', ')],
    ['Topics to steer clear of', form.avoidTopics.length > 0 ? getAvoidSelectionLabels(form.avoidTopics).join(', ') : 'None selected'],
  ];

  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{label}</div>
          <div className="mt-2 leading-7">{value}</div>
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
    return <SingleChoiceStep options={LANGUAGE_LEVEL_OPTIONS} value={form.languageLevel} onSelect={(value) => setForm((current) => ({ ...current, languageLevel: value as OnboardingFormData['languageLevel'] }))} />;
  }
  if (step === 3) {
    return (
      <MultiChoiceStep
        options={TOPIC_OPTIONS}
        selected={form.priorityTopics}
        onToggle={(value) => setForm((current) => ({ ...current, priorityTopics: toggleArrayValue(current.priorityTopics, value) as OnboardingFormData['priorityTopics'] }))}
        onSelectAll={() => setForm((current) => ({ ...current, priorityTopics: TOPIC_OPTIONS.map((option) => option.value) as OnboardingFormData['priorityTopics'] }))}
        onClearAll={() => setForm((current) => ({ ...current, priorityTopics: [] }))}
      />
    );
  }
  if (step === 4) {
    return <SingleChoiceStep options={LEARNING_STYLE_OPTIONS} value={form.preferredLearningStyle} onSelect={(value) => setForm((current) => ({ ...current, preferredLearningStyle: value as OnboardingFormData['preferredLearningStyle'] }))} />;
  }
  if (step === 5) {
    return (
      <MultiChoiceStep
        options={HELP_OPTIONS}
        selected={form.wantsHelpWith}
        onToggle={(value) => setForm((current) => ({ ...current, wantsHelpWith: toggleArrayValue(current.wantsHelpWith, value) }))}
        onSelectAll={() => setForm((current) => ({ ...current, wantsHelpWith: HELP_OPTIONS.map((option) => option.value) }))}
        onClearAll={() => setForm((current) => ({ ...current, wantsHelpWith: [] }))}
      />
    );
  }
  if (step === 6) {
    return (
      <MultiChoiceStep
        options={AVOID_TOPIC_OPTIONS}
        selected={form.avoidTopics}
        onToggle={(value) => setForm((current) => ({ ...current, avoidTopics: toggleArrayValue(current.avoidTopics, value) }))}
        onSelectAll={() => setForm((current) => ({ ...current, avoidTopics: AVOID_TOPIC_OPTIONS.map((option) => option.value) }))}
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

    fetch(`/api/profile/${encodeURIComponent(storedUserId)}`, { cache: 'no-store' })
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
    setCurrentStep((stepIndex) => stepIndex + 1);
  }

  function handleBack() {
    if (currentStep === 0) return;
    setCurrentStep((stepIndex) => stepIndex - 1);
  }

  async function handleFinish() {
    if (!canContinue) return;
    setSubmitting(true);
    setError('');

    try {
      const userId = draftUserId || window.crypto.randomUUID();
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save your profile.');
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-8 text-[var(--regal-navy)] md:px-6 md:py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <div className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white px-6 py-8 text-center shadow-[10px_10px_0_var(--royal-gold)] md:rounded-[2rem] md:px-8 md:py-10 md:shadow-[12px_12px_0_var(--royal-gold)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--sandy-brown)]">Checking session</p>
            <h1 className="mt-3 text-3xl font-black">Preparing your onboarding flow</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ProgressSidebar currentStep={currentStep} />

        <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:rounded-[2rem] md:p-8 md:shadow-[10px_10px_0_var(--sandy-brown)]">
          <StepHeader step={step} />
          <div className="mt-8">{renderStep(currentStep, form, setForm)}</div>

          {error ? <p className="mt-6 rounded-[1.5rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{error}</p> : null}
          {currentStep === 1 && form.originCountry === form.destinationCountry && form.originCountry ? (
            <p className="mt-6 rounded-[1.5rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">
              Choose two different countries so the adaptation route is clear.
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t-2 border-dashed border-[var(--regal-navy)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0 || submitting}
              className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-white px-5 py-3 font-bold transition hover:bg-[var(--lemon-chiffon)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Back
            </button>

            {currentStep === STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={submitting}
                className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold transition hover:bg-[var(--sandy-brown)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {submitting ? 'Creating your profile and first guides…' : 'Make my profile'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canContinue}
                className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold transition hover:bg-[var(--sandy-brown)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                Continue
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
