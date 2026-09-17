import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatMinutes, relativeDayLabel } from '../../domain/dates';
import { SIZE_MINUTES, type Size } from '../../domain/types';
import { useApp } from '../../state/store';
import { color, font, radius, space } from '../theme';
import { Button, Label, ProgressBar, TextField } from './primitives';
import { DuePicker, SizePicker, SubjectPicker, sizeForMinutes } from './pickers';

export function AssignmentSheet({
  assignmentId,
  onClose,
}: {
  assignmentId: string | null;
  onClose: () => void;
}) {
  const { data, plan, today, actions } = useApp();
  const assignment = useMemo(
    () => data.assignments.find((a) => a.id === assignmentId) ?? null,
    [data.assignments, assignmentId],
  );

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState(today);
  const [size, setSize] = useState<Size>('medium');

  // Reload the draft whenever a different assignment is opened.
  useEffect(() => {
    if (!assignment) return;
    setTitle(assignment.title);
    setNotes(assignment.notes);
    setSubjectId(assignment.subjectId);
    setDueDate(assignment.dueDate);
    setSize(sizeForMinutes(assignment.estimateMinutes));
  }, [assignment?.id]);

  if (!assignment) return null;

  const remaining = plan.remainingByAssignment[assignment.id] ?? 0;
  const done = assignment.estimateMinutes - remaining;
  const isComplete = assignment.completedAt !== null;
  const dirty =
    title.trim() !== assignment.title ||
    notes.trim() !== assignment.notes ||
    subjectId !== assignment.subjectId ||
    dueDate !== assignment.dueDate ||
    SIZE_MINUTES[size] !== assignment.estimateMinutes;

  const save = () => {
    if (!title.trim()) return;
    actions.updateAssignment(assignment.id, {
      title: title.trim(),
      notes: notes.trim(),
      subjectId,
      dueDate,
      estimateMinutes: SIZE_MINUTES[size],
    });
    onClose();
  };

  const confirmDelete = () => {
    Alert.alert('Delete this assignment?', `"${assignment.title}" will be removed for good.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          actions.deleteAssignment(assignment.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.barAction}>Close</Text>
          </Pressable>
          <Text style={styles.barTitle}>Assignment</Text>
          <Pressable onPress={save} hitSlop={12} disabled={!dirty || !title.trim()}>
            <Text style={[styles.barAction, styles.barSave, (!dirty || !title.trim()) && styles.barDisabled]}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {isComplete
                ? 'Finished'
                : remaining === 0
                  ? 'Nothing left to do'
                  : `${formatMinutes(remaining)} left`}
            </Text>
            <Text style={styles.statusMeta}>
              Due {relativeDayLabel(assignment.dueDate, today).toLowerCase()} ·{' '}
              {formatMinutes(done)} of {formatMinutes(assignment.estimateMinutes)} done
            </Text>
            <View style={{ marginTop: space(3) }}>
              <ProgressBar
                value={assignment.estimateMinutes === 0 ? 0 : done / assignment.estimateMinutes}
                tint={isComplete ? color.success : color.accent}
              />
            </View>
          </View>

          <Button
            label={isComplete ? 'Reopen it' : 'Mark the whole thing finished'}
            kind={isComplete ? 'secondary' : 'primary'}
            onPress={() => actions.setAssignmentDone(assignment.id, !isComplete)}
          />

          <TextField label="What is it?" value={title} onChangeText={setTitle} maxLength={120} />

          <SubjectPicker subjects={data.subjects} value={subjectId} onChange={setSubjectId} />

          <DuePicker today={today} value={dueDate} onChange={setDueDate} />

          <SizePicker value={size} onChange={setSize} />

          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Page numbers, what the teacher said, anything you'll forget"
            multiline
            maxLength={500}
          />

          <View style={styles.danger}>
            <Label>Danger zone</Label>
            <Button label="Delete assignment" kind="danger" onPress={confirmDelete} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(5),
    paddingVertical: space(4),
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  barTitle: { ...font.heading, color: color.text },
  barAction: { ...font.body, color: color.textMuted },
  barSave: { color: color.accent, fontWeight: '700' },
  barDisabled: { opacity: 0.35 },

  content: { padding: space(5), gap: space(5), paddingBottom: space(12) },

  statusCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space(4),
  },
  statusTitle: { ...font.title, color: color.text },
  statusMeta: { ...font.small, color: color.textMuted, marginTop: space(1) },

  danger: { marginTop: space(4), gap: space(1) },
});
