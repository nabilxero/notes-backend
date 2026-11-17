// Shared API shape for every document: `id` instead of `_id`, no `__v`,
// plus any extra fields listed in `hide` (e.g. passwordHash).
export function toJSONOptions(hide: string[] = []) {
  return {
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      for (const field of hide) delete ret[field];
      return ret;
    },
  };
}
