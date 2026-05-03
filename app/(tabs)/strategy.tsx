import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { colors, shadows, radius } from "@/constants/theme";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Creditor {
  _id: string;
  name: string;
  remaining: number;
}

interface PhasePayment {
  key: string;
  label: string;
  amount: number;
  color: string;
  badge?: "closed" | "savings" | "last-emi" | "house-fund";
}

interface PhaseTotalRow {
  key: string;
  label: string;
  color: string;
  total: number;
}

interface SavingsGoal {
  target: number;
  alreadySaved: number;
  achievedFromBudget: number;
  supplementNeeded: number;
}

interface Phase {
  id: number;
  title: string;
  subtitle: string;
  start: string;
  end: string;
  months: number;
  budget: number;
  payments: PhasePayment[];
  monthlyTotal: number;
  phaseTotal: number;
  phaseTotals: PhaseTotalRow[];
  momAfter: number;
  milestones: string[];
  isFinal?: boolean;
  savingsGoal?: SavingsGoal;
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const C = {
  bank:    "#f59e0b",
  mom:     "#3b82f6",
  anantha: "#ef4444",
  cc:      "#10b981",
  nive:    "#8b5cf6",
  house:   "#14b8a6",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMonthYear(key: string) {
  const [year, month] = key.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

function formatINRCompact(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000)       return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// ── Phase computation (ported from web) ────────────────────────────────────────

function computePhases(creditors: Creditor[]): Phase[] {
  const EMI      = 108_470;
  const LAST_EMI = 110_000;
  const MOM_BAL  = creditors.find(c => c.name === "Mom")?.remaining     ?? 7_000_000;
  const ANT_BAL  = creditors.find(c => c.name === "Anantha")?.remaining ?? 1_000_000;
  const ANT_MO   = Math.round(ANT_BAL / 10);

  const P2_MOM   = 100_000;
  const p3MomMo     = 100_000;
  const p3HouseFund = 350_000 - EMI - p3MomMo - ANT_MO;

  const momAfterP1 = MOM_BAL;
  const momAfterP2 = MOM_BAL - P2_MOM * 2;
  const momAfterP3 = momAfterP2 - p3MomMo * 8;

  const HOUSE_TARGET      = 3_000_000;
  const P4A_MONTHS        = 7;
  const P4A_MOM           = 100_000;
  const p4aHouseFund      = 350_000 - EMI - P4A_MOM;
  const p3HouseFundTotal  = p3HouseFund * 8;
  const houseFundTotal    = p4aHouseFund * P4A_MONTHS;
  const houseTotalBudget  = p3HouseFundTotal + houseFundTotal;
  const houseSupplement   = Math.max(0, HOUSE_TARGET - houseTotalBudget);
  const momAfterP4a     = momAfterP3 - P4A_MOM * P4A_MONTHS;
  const t4a = (EMI + P4A_MOM + p4aHouseFund) * P4A_MONTHS;

  const p5MomMo      = 350_000 - EMI;
  const p5FullMonths = Math.floor(momAfterP4a / p5MomMo);
  const momFinalP5   = momAfterP4a - p5FullMonths * p5MomMo;
  const t5 = 350_000 * p5FullMonths + (EMI + momFinalP5);

  const t1  = EMI + 100_000 + 100_000;
  const t2  = (EMI + P2_MOM + ANT_MO) * 2;
  const t3  = 350_000 * 8;
  const t6  = LAST_EMI;

  return [
    {
      id: 1, title: "Clear & Begin", subtitle: "Kick off EMI, clear CC and Nive",
      start: "2026-05", end: "2026-05", months: 1, budget: 300_000,
      payments: [
        { key: "emi",  label: "Bank EMI",    amount: EMI,     color: C.bank },
        { key: "cc",   label: "Credit Card", amount: 100_000, color: C.cc,   badge: "closed" },
        { key: "nive", label: "Nive",        amount: 100_000, color: C.nive, badge: "closed" },
      ],
      monthlyTotal: t1, phaseTotal: t1, momAfter: momAfterP1,
      phaseTotals: [],
      milestones: ["Credit Card cleared", "Nive cleared"],
    },
    {
      id: 2, title: "Breathing Space", subtitle: "Light months — EMI, Mom ₹1L & Anantha fund",
      start: "2026-06", end: "2026-07", months: 2, budget: 300_000,
      payments: [
        { key: "emi",     label: "Bank EMI", amount: EMI,    color: C.bank },
        { key: "mom",     label: "Mom",      amount: P2_MOM, color: C.mom },
        { key: "anantha", label: "Anantha",  amount: ANT_MO, color: C.anantha, badge: "savings" },
      ],
      monthlyTotal: EMI + P2_MOM + ANT_MO, phaseTotal: t2, momAfter: momAfterP2,
      phaseTotals: [
        { key: "emi",     label: "Bank EMI", color: C.bank,    total: EMI * 2 },
        { key: "mom",     label: "Mom",      color: C.mom,     total: P2_MOM * 2 },
        { key: "anantha", label: "Anantha",  color: C.anantha, total: ANT_MO * 2 },
      ],
      milestones: [],
    },
    {
      id: 3, title: "Full Speed", subtitle: "All three running — EMI, Mom and Anantha fund",
      start: "2026-08", end: "2027-03", months: 8, budget: 350_000,
      payments: [
        { key: "emi",     label: "Bank EMI",   amount: EMI,          color: C.bank },
        { key: "mom",     label: "Mom",        amount: p3MomMo,      color: C.mom },
        { key: "anantha", label: "Anantha",    amount: ANT_MO,       color: C.anantha, badge: "savings" },
        { key: "house",   label: "House Fund", amount: p3HouseFund,  color: C.house,   badge: "house-fund" },
      ],
      monthlyTotal: 350_000, phaseTotal: t3, momAfter: momAfterP3,
      phaseTotals: [
        { key: "emi",     label: "Bank EMI",   color: C.bank,    total: EMI * 8 },
        { key: "mom",     label: "Mom",        color: C.mom,     total: p3MomMo * 8 },
        { key: "anantha", label: "Anantha",    color: C.anantha, total: ANT_MO * 8 },
        { key: "house",   label: "House Fund", color: C.house,   total: p3HouseFundTotal },
      ],
      milestones: [
        "Mom payments increase · Aug 2026",
        `Anantha ${formatINRCompact(ANT_BAL)} fund complete · Mar 2027`,
      ],
    },
    {
      id: 4, title: "House Fund Sprint", subtitle: "Save for registration & interiors",
      start: "2027-04", end: "2027-10", months: P4A_MONTHS, budget: 350_000,
      payments: [
        { key: "emi",   label: "Bank EMI",   amount: EMI,          color: C.bank },
        { key: "mom",   label: "Mom",        amount: P4A_MOM,      color: C.mom },
        { key: "house", label: "House Fund", amount: p4aHouseFund, color: C.house, badge: "house-fund" },
      ],
      monthlyTotal: 350_000, phaseTotal: t4a, momAfter: momAfterP4a,
      phaseTotals: [
        { key: "emi",   label: "Bank EMI",   color: C.bank,  total: EMI * P4A_MONTHS },
        { key: "mom",   label: "Mom",        color: C.mom,   total: P4A_MOM * P4A_MONTHS },
        { key: "house", label: "House Fund", color: C.house, total: houseFundTotal },
      ],
      milestones: ["Registration & interiors fund · Oct 2027"],
      savingsGoal: {
        target: HOUSE_TARGET,
        alreadySaved: p3HouseFundTotal,
        achievedFromBudget: houseFundTotal,
        supplementNeeded: houseSupplement,
      },
    },
    {
      id: 5, title: "Heads Down", subtitle: "Full EMI + Mom — Mom closes Aug 2029",
      start: "2027-11", end: "2029-08", months: p5FullMonths + 1, budget: 350_000,
      payments: [
        { key: "emi", label: "Bank EMI", amount: EMI,     color: C.bank },
        { key: "mom", label: "Mom",      amount: p5MomMo, color: C.mom },
      ],
      monthlyTotal: 350_000, phaseTotal: t5, momAfter: 0,
      phaseTotals: [
        { key: "emi", label: "Bank EMI", color: C.bank, total: EMI * (p5FullMonths + 1) },
        { key: "mom", label: "Mom",      color: C.mom,  total: p5MomMo * p5FullMonths + momFinalP5 },
      ],
      milestones: [`Mom fully repaid · Aug 2029 (${formatINR(momFinalP5)} closing)`],
    },
    {
      id: 6, title: "Last EMI", subtitle: "Mom is done — one final bank payment",
      start: "2029-09", end: "2029-09", months: 1, budget: 350_000,
      payments: [
        { key: "emi", label: "Bank EMI", amount: LAST_EMI, color: C.bank, badge: "last-emi" },
      ],
      monthlyTotal: t6, phaseTotal: t6, momAfter: 0,
      phaseTotals: [],
      milestones: ["Last EMI paid", "DEBT FREE"],
      isFinal: true,
    },
  ];
}

// ── Phase accent colors ────────────────────────────────────────────────────────

const PHASE_ACCENTS = [
  { bg: "#fff7ed", border: "#fed7aa", num: "#c2410c", text: "#9a3412" },
  { bg: "#f8fafc", border: "#e2e8f0", num: "#475569", text: "#334155" },
  { bg: "#eff6ff", border: "#bfdbfe", num: "#1d4ed8", text: "#1e3a8a" },
  { bg: "#f0fdfa", border: "#99f6e4", num: "#0f766e", text: "#134e4a" },
  { bg: "#eef2ff", border: "#c7d2fe", num: "#4338ca", text: "#3730a3" },
  { bg: "#fefce8", border: "#fde68a", num: "#b45309", text: "#92400e" },
];

// ── Badge component ────────────────────────────────────────────────────────────

function BadgePill({ type }: { type: PhasePayment["badge"] }) {
  if (!type) return null;
  const map: Record<string, { bg: string; text: string; label: string }> = {
    closed:       { bg: "#d1fae5", text: "#065f46", label: "closed ✓" },
    savings:      { bg: "#fef3c7", text: "#92400e", label: "savings" },
    "last-emi":   { bg: "#fef3c7", text: "#92400e", label: "final EMI" },
    "house-fund": { bg: "#ccfbf1", text: "#134e4a", label: "house fund" },
  };
  const s = map[type];
  if (!s) return null;
  return (
    <View style={[badgeStyles.pill, { backgroundColor: s.bg }]}>
      <Text style={[badgeStyles.text, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: "600",
  },
});

// ── Phase card ─────────────────────────────────────────────────────────────────

function PhaseCard({ phase }: { phase: Phase }) {
  const ac = PHASE_ACCENTS[(phase.id - 1) % PHASE_ACCENTS.length];
  const dateLabel =
    phase.start === phase.end
      ? formatMonthYear(phase.start)
      : `${formatMonthYear(phase.start)} – ${formatMonthYear(phase.end)}`;

  return (
    <View style={[phaseStyles.card, { backgroundColor: ac.bg, borderColor: ac.border }]}>
      {/* Header */}
      <View style={phaseStyles.header}>
        <View style={[phaseStyles.numBadge, { backgroundColor: ac.border }]}>
          <Text style={[phaseStyles.numText, { color: ac.num }]}>
            {phase.isFinal ? "🏆" : phase.id}
          </Text>
        </View>
        <View style={phaseStyles.headerMid}>
          <Text style={[phaseStyles.title, { color: ac.text }]}>{phase.title}</Text>
          <Text style={phaseStyles.subtitle}>{phase.subtitle}</Text>
        </View>
        <View style={phaseStyles.dateBlock}>
          <Text style={phaseStyles.dateText}>{dateLabel}</Text>
          <Text style={phaseStyles.durationText}>
            {phase.months} mo{phase.months > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Milestones */}
      {phase.milestones.length > 0 && (
        <View style={phaseStyles.milestoneRow}>
          {phase.milestones.map((m) => (
            <View
              key={m}
              style={[
                phaseStyles.milestonePill,
                phase.isFinal ? { backgroundColor: "#fef08a" } : { backgroundColor: "#fff", borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={phaseStyles.milestoneText}>
                {phase.isFinal ? "🎉 " : "✓ "}{m}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Stacked bar */}
      <View style={phaseStyles.stackedBar}>
        {phase.payments.map((p) => (
          <View
            key={p.key}
            style={{
              flex: p.amount / phase.budget,
              height: 8,
              backgroundColor: p.color,
            }}
          />
        ))}
        {phase.monthlyTotal < phase.budget && (
          <View style={{ flex: (phase.budget - phase.monthlyTotal) / phase.budget, height: 8, backgroundColor: colors.border }} />
        )}
      </View>

      {/* Payment rows */}
      <View style={phaseStyles.paymentRows}>
        {phase.payments.map((p) => (
          <View key={p.key} style={phaseStyles.paymentRow}>
            {/* Mini bar */}
            <View style={phaseStyles.miniBarTrack}>
              <View
                style={[phaseStyles.miniBarFill, {
                  width: `${(p.amount / phase.budget) * 100}%` as `${number}%`,
                  backgroundColor: p.color,
                }]}
              />
            </View>
            {/* Label */}
            <View style={phaseStyles.paymentLabelGroup}>
              <View style={[phaseStyles.dot, { backgroundColor: p.color }]} />
              <Text style={phaseStyles.paymentLabel}>{p.label}</Text>
              <BadgePill type={p.badge} />
            </View>
            {/* Amount */}
            <Text style={phaseStyles.paymentAmount}>
              {formatINR(p.amount)}
              {phase.months > 1 && <Text style={phaseStyles.perMo}>/mo</Text>}
            </Text>
          </View>
        ))}
      </View>

      {/* House fund tracker (Phase 4) */}
      {phase.savingsGoal && (
        <View style={phaseStyles.savingsBox}>
          <Text style={phaseStyles.savingsTitle}>House Fund Goal — Oct 2027</Text>
          <View style={phaseStyles.savingsRows}>
            <View style={phaseStyles.savingsRow}>
              <Text style={phaseStyles.savingsRowLabel}>Target</Text>
              <Text style={phaseStyles.savingsRowValue}>{formatINR(phase.savingsGoal.target)}</Text>
            </View>
            {phase.savingsGoal.alreadySaved > 0 && (
              <View style={phaseStyles.savingsRow}>
                <Text style={phaseStyles.savingsRowLabel}>Saved in Full Speed</Text>
                <Text style={[phaseStyles.savingsRowValue, { color: C.house }]}>{formatINR(phase.savingsGoal.alreadySaved)}</Text>
              </View>
            )}
            <View style={phaseStyles.savingsRow}>
              <Text style={phaseStyles.savingsRowLabel}>Saved this phase</Text>
              <Text style={[phaseStyles.savingsRowValue, { color: C.house }]}>{formatINR(phase.savingsGoal.achievedFromBudget)}</Text>
            </View>
            <View style={[phaseStyles.savingsRow, phaseStyles.savingsTotalRow]}>
              <Text style={[phaseStyles.savingsRowLabel, { fontWeight: "700" }]}>Total from budget</Text>
              <Text style={[phaseStyles.savingsRowValue, { fontWeight: "800", color: "#0f766e" }]}>
                {formatINR(phase.savingsGoal.alreadySaved + phase.savingsGoal.achievedFromBudget)}
              </Text>
            </View>
            {phase.savingsGoal.supplementNeeded > 0 && (
              <View style={phaseStyles.savingsRow}>
                <Text style={phaseStyles.savingsRowLabel}>Supplement needed</Text>
                <Text style={[phaseStyles.savingsRowValue, { color: colors.warning }]}>{formatINR(phase.savingsGoal.supplementNeeded)}</Text>
              </View>
            )}
          </View>
          {/* Progress bar */}
          <View style={phaseStyles.savingsBarTrack}>
            <View
              style={[phaseStyles.savingsBarFill, {
                width: `${Math.min(100, Math.round(((phase.savingsGoal.alreadySaved + phase.savingsGoal.achievedFromBudget) / phase.savingsGoal.target) * 100))}%` as `${number}%`,
              }]}
            />
          </View>
          <Text style={phaseStyles.savingsPct}>
            {Math.round(((phase.savingsGoal.alreadySaved + phase.savingsGoal.achievedFromBudget) / phase.savingsGoal.target) * 100)}% covered from ₹3.5L/mo budget
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={phaseStyles.footer}>
        {/* Phase totals breakdown */}
        {phase.months > 1 && phase.phaseTotals.length > 0 && (
          <View style={phaseStyles.phaseTotals}>
            <Text style={phaseStyles.phaseTotalsLabel}>Phase total breakdown</Text>
            {phase.phaseTotals.map((t) => (
              <View key={t.key} style={phaseStyles.phaseTotalRow}>
                <View style={phaseStyles.phaseTotalLeft}>
                  <View style={[phaseStyles.dot, { backgroundColor: t.color }]} />
                  <Text style={phaseStyles.phaseTotalName}>{t.label}</Text>
                </View>
                <Text style={phaseStyles.phaseTotalAmt}>{formatINR(t.total)}</Text>
              </View>
            ))}
            <View style={[phaseStyles.phaseTotalRow, phaseStyles.phaseTotalSumRow]}>
              <Text style={phaseStyles.phaseTotalSumLabel}>Phase total</Text>
              <Text style={phaseStyles.phaseTotalSumValue}>{formatINRCompact(phase.phaseTotal)}</Text>
            </View>
          </View>
        )}

        {/* Summary line */}
        <View style={phaseStyles.summaryLine}>
          <View>
            <Text style={phaseStyles.summaryLineLabel}>
              {phase.months > 1 ? "Per month" : "This month"}
            </Text>
            <Text style={phaseStyles.summaryLineValue}>{formatINR(phase.monthlyTotal)}</Text>
          </View>
          {!phase.isFinal && phase.momAfter > 0 && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={phaseStyles.summaryLineLabel}>Mom remaining</Text>
              <Text style={phaseStyles.summaryLineValue}>{formatINRCompact(phase.momAfter)}</Text>
            </View>
          )}
          {phase.isFinal && (
            <Text style={phaseStyles.freeText}>₹0 — completely free! 🎉</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const phaseStyles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontSize: 14,
    fontWeight: "800",
  },
  headerMid: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBlock: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 2,
  },

  milestoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  milestonePill: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  stackedBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
    gap: 2,
  },

  paymentRows: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  miniBarTrack: {
    width: 80,
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  paymentLabelGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginRight: 6,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  paymentAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  perMo: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "400",
  },

  savingsBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#f0fdfa",
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  savingsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f766e",
    marginBottom: 10,
  },
  savingsRows: {
    gap: 6,
    marginBottom: 12,
  },
  savingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  savingsTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#99f6e4",
    paddingTop: 6,
    marginTop: 2,
  },
  savingsRowLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  savingsRowValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  savingsBarTrack: {
    height: 6,
    backgroundColor: "#ccfbf1",
    borderRadius: 3,
    overflow: "hidden",
  },
  savingsBarFill: {
    height: "100%",
    backgroundColor: "#14b8a6",
    borderRadius: 3,
  },
  savingsPct: {
    fontSize: 10,
    color: "#0d9488",
    marginTop: 4,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  phaseTotals: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 5,
  },
  phaseTotalsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  phaseTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phaseTotalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phaseTotalName: {
    fontSize: 12,
    color: colors.textMuted,
  },
  phaseTotalAmt: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phaseTotalSumRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 6,
    marginTop: 2,
  },
  phaseTotalSumLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  phaseTotalSumValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryLineLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  summaryLineValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 1,
  },
  freeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#b45309",
  },
});

// ── Summary stat cards ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    ...shadows.sm,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function StrategyScreen() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const creds = await apiFetch<Creditor[]>("/api/house-loan/creditors");
      setTotalDebt(creds.reduce((s, c) => s + c.remaining, 0));
      setPhases(computePhases(creds));
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  if (loading) {
    return (
      <View style={screenStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalMonths = phases.reduce((s, p) => s + p.months, 0);

  return (
    <ScrollView
      style={screenStyles.container}
      contentContainerStyle={screenStyles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <Text style={screenStyles.heading}>Repayment Strategy</Text>
      <Text style={screenStyles.headingSub}>
        6 phases · house fund by Oct 2027 · debt freedom Sep 2029
      </Text>

      {/* Stats row */}
      <View style={screenStyles.statsRow}>
        <StatCard label="Total Debt" value={formatINRCompact(totalDebt)} sub={formatINR(totalDebt)} />
        <View style={{ width: 10 }} />
        <StatCard label="Freedom Date" value="Sep 2029" sub={`${totalMonths} months`} />
      </View>
      <View style={[screenStyles.statsRow, { marginBottom: 20 }]}>
        <StatCard label="House Fund" value="₹30L" sub="By Oct 2027" />
        <View style={{ width: 10 }} />
        <StatCard label="Peak Budget" value="₹3,50,000" sub="From Phase 3" />
      </View>

      {/* Phase cards */}
      {phases.map((phase, i) => (
        <View key={phase.id}>
          <PhaseCard phase={phase} />
          {i < phases.length - 1 && (
            <View style={screenStyles.connector}>
              <View style={screenStyles.connectorLine} />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const screenStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  connector: {
    alignItems: "center",
    paddingVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
});
