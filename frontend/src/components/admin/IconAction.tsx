import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

const CLASSES = (danger?: boolean) =>
  clsx(
    "flex h-11 w-11 items-center justify-center rounded-full text-ink-soft/60 transition-colors hover:bg-ink/5",
    danger ? "hover:text-red-600" : "hover:text-ink",
  );

interface IconActionProps {
  label: string;
  danger?: boolean;
  children: ReactNode;
}

/**
 * An icon-only action with a real 44px touch target and a label that says what
 * it acts on. Pass `href` to navigate (rendered as a real link — never a
 * `<button>` nested inside an `<a>`, which is invalid HTML and confuses
 * keyboard/screen-reader navigation) or `onClick` to run something in place.
 */
export function IconAction(
  props: IconActionProps & ({ href: string; onClick?: never } | { href?: never; onClick: () => void }),
) {
  const { label, danger, children } = props;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} aria-label={label} className={CLASSES(danger)}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} aria-label={label} className={CLASSES(danger)}>
      {children}
    </button>
  );
}
