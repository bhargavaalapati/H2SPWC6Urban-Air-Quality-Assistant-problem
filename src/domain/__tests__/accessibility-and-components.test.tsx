// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import { buildDeterministicPlan } from '@/domain/air-quality/recommendations';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { AqiOverviewCard } from '@/components/AqiOverviewCard';
import { DailyActionChecklist } from '@/components/DailyActionChecklist';
import { FamilyProfilePanel } from '@/components/FamilyProfilePanel';
import { PollutionEducation } from '@/components/PollutionEducation';
import { THEME_CONTRAST_PAIRS } from '@/lib/aqi-theme';

const SEVERE_DEMO = DEMO_SCENARIOS[0]!;

function hexToRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = hexToRelativeLuminance(fgHex);
  const l2 = hexToRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectZeroAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    rules: {
      // jsdom does not compute CSS background images/gradients for canvas contrast checks;
      // contrast ratios are verified mathematically in the dedicated WCAG 1.4.3 test below.
      'color-contrast': { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
}

afterEach(() => {
  cleanup();
});

describe('WCAG 2.2 AA Contrast & Component Accessibility', () => {
  it('meets WCAG 2.2 AA (>= 4.5:1) contrast ratios for all Light and Dark theme pairs', () => {
    for (const pair of THEME_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(ratio, `${pair.name} (${pair.fg} on ${pair.bg})`).toBeGreaterThanOrEqual(
        pair.minRatio
      );
    }
  });

  it('AqiOverviewCard renders non-color symbol, provenance badge, and passes axe-core', async () => {
    const plan = buildDeterministicPlan(SEVERE_DEMO.snapshot, DEFAULT_FAMILY_PROFILE);
    const { container } = render(
      <AqiOverviewCard
        snapshot={SEVERE_DEMO.snapshot}
        safety={plan.safety}
        dailyHeadline={plan.dailyHeadline}
        isLoading={false}
      />
    );

    expect(screen.getByText('268')).toBeTruthy();
    expect(screen.getByText('Very Unhealthy')).toBeTruthy();
    expect(screen.getByText('Demo Scenario (Simulated)')).toBeTruthy();
    expect(screen.getByText('⬢')).toBeTruthy();

    await expectZeroAxeViolations(container);
  });

  it('DailyActionChecklist toggles completion, opens impact calculation disclosure, and passes axe-core', async () => {
    const plan = buildDeterministicPlan(SEVERE_DEMO.snapshot, DEFAULT_FAMILY_PROFILE);
    const onToggle = vi.fn();
    const onReset = vi.fn();

    const { container } = render(
      <DailyActionChecklist
        actions={plan.actions}
        impactTotals={plan.impactTotals}
        completedIds={[]}
        onToggleComplete={onToggle}
        onResetProgress={onReset}
      />
    );

    const firstCheckbox = screen.getByRole('button', {
      name: new RegExp(`Mark "${plan.actions[0]!.title}" as completed`),
    });
    fireEvent.click(firstCheckbox);
    expect(onToggle).toHaveBeenCalledWith(plan.actions[0]!.id);

    const calcButtons = screen.getAllByRole('button', {
      name: /How impact was calculated/i,
    });
    expect(calcButtons.length).toBeGreaterThan(0);
    fireEvent.click(calcButtons[0]!);
    expect(screen.getAllByText(/Published factor|Assumption/i).length).toBeGreaterThan(0);

    await expectZeroAxeViolations(container);
  });

  it('FamilyProfilePanel switches between Household and Community modes and passes axe-core', async () => {
    const onChange = vi.fn();
    const onRequestAiPlan = vi.fn(async () => {});

    const { container } = render(
      <FamilyProfilePanel
        profile={DEFAULT_FAMILY_PROFILE}
        onChange={onChange}
        onRequestAiPlan={onRequestAiPlan}
        isAiLoading={false}
        isOffline={false}
        aiNote={null}
        planMode="deterministic"
      />
    );

    const communityTab = screen.getByRole('button', { name: /Community \/ School/i });
    fireEvent.click(communityTab);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ audienceMode: 'community' })
    );

    await expectZeroAxeViolations(container);
  });

  it('PollutionEducation expands topics with accessible aria-expanded and passes axe-core', async () => {
    const onTopicOpen = vi.fn();
    const { container } = render(<PollutionEducation onTopicOpen={onTopicOpen} />);

    const pmTopicBtn = screen.getByRole('button', { name: /PM2.5 vs. PM10/i });
    expect(pmTopicBtn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(pmTopicBtn);
    expect(pmTopicBtn.getAttribute('aria-expanded')).toBe('true');
    expect(onTopicOpen).toHaveBeenCalledWith('pm25-vs-pm10');

    await expectZeroAxeViolations(container);
  });
});