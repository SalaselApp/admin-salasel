/**
 * A Material Icons Round glyph that automatically mirrors in RTL.
 *
 * Directional icons (back/forward arrows, breadcrumb chevrons, etc.)
 * point a fixed physical direction in the icon font, so in an RTL layout
 * a "back" arrow that points left is now pointing the wrong way. Tailwind's
 * `rtl:-scale-x-100` flips the glyph horizontally only when the document
 * direction is RTL, which the ancestor `<html dir>` provides.
 *
 * Use this only for icons whose meaning depends on direction. Symmetric
 * icons (search, add, delete, schedule, …) must NOT be flipped.
 */
export function DirectionalIcon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`material-icons-round rtl:-scale-x-100 ${className}`}>
      {children}
    </span>
  );
}
