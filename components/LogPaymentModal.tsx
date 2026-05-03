import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { colors, shadows, radius } from "@/constants/theme";

interface Creditor {
  _id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = [
  { key: "upi",          label: "UPI" },
  { key: "bank_transfer", label: "Bank Transfer" },
  { key: "cash",         label: "Cash" },
  { key: "cheque",       label: "Cheque" },
  { key: "neft",         label: "NEFT" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function LogPaymentModal({ visible, onClose, onSuccess }: Props) {
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loadingCreditors, setLoadingCreditors] = useState(false);

  const [selectedCreditorId, setSelectedCreditorId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("upi");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoadingCreditors(true);
    apiFetch<Creditor[]>("/api/house-loan/creditors")
      .then((data) => {
        const active = data.filter((c) => c.isActive);
        setCreditors(active);
        if (active.length > 0 && !selectedCreditorId) {
          setSelectedCreditorId(active[0]._id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCreditors(false));
  }, [visible]);

  function reset() {
    setSelectedCreditorId(null);
    setAmount("");
    setDate(todayISO());
    setMethod("upi");
    setNotes("");
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (!selectedCreditorId) {
      Alert.alert("Required", "Please select a creditor.");
      return;
    }
    if (!parsed || parsed <= 0) {
      Alert.alert("Required", "Please enter a valid amount.");
      return;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Invalid date", "Date must be in YYYY-MM-DD format.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/house-loan/payments", {
        method: "POST",
        body: {
          creditorId: selectedCreditorId,
          amount: parsed,
          date,
          method,
          notes: notes.trim() || undefined,
        },
      });
      reset();
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Log Payment</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Creditor */}
          <Text style={styles.label}>Creditor</Text>
          {loadingCreditors ? (
            <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />
          ) : (
            <View style={styles.creditorList}>
              {creditors.map((c) => {
                const selected = c._id === selectedCreditorId;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      styles.creditorOption,
                      selected && { borderColor: c.color, backgroundColor: c.color + "14" },
                    ]}
                    onPress={() => setSelectedCreditorId(c._id)}
                  >
                    <View style={[styles.creditorDot, { backgroundColor: c.color }]} />
                    <Text style={[styles.creditorName, selected && { color: c.color, fontWeight: "700" }]}>
                      {c.name}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={16} color={c.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Amount */}
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 100000"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textLight}
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />

          {/* Method */}
          <Text style={styles.label}>Method</Text>
          <View style={styles.methodRow}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.methodChip,
                  method === m.key && styles.methodChipActive,
                ]}
                onPress={() => setMethod(m.key)}
              >
                <Text
                  style={[
                    styles.methodChipText,
                    method === m.key && styles.methodChipTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="e.g. May instalment"
            placeholderTextColor={colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Record Payment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 8 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  optional: {
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: 0,
    color: colors.textLight,
  },

  creditorList: {
    gap: 8,
    marginBottom: 20,
  },
  creditorOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
  },
  creditorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  creditorName: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  notesInput: {
    height: 72,
    textAlignVertical: "top",
  },

  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  methodChipTextActive: {
    color: colors.primary,
  },

  footer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: colors.primaryLight,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
