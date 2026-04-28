import React from 'react';
import clsx from 'clsx';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/helpers';

export default function StatusBadge({ status }) {
  return (
    <span className={clsx('badge', STATUS_COLORS[status] || 'bg-gray-100 text-gray-700')}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
