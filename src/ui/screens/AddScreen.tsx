import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { addDays, formatMinutes, relativeDayLabel } from '../../domain/dates';
import { buildPlan } from '../../domain/planner';
import { SIZE_MINUTES, type Size } from '../../domain/types';
import { useApp } from '../../state/store';
import { Button, Card, Screen, Text, TextField } from '../components/primitives';
import { DuePicker, SizePicker, SubjectPicker } from '../components/pickers';
import { PromptModal } from '../components/PromptModal';
import { space, useTheme, type Theme } from '../theme';

/**
 * Capture has to survive a noisy hallway and thirty seconds between classes, so
 * everything except the title is a single tap and nothing is required twice.
 */
export function AddScreen({ onSaved }: { onSaved: () => void }) {
  const { data, today, actions } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
          contentContainerStyle={[styles.content, { paddingHorizontal: theme.gutter }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {justSaved && !title ? (
            <Card style={{ borderColor: theme.color.success }}>
              <Text variant="heading" color={theme.color.success}>
                Added “{justSaved}”
              </Text>
              <Text variant="small" color={theme.color.textMuted} style={{ marginTop: space(1) }}>
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
              <Text variant="tiny" color={theme.color.textFaint} style={{ marginBottom: space(1) }}>
                HERE IS THE PLAN
              </Text>
              {preview.problem ? (
                <Text variant="small" color={theme.color.warning} style={styles.previewProblem}>
                  {preview.problem.message}
                </Text>
              ) : null}
              {preview.scheduled.length === 0 ? (
                <Text variant="small" color={theme.color.textMuted} style={{ lineHeight: 19 }}>
                  There is no room left before it is due. It will still be added, and shown as over
                  your limit.
                </Text>
              ) : (
                preview.scheduled.map((slot) => (
                  <View key={slot.date} style={styles.previewRow}>
                    <Text variant="body" color={theme.color.text}>
                      {relativeDayLabel(slot.date, today)}
                    </Text>
                    <Text variant="body" color={theme.color.textMuted} style={styles.tabular}>
                      {formatMinutes(slot.minutes)}
                    </Text>
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      paddingBottom: space(12),
      gap: space(5),
      width: '100%',
      maxWidth: theme.contentMaxWidth === Infinity ? undefined : theme.contentMaxWidth,
      alignSelf: 'center',
    },
    preview: { backgroundColor: theme.color.surfaceSunken, gap: space(1) },
    previewProblem: { marginBottom: space(2), lineHeight: 19 },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: space(1),
      gap: space(3),
    },
    tabular: { fontVariant: ['tabular-nums'] },
  });
