import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { addDays, formatMinutes, relativeDayLabel } from '../../domain/dates';
import { buildPlan } from '../../domain/planner';
import { SIZE_MINUTES, type Size } from '../../domain/types';
import { useApp } from '../../state/store';
import { Button, Card, Screen, TextField } from '../components/primitives';
import { DuePicker, SizePicker, SubjectPicker } from '../components/pickers';
import { PromptModal } from '../components/PromptModal';
import { color, font, radius, space } from '../theme';

/**
 * Capture has to survive a noisy hallway and thirty seconds between classes, so
 * everything except the title is a single tap and nothing is required twice.
 */
export function AddScreen({ onSaved }: { onSaved: () => void }) {
  const { data, today, actions } = useApp();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const [dueDate, setDueDate] = useState(() => addDays(today, 1));
  const [size, setSize] = useState<Size>('medium');
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [addingSubject, setAddingSubject] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // A class added from the picker should be the one selected; otherwise the
  // student has to hunt for it right after creating it.
  const subjectCount = useRef(data.subjects.length);
  useEffect(() => {
    if (data.subjects.length > subjectCount.current) {
      setSubjectId(data.subjects[data.subjects.length - 1].id);
    }
    subjectCount.current = data.subjects.length;
  }, [data.subjects]);

  const validSubjectId = data.subjects.some((s) => s.id === subjectId)
    ? subjectId
    : data.subjects[0]?.id ?? '';

  // Show what adding this would do to the week before it is committed, so the
  // plan is never a surprise.
  const preview = useMemo(() => {
    if (!title.trim()) return null;
    const draft = {
      id: '__draft__',
      subjectId: validSubjectId,
      title: title.trim(),
      notes: '',
      dueDate,
      estimateMinutes: SIZE_MINUTES[size],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const plan = buildPlan({
      assignments: [...data.assignments, draft],
      logs: data.logs,
      settings: data.settings,
      today,
    });
    const scheduled = plan.days
      .filter((d) => d.blocks.some((b) => b.assignmentId === draft.id))
      .map((d) => ({
        date: d.date,
        minutes: d.blocks.find((b) => b.assignmentId === draft.id)!.minutes,
      }));
    const problem = plan.warnings.find((w) => w.assignmentId === draft.id);
    return { scheduled, problem };
  }, [title, validSubjectId, dueDate, size, data.assignments, data.logs, data.settings, today]);

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!validSubjectId) {
      Alert.alert('Add a class first', 'Every assignment belongs to a class. Add one in Settings.');
      return;
    }
    actions.addAssignment({
      subjectId: validSubjectId,
      title: trimmed,
      notes,
      dueDate,
      estimateMinutes: SIZE_MINUTES[size],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    setJustSaved(trimmed);
    setTitle('');
    setNotes('');
    setSize('medium');
    setDueDate(addDays(today, 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <Screen title="Add homework" subtitle="Write it down now, plan it later" scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {justSaved && !title ? (
            <Card style={styles.saved}>
              <Text style={styles.savedTitle}>Added “{justSaved}”</Text>
              <Text style={styles.savedBody}>
                It is on your plan. Add the next one, or check the Today tab.
              </Text>
              <View style={{ marginTop: space(3) }}>
                <Button label="See my plan" kind="secondary" onPress={onSaved} />
              </View>
            </Card>
          ) : null}

          <TextField
            label="What do you have to do?"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Ch 4 problems 1–20"
            maxLength={120}
            returnKeyType="done"
          />

          <SubjectPicker
            subjects={data.subjects}
            value={validSubjectId}
            onChange={setSubjectId}
            onAdd={() => setAddingSubject(true)}
          />

          <DuePicker today={today} value={dueDate} onChange={setDueDate} />

          <SizePicker value={size} onChange={setSize} />

          {preview ? (
            <Card style={styles.preview}>
              <Text style={styles.previewLabel}>HERE IS THE PLAN</Text>
              {preview.problem ? (
                <Text style={styles.previewProblem}>{preview.problem.message}</Text>
              ) : null}
              {preview.scheduled.length === 0 ? (
                <Text style={styles.previewBody}>
                  There is no room left before it is due. It will still be added, and shown as over
                  your limit.
                </Text>
              ) : (
                preview.scheduled.map((slot) => (
                  <View key={slot.date} style={styles.previewRow}>
                    <Text style={styles.previewDay}>{relativeDayLabel(slot.date, today)}</Text>
                    <Text style={styles.previewMinutes}>{formatMinutes(slot.minutes)}</Text>
                  </View>
                ))
              )}
            </Card>
          ) : null}

          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything the teacher said that you'll forget by tonight"
            multiline
            maxLength={500}
          />

          <Button label="Add it" onPress={save} disabled={!title.trim()} />
        </ScrollView>
      </KeyboardAvoidingView>

      <PromptModal
        visible={addingSubject}
        title="New class"
        message="What is it called?"
        placeholder="e.g. Chemistry"
        onCancel={() => setAddingSubject(false)}
        onConfirm={(name) => {
          actions.addSubject(name);
          setAddingSubject(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(5), paddingBottom: space(12), gap: space(5) },

  saved: { borderColor: color.success },
  savedTitle: { ...font.heading, color: color.success },
  savedBody: { ...font.small, color: color.textMuted, marginTop: space(1) },

  preview: { backgroundColor: color.surfaceSunken, gap: space(1) },
  previewLabel: { ...font.tiny, color: color.textFaint, marginBottom: space(1) },
  previewBody: { ...font.small, color: color.textMuted, lineHeight: 19 },
  previewProblem: { ...font.small, color: color.warning, marginBottom: space(2), lineHeight: 19 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space(1),
  },
  previewDay: { ...font.body, color: color.text },
  previewMinutes: { ...font.body, color: color.textMuted, fontVariant: ['tabular-nums'] },
});
