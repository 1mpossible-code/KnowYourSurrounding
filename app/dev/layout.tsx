import { ExperimentalGate } from '@/app/_components/experimental-gate';

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <ExperimentalGate>{children}</ExperimentalGate>;
}
