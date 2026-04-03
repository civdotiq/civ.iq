/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

function TestModal({
  isOpen,
  onClose,
  lockScroll = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  lockScroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap({ isActive: isOpen, onClose, containerRef: ref, lockScroll });

  if (!isOpen) return null;

  return (
    <div ref={ref} role="dialog" aria-modal="true" data-testid="modal">
      <button data-testid="first">First</button>
      <button data-testid="middle">Middle</button>
      <button data-testid="last">Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('closes on Escape key', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<TestModal isOpen={true} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab from last to first element', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<TestModal isOpen={true} onClose={onClose} lockScroll={false} />);

    const last = screen.getByTestId('last');
    last.focus();
    expect(document.activeElement).toBe(last);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId('first'));
  });

  it('wraps Shift+Tab from first to last element', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<TestModal isOpen={true} onClose={onClose} lockScroll={false} />);

    const first = screen.getByTestId('first');
    first.focus();
    expect(document.activeElement).toBe(first);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId('last'));
  });

  it('locks body scroll when active', () => {
    const onClose = jest.fn();
    const { unmount } = render(<TestModal isOpen={true} onClose={onClose} lockScroll={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('does not lock scroll when lockScroll is false', () => {
    const onClose = jest.fn();
    render(<TestModal isOpen={true} onClose={onClose} lockScroll={false} />);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
