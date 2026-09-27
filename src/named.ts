/**
 * Resolving something the user typed by **name** out of a cached list.
 *
 * Nobody has a Linear project UUID to hand, and the CLI takes names for the
 * same reason the pane's pickers do. So every name to id decision in the
 * plugin funnels through here, and the rule is the same everywhere:
 *
 *   - an exact, case insensitive match wins outright;
 *   - exactly one substring match is taken, because a partial name nobody
 *     else shares is what a person means;
 *   - anything else is **refused with the candidates named**, never guessed.
 *
 * A write hangs on this answer, and a guess that picks the wrong project is a
 * write to the wrong place that Linear will happily accept.
 */

/** A name to match, plus what a user needs to see to choose between them. */
export interface Named {
  readonly id: string;
  readonly name: string;
}

export type NamedResolution<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

/**
 * `where` names the place the list came from, in the refusal: "No project
 * matching "bb" on Agents" is actionable, "no match" is not.
 */
export function resolveNamed<T extends Named>(
  rows: readonly T[],
  needle: string,
  where: string,
  subject: string,
): NamedResolution<T> {
  const wanted = needle.trim().toLowerCase();
  const matches = rows.filter((row) => row.name.toLowerCase().includes(wanted));
  const exact = matches.find((row) => row.name.toLowerCase() === wanted);
  if (exact !== undefined) return { ok: true, value: exact };
  if (matches.length === 1) return { ok: true, value: matches[0]! };
  if (matches.length === 0) {
    return { ok: false, message: `No ${subject} matching "${needle.trim()}" on ${where}.` };
  }
  return {
    ok: false,
    message: `"${needle.trim()}" matches ${String(matches.length)} ${subject}s on ${where}: ${matches
      .map((row) => row.name)
      .join(", ")}.`,
  };
}
