"use client";

import { useMemo, useState } from "react";

type LanguageLevel =
  | "none"
  | "basic"
  | "intermediate"
  | "advanced"
  | "fluent";

type Topic =
  | "greetings"
  | "public_behavior"
  | "communication"
  | "personal_space"
  | "time"
  | "work"
  | "school"
  | "gender"
  | "religion"
  | "dating"
  | "conflict"
  | "laws"
  | "money"
  | "food"
  | "clothing"
  | "digital"
  | "safety"
  | "healthcare"
  | "government"
  | "transit";

type DailyTask =
  | "using_public_transit"
  | "shopping_for_food"
  | "going_to_doctor"
  | "talking_to_landlord"
  | "opening_bank_account"
  | "using_libraries"
  | "finding_community_events"
  | "school_parent_interactions"
  | "job_interviews"
  | "calling_emergency_services"
  | "understanding_local_laws";

type LearningStyle =
  | "quick_rules"
  | "step_by_step"
  | "real_life_examples"
  | "scenario_practice"
  | "checklists";

type AvoidTopic =
  | "religion"
  | "politics"
  | "gender"
  | "dating"
  | "legal_status"
  | "trauma";

type ProfileRequest = {
  user_id: string;
  origin_country: string;
  destination_country: string;
  language_level: LanguageLevel | "";
  priority_topics: Topic[];
  preferred_learning_style: LearningStyle | "";
  wants_help_with: DailyTask[];
  avoid_topics: AvoidTopic[];
};

const TOTAL_STEPS = 10;

const countries = [
  "Ukraine",
  "United States",
  "Mexico",
  "India",
  "Nigeria",
  "Philippines",
  "Brazil",
  "Vietnam",
  "Canada",
  "Germany",
  "France",
  "Japan",
  "Kenya",
  "Turkey",
  "Colombia",
  "Poland",
];

const languageOptions: LanguageLevel[] = [
  "none",
  "basic",
  "intermediate",
  "advanced",
  "fluent",
];

const topicOptions: Topic[] = [
  "greetings",
  "public_behavior",
  "communication",
  "personal_space",
  "time",
  "work",
  "school",
  "gender",
  "religion",
  "dating",
  "conflict",
  "laws",
  "money",
  "food",
  "clothing",
  "digital",
  "safety",
  "healthcare",
  "government",
  "transit",
];

const dailyTaskOptions: DailyTask[] = [
  "using_public_transit",
  "shopping_for_food",
  "going_to_doctor",
  "talking_to_landlord",
  "opening_bank_account",
  "using_libraries",
  "finding_community_events",
  "school_parent_interactions",
  "job_interviews",
  "calling_emergency_services",
  "understanding_local_laws",
];

const learningStyleOptions: LearningStyle[] = [
  "quick_rules",
  "step_by_step",
  "real_life_examples",
  "scenario_practice",
  "checklists",
];

const avoidTopicOptions: AvoidTopic[] = [
  "religion",
  "politics",
  "gender",
  "dating",
  "legal_status",
  "trauma",
];

function mergeRequest(request: ProfileRequest, patch: Partial<ProfileRequest>) {
  return { ...request, ...patch };
}

function toggleItem<T extends string>(items: T[], value: T) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function joinLabels(values: string[]) {
  return values.length ? values.map(formatLabel).join(", ") : "None selected";
}

function generateDemoId() {
  return `demo_user_${Math.floor(100 + Math.random() * 900)}`;
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="mt-5 flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all ${index <= step ? "w-8 bg-[var(--regal-navy)]" : "w-6 bg-[var(--regal-navy)]/12"
            }`}
        />
      ))}
    </div>
  );
}

function ScreenShell({
  step,
  title,
  description,
  children,
  onBack,
  footer,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
  onBack?: () => void;
  footer: React.ReactNode;
}) {
  return (
    <section className="kyc-shell relative mx-auto flex min-h-[100svh] w-full max-w-[393px] flex-col overflow-hidden px-5 py-4 sm:my-6 sm:h-[852px] sm:min-h-0 sm:rounded-[34px] sm:border sm:border-[var(--regal-navy)]/8 sm:shadow-[0_40px_120px_rgba(13,59,102,0.18)]">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-[-15%] top-[15%] h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(244,211,94,0.42),_transparent_70%)]" />
        <div className="absolute bottom-[22%] right-[-18%] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(238,150,75,0.20),_transparent_72%)]" />
      </div>

      <div className="relative z-10 px-2 pt-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={!onBack}
            className="grid h-12 w-12 place-items-center rounded-full bg-[var(--regal-navy)]/6 text-2xl text-[var(--regal-navy)] transition hover:bg-[var(--regal-navy)]/12 disabled:opacity-0"
          >
            ←
          </button>
          <p className="font-sans text-base uppercase tracking-[0.18em] text-[var(--regal-navy)]/42">
            {step + 1} of {TOTAL_STEPS}
          </p>
        </div>
        <StepBar step={step} />
      </div>

      <div className="scrollbar-hidden relative z-10 flex-1 overflow-y-auto px-2 pb-[160px] pt-10">
        <p className="font-sans text-xs uppercase tracking-[0.34em] text-[var(--tomato)]">
          Let’s personalize your guide
        </p>
        <h1 className="mt-5 max-w-[11ch] font-serif text-[3.4rem] font-semibold leading-[0.92] tracking-[-0.05em] text-[var(--regal-navy)]">
          {title}
        </h1>
        <p className="mt-5 max-w-[28ch] text-[1.3rem] leading-8 text-[var(--regal-navy)]/62">
          {description}
        </p>
        <div className="mt-10">{children}</div>
      </div>

      <div className="relative z-20 mt-auto pointer-events-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">{footer}</div>
    </section>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerUp={onClick}
      disabled={disabled}
      className="flex h-[76px] w-full items-center justify-between rounded-[28px] bg-[linear-gradient(135deg,_#8b1207,_#9d1b0f_65%,_#b12a14)] px-7 text-left font-sans text-[1.8rem] font-semibold text-[#fff6ea] shadow-[0_20px_40px_rgba(130,22,12,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span>{children}</span>
      <span className="text-[2.4rem] leading-none">→</span>
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-[var(--regal-navy)]/14 px-4 py-2 font-sans text-sm uppercase tracking-[0.18em] text-[var(--regal-navy)]/56 transition hover:border-[var(--regal-navy)]/28 hover:text-[var(--regal-navy)]"
    >
      {children}
    </button>
  );
}

function SelectCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[24px] border px-5 py-4 text-left transition ${selected
          ? "border-[var(--regal-navy)] bg-[var(--regal-navy)] text-[var(--lemon-chiffon)] shadow-[0_18px_40px_rgba(13,59,102,0.18)]"
          : "border-[var(--regal-navy)]/10 bg-white/82 text-[var(--regal-navy)] hover:border-[var(--regal-navy)]/22 hover:bg-white"
        }`}
    >
      <span className="text-[1.2rem] capitalize">{formatLabel(label)}</span>
      <span className={`text-xl ${selected ? "text-[var(--royal-gold)]" : "text-[var(--regal-navy)]/20"}`}>
        {selected ? "✓" : "+"}
      </span>
    </button>
  );
}

function SearchableCountryList({
  value,
  search,
  onSearch,
  onSelect,
}: {
  value: string;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  const filtered = countries.filter((country) =>
    country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <label className="flex items-center gap-3 rounded-[24px] border border-[var(--regal-navy)]/12 bg-white/86 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <span className="text-2xl text-[var(--regal-navy)]/38">⌕</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search countries..."
          className="w-full bg-transparent text-[1.2rem] text-[var(--regal-navy)] outline-none placeholder:text-[var(--regal-navy)]/25"
        />
      </label>
      <div className="mt-4 space-y-3">
        {filtered.map((country) => (
          <SelectCard
            key={country}
            label={country}
            selected={value === country}
            onClick={() => onSelect(country)}
          />
        ))}
        {!filtered.length ? (
          <p className="rounded-[20px] bg-white/72 px-5 py-4 text-[var(--regal-navy)]/55">
            No country matched that search.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [request, setRequest] = useState<ProfileRequest>({
    user_id: generateDemoId(),
    origin_country: "",
    destination_country: "",
    language_level: "",
    priority_topics: [],
    preferred_learning_style: "",
    wants_help_with: [],
    avoid_topics: [],
  });

  const payload = useMemo(
    () => ({
      user_id: request.user_id,
      origin_country: request.origin_country,
      destination_country: request.destination_country,
      language_level: request.language_level,
      priority_topics: request.priority_topics,
      preferred_learning_style: request.preferred_learning_style,
      wants_help_with: request.wants_help_with,
      avoid_topics: request.avoid_topics,
    }),
    [request]
  );

  const next = () => setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  const canContinue =
    step === 0 ||
    (step === 1 && request.user_id.trim().length > 0) ||
    (step === 2 && request.origin_country.length > 0) ||
    (step === 3 && request.destination_country.length > 0) ||
    (step === 4 && request.language_level.length > 0) ||
    (step === 5 && request.priority_topics.length > 0) ||
    (step === 6 && request.wants_help_with.length > 0) ||
    (step === 7 && request.preferred_learning_style.length > 0) ||
    step === 8 ||
    step === 9;

  const footer = (
    <PrimaryButton onClick={next} disabled={!canContinue || step === TOTAL_STEPS - 1}>
      {step === 9 ? "Ready to create" : "Continue"}
    </PrimaryButton>
  );

  if (step === 0) {
    return (
      <ScreenShell
        step={step}
        title="Your guide to a new home."
        description="One tiny decision per screen. We’ll shape a cultural guide around where you’re from, where you’re headed, and how you like to learn."
        footer={<PrimaryButton onClick={next}>Get started</PrimaryButton>}
      >
        <div className="relative mx-auto mt-6 h-[320px] w-[320px]">
          <div className="absolute inset-0 rounded-full border border-[var(--regal-navy)]/10" />
          <div className="absolute inset-[34px] rounded-full border border-[var(--regal-navy)]/10" />
          <div className="absolute inset-[68px] rounded-full border border-[var(--regal-navy)]/10" />
          <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(244,211,94,0.8),_rgba(244,211,94,0.28)_55%,_transparent_70%)] ring-1 ring-[var(--regal-navy)]/8" />
          <div className="absolute left-1/2 top-[56px] h-[180px] w-[2px] -translate-x-1/2 bg-[var(--regal-navy)]/10" />
          <div className="absolute left-[56px] top-1/2 h-[2px] w-[208px] -translate-y-1/2 bg-[var(--regal-navy)]/10" />
          <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-[92px] border-x-[18px] border-b-[98px] border-x-transparent border-b-[var(--regal-navy)]" />
          <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 translate-y-[8px] border-x-[14px] border-t-[72px] border-x-transparent border-t-[var(--tomato)]/85" />
          <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--regal-navy)] shadow-[0_0_0_8px_rgba(250,240,202,0.9)]" />
        </div>
        <div className="mt-10 space-y-5 text-[var(--regal-navy)]">
          <p className="font-sans text-sm uppercase tracking-[0.28em] text-[var(--tomato)]">
            Know Your Surrounding
          </p>
          <p className="max-w-[15ch] font-serif text-[3rem] font-semibold leading-[0.95] tracking-[-0.05em]">
            Calm guidance before you land.
          </p>
          <p className="max-w-[24ch] text-lg leading-8 text-[var(--regal-navy)]/56">
            10 short steps · about 2 minutes · saved as a single profile request.
          </p>
        </div>
      </ScreenShell>
    );
  }

  if (step === 1) {
    return (
      <ScreenShell
        step={step}
        title="What should we call you?"
        description="A nickname is enough. We only need a demo-friendly user ID to attach your guide to."
        onBack={back}
        footer={footer}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-4 rounded-[28px] border border-[var(--regal-navy)]/10 bg-white/88 px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <input
              value={request.user_id}
              onChange={(event) =>
                setRequest(mergeRequest(request, { user_id: event.target.value }))
              }
              placeholder="demo_user_123"
              className="w-full bg-transparent font-sans text-[1.8rem] text-[var(--regal-navy)] outline-none placeholder:text-[var(--regal-navy)]/22"
            />
          </label>
          <div className="flex items-center justify-between rounded-[24px] bg-white/66 px-5 py-4 text-[var(--regal-navy)]/54">
            <p className="max-w-[18ch] text-base">No real name needed — this is a demo identity.</p>
            <GhostButton
              onClick={() =>
                setRequest(mergeRequest(request, { user_id: generateDemoId() }))
              }
            >
              Generate
            </GhostButton>
          </div>
        </div>
      </ScreenShell>
    );
  }

  if (step === 2) {
    return (
      <ScreenShell
        step={step}
        title="Where are you coming from?"
        description="Pick your origin country. This helps us frame comparisons and cultural context."
        onBack={back}
        footer={footer}
      >
        <SearchableCountryList
          value={request.origin_country}
          search={originSearch}
          onSearch={setOriginSearch}
          onSelect={(country) => setRequest(mergeRequest(request, { origin_country: country }))}
        />
      </ScreenShell>
    );
  }

  if (step === 3) {
    return (
      <ScreenShell
        step={step}
        title="Where are you headed?"
        description="Choose your destination country so the guide can focus on the customs you’ll meet there."
        onBack={back}
        footer={footer}
      >
        <SearchableCountryList
          value={request.destination_country}
          search={destinationSearch}
          onSearch={setDestinationSearch}
          onSelect={(country) =>
            setRequest(mergeRequest(request, { destination_country: country }))
          }
        />
      </ScreenShell>
    );
  }

  if (step === 4) {
    return (
      <ScreenShell
        step={step}
        title="How confident do you feel with the language?"
        description="Choose the level that feels true right now. We’ll tune the depth and wording to match."
        onBack={back}
        footer={footer}
      >
        <div className="space-y-3">
          {languageOptions.map((option) => (
            <SelectCard
              key={option}
              label={option}
              selected={request.language_level === option}
              onClick={() =>
                setRequest(mergeRequest(request, { language_level: option }))
              }
            />
          ))}
        </div>
      </ScreenShell>
    );
  }

  if (step === 5) {
    return (
      <ScreenShell
        step={step}
        title="What do you want help understanding?"
        description="Choose the topics you want the guide to prioritize first. Pick as many as you need."
        onBack={back}
        footer={footer}
      >
        <div className="space-y-3">
          {topicOptions.map((option) => (
            <SelectCard
              key={option}
              label={option}
              selected={request.priority_topics.includes(option)}
              onClick={() =>
                setRequest(
                  mergeRequest(request, {
                    priority_topics: toggleItem(request.priority_topics, option),
                  })
                )
              }
            />
          ))}
        </div>
      </ScreenShell>
    );
  }

  if (step === 6) {
    return (
      <ScreenShell
        step={step}
        title="What daily tasks do you need help with?"
        description="Select the real-life moments where a little guidance would lower friction right away."
        onBack={back}
        footer={footer}
      >
        <div className="space-y-3">
          {dailyTaskOptions.map((option) => (
            <SelectCard
              key={option}
              label={option}
              selected={request.wants_help_with.includes(option)}
              onClick={() =>
                setRequest(
                  mergeRequest(request, {
                    wants_help_with: toggleItem(request.wants_help_with, option),
                  })
                )
              }
            />
          ))}
        </div>
      </ScreenShell>
    );
  }

  if (step === 7) {
    return (
      <ScreenShell
        step={step}
        title="How should we teach you?"
        description="Pick one learning style. The guide will follow that rhythm from the first module onward."
        onBack={back}
        footer={footer}
      >
        <div className="space-y-3">
          {learningStyleOptions.map((option) => (
            <SelectCard
              key={option}
              label={option}
              selected={request.preferred_learning_style === option}
              onClick={() =>
                setRequest(
                  mergeRequest(request, { preferred_learning_style: option })
                )
              }
            />
          ))}
        </div>
      </ScreenShell>
    );
  }

  if (step === 8) {
    return (
      <ScreenShell
        step={step}
        title="Anything you don’t want us to bring up?"
        description="Optional. You can skip this, or mute topics you’d rather leave out of the guide."
        onBack={back}
        footer={footer}
      >
        <div className="space-y-3">
          {avoidTopicOptions.map((option) => (
            <SelectCard
              key={option}
              label={option}
              selected={request.avoid_topics.includes(option)}
              onClick={() =>
                setRequest(
                  mergeRequest(request, {
                    avoid_topics: toggleItem(request.avoid_topics, option),
                  })
                )
              }
            />
          ))}
        </div>
      </ScreenShell>
    );
  }

  if (step === 9) {
    return (
      <ScreenShell
        step={step}
        title="Review your guide request."
        description="Everything below will be handed to the backend as one profile payload when you create your guide."
        onBack={back}
        footer={
          <div className="space-y-3">
            <PrimaryButton disabled>Create my guide</PrimaryButton>
            <p className="text-center text-sm text-[var(--regal-navy)]/48">
              Submission wiring can plug into your API route next.
            </p>
          </div>
        }
      >
        <div className="space-y-4 pb-4">
          <div className="rounded-[28px] bg-white/82 p-5 shadow-[0_18px_40px_rgba(13,59,102,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.22em] text-[var(--tomato)]">
                  Profile summary
                </p>
                <p className="mt-2 max-w-[22ch] font-serif text-[2rem] leading-[1] tracking-[-0.04em] text-[var(--regal-navy)]">
                  Your guide will be tailored around this journey.
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--royal-gold)]/35 px-3 py-2 text-right text-[0.78rem] uppercase tracking-[0.2em] text-[var(--regal-navy)]/70">
                Ready
                <div className="mt-1 text-lg font-semibold normal-case text-[var(--regal-navy)]">10 / 10</div>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-[var(--regal-navy)]">
              <div className="col-span-2 rounded-[22px] bg-[var(--lemon-chiffon)]/85 p-4">
                <dt className="text-sm uppercase tracking-[0.15em] text-[var(--regal-navy)]/45">user_id</dt>
                <dd className="mt-1 text-xl">{request.user_id}</dd>
              </div>
              <div className="rounded-[22px] bg-[var(--lemon-chiffon)]/65 p-4">
                <dt className="text-sm uppercase tracking-[0.15em] text-[var(--regal-navy)]/45">From</dt>
                <dd className="mt-1 text-lg">{request.origin_country}</dd>
              </div>
              <div className="rounded-[22px] bg-[var(--lemon-chiffon)]/65 p-4">
                <dt className="text-sm uppercase tracking-[0.15em] text-[var(--regal-navy)]/45">To</dt>
                <dd className="mt-1 text-lg">{request.destination_country}</dd>
              </div>
              <div className="rounded-[22px] bg-[var(--lemon-chiffon)]/65 p-4">
                <dt className="text-sm uppercase tracking-[0.15em] text-[var(--regal-navy)]/45">Language</dt>
                <dd className="mt-1 text-lg capitalize">{request.language_level}</dd>
              </div>
              <div className="rounded-[22px] bg-[var(--lemon-chiffon)]/65 p-4">
                <dt className="text-sm uppercase tracking-[0.15em] text-[var(--regal-navy)]/45">Teaching style</dt>
                <dd className="mt-1 text-lg capitalize">{formatLabel(request.preferred_learning_style)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-[28px] border border-[var(--regal-navy)]/8 bg-white/70 p-5 shadow-[0_18px_40px_rgba(13,59,102,0.06)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--tomato)]">Priority topics</p>
              <p className="mt-3 text-lg leading-8 text-[var(--regal-navy)]/82">
                {joinLabels(request.priority_topics)}
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--regal-navy)]/8 bg-white/70 p-5 shadow-[0_18px_40px_rgba(13,59,102,0.06)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--tomato)]">Daily help requested</p>
              <p className="mt-3 text-lg leading-8 text-[var(--regal-navy)]/82">
                {joinLabels(request.wants_help_with)}
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--regal-navy)]/8 bg-white/70 p-5 shadow-[0_18px_40px_rgba(13,59,102,0.06)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--tomato)]">Topics to avoid</p>
              <p className="mt-3 text-lg leading-8 text-[var(--regal-navy)]/82">
                {joinLabels(request.avoid_topics)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-[var(--regal-navy)] px-5 py-4 text-[var(--lemon-chiffon)] shadow-[0_18px_40px_rgba(13,59,102,0.16)]">
            <p className="font-sans text-xs uppercase tracking-[0.22em] text-[var(--royal-gold)]">
              Backend payload
            </p>
            <pre className="scrollbar-hidden mt-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-7 text-[var(--lemon-chiffon)]/92">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      </ScreenShell>
    );
  }

  return null;
}
