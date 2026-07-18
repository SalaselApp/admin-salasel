import type { Dictionary } from "./dictionaries";
import type { Categories, Classes, ContentTypes, PresentationStyles } from "@/types";

/**
 * Look up the localized label for a numeric enum value. The dictionary
 * stores these keyed by the enum's stringified number ("0", "1", ...),
 * mirroring the public app's i18n JSON shape.
 */
export function contentTypeLabel(dict: Dictionary, v: ContentTypes): string {
  return dict.contentTypes[String(v) as keyof Dictionary["contentTypes"]];
}

export function presentationStyleLabel(
  dict: Dictionary,
  v: PresentationStyles,
): string {
  return dict.presentationStyles[
    String(v) as keyof Dictionary["presentationStyles"]
  ];
}

export function categoryLabel(dict: Dictionary, v: Categories): string {
  return dict.categoryLabels[String(v) as keyof Dictionary["categoryLabels"]];
}

export function classLabel(dict: Dictionary, v: Classes): string {
  return dict.classLabels[String(v) as keyof Dictionary["classLabels"]];
}
