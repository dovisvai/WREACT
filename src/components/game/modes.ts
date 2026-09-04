import React from 'react';
import { AlertTriangle, Eye, RefreshCw, Target, Trophy, Zap } from 'lucide-react';
import { GameMode } from '../../types';

/** The playable disciplines, and how each one introduces itself. */
export interface ModeDefinition {
  id: GameMode;
  label: string;
  Icon: React.ElementType;
  title: string;
  brief: string;
}

export const MODES: ModeDefinition[] = [
  {
    id: 'CLASSIC',
    label: 'Classic',
    Icon: Zap,
    title: 'Classic reaction',
    brief: 'Wait for green, then tap as fast as you can.',
  },
  {
    id: 'FALSE_ALARM',
    label: 'Trap',
    Icon: AlertTriangle,
    title: 'Trap signal',
    brief: 'Tap on green only. Red is a decoy — tapping it ends the run.',
  },
  {
    id: 'PATTERN_SEQUENCE',
    label: 'Sequence',
    Icon: RefreshCw,
    title: 'Speed sequence',
    brief: 'Tap the four highlighted buttons in order, against the clock.',
  },
  {
    id: 'PRECISION_TARGET',
    label: 'Target',
    Icon: Target,
    title: 'Precision target',
    brief: 'A target appears somewhere on screen. Hit it.',
  },
  {
    id: 'REVERSE_COLOR',
    label: 'Stroop',
    Icon: Eye,
    title: 'Reverse Stroop',
    brief: 'Ignore the word. Tap the colour the word is printed in.',
  },
  {
    id: 'DAILY_CHALLENGE',
    label: 'Daily',
    Icon: Trophy,
    title: 'Daily event',
    brief: "Today's global event. One ranked attempt counts toward your streak.",
  },
];
